"""
FastAPI Router for System Reports & CSV Export (Phase 6).
Generates structured reports with date filtering and CSV export for:
1. PC Health & Telemetry
2. PC Maintenance
3. Laboratory Complaints & AI Priorities
4. Laboratory Utilization (K-Means)
5. Inventory Assets
6. Lab Bookings & Reservations
"""

import os
import sys
import io
import csv
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.lab import Lab
from app.models.pc import PC, PCStatus
from app.models.pc_health import PCHealthLog
from app.models.inventory import InventoryItem
from app.models.complaint import Complaint
from app.models.maintenance import Maintenance
from app.models.booking import LabBooking
from app.models.lab_usage import LabUsage
from app.dependencies import get_current_user
from app.routers.pc_health import predict_health

# Ensure project root in sys.path for ml module
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.predict_kmeans import predict_utilization

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip()[:10], "%Y-%m-%d").date()
    except Exception:
        return None


# ── 1. PC Health Report ───────────────────────────────────────────────────────
@router.get("/pc-health")
def get_pc_health_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    lab_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Permission denied to view PC Health Reports.")

    pcs_query = db.query(PC).options(joinedload(PC.lab))
    if isinstance(lab_id, int):
        pcs_query = pcs_query.filter(PC.lab_id == lab_id)
    pcs = pcs_query.all()

    s_date = parse_date(start_date)
    e_date = parse_date(end_date)

    report_items = []
    for pc in pcs:
        log_query = db.query(PCHealthLog).filter(PCHealthLog.pc_id == pc.pc_code)
        if s_date:
            log_query = log_query.filter(func.date(PCHealthLog.recorded_at) >= s_date)
        if e_date:
            log_query = log_query.filter(func.date(PCHealthLog.recorded_at) <= e_date)

        latest_log = log_query.order_by(PCHealthLog.recorded_at.desc()).first()

        if latest_log:
            pred = predict_health(
                latest_log.cpu_usage,
                latest_log.ram_usage,
                latest_log.disk_usage,
                latest_log.error_count
            )
            health_status = pred.get("predicted_status", "Good")
            cpu = latest_log.cpu_usage
            ram = latest_log.ram_usage
            disk = latest_log.disk_usage
            errors = latest_log.error_count
            last_seen = latest_log.recorded_at.isoformat()
        else:
            health_status = "Good" if pc.status in [PCStatus.WORKING, PCStatus.AVAILABLE] else "Warning"
            cpu = 15.0
            ram = 30.0
            disk = 45.0
            errors = 0
            last_seen = pc.created_at.isoformat() if pc.created_at else None

        if status_filter and health_status.lower() != status_filter.lower():
            continue

        report_items.append({
            "pc_code": pc.pc_code,
            "computer_name": pc.computer_name,
            "lab_name": pc.lab.lab_name if pc.lab else "Unassigned",
            "operating_system": pc.operating_system,
            "pc_status": pc.status.value if hasattr(pc.status, 'value') else str(pc.status),
            "operating_status": pc.status.value if hasattr(pc.status, 'value') else str(pc.status),
            "health_status": health_status,
            "predicted_health": health_status,
            "cpu_usage": round(cpu, 1),
            "ram_usage": round(ram, 1),
            "disk_usage": round(disk, 1),
            "error_count": errors,
            "last_recorded": last_seen,
            "recorded_at": last_seen,
        })

    return {
        "report_type": "PC Health & Telemetry",
        "total": len(report_items),
        "generated_at": datetime.utcnow().isoformat(),
        "items": report_items,
    }


# ── 2. Maintenance Report ───────────────────────────────────────────────────
@router.get("/maintenance")
def get_maintenance_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    maintenance_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Permission denied to view Maintenance Reports.")

    query = db.query(Maintenance).options(
        joinedload(Maintenance.pc).joinedload(PC.lab),
        joinedload(Maintenance.technician),
        joinedload(Maintenance.complaint)
    )

    s_date = parse_date(start_date)
    e_date = parse_date(end_date)
    if s_date:
        query = query.filter(Maintenance.start_date >= s_date)
    if e_date:
        query = query.filter(Maintenance.start_date <= e_date)
    if status_filter:
        query = query.filter(Maintenance.status == status_filter.lower())
    if maintenance_type:
        query = query.filter(Maintenance.maintenance_type == maintenance_type)

    records = query.order_by(Maintenance.created_at.desc()).all()
    items = []
    for m in records:
        items.append({
            "id": m.id,
            "pc_code": m.pc.pc_code if m.pc else "—",
            "lab_name": m.pc.lab.lab_name if (m.pc and m.pc.lab) else "—",
            "issue_description": m.issue_description,
            "maintenance_type": m.maintenance_type,
            "status": m.status.value if hasattr(m.status, 'value') else str(m.status or 'pending'),
            "technician": m.technician.name if m.technician else "Unassigned",
            "cost": 0,
            "start_date": m.start_date.isoformat() if m.start_date else None,
            "completion_date": m.completion_date.isoformat() if m.completion_date else None,
            "end_date": m.completion_date.isoformat() if m.completion_date else None,
            "notes": m.notes or "",
            "linked_complaint": m.complaint.complaint_code if m.complaint else "—",
        })

    return {
        "report_type": "PC Maintenance & Repair Logs",
        "total": len(items),
        "generated_at": datetime.utcnow().isoformat(),
        "items": items,
    }


# ── 3. Complaints & AI Priority Report ───────────────────────────────────────
@router.get("/complaints")
def get_complaints_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    priority_filter: Optional[str] = Query(None),
    severity_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint).options(
        joinedload(Complaint.submitter),
        joinedload(Complaint.assignee),
        joinedload(Complaint.pc),
        joinedload(Complaint.lab)
    )

    if current_user.role in [UserRole.STUDENT, UserRole.FACULTY]:
        query = query.filter(Complaint.submitted_by == current_user.id)

    s_date = parse_date(start_date)
    e_date = parse_date(end_date)
    if s_date:
        query = query.filter(func.date(Complaint.created_at) >= s_date)
    if e_date:
        query = query.filter(func.date(Complaint.created_at) <= e_date)
    if status_filter:
        query = query.filter(Complaint.status == status_filter.lower())
    if priority_filter:
        query = query.filter(Complaint.priority == priority_filter.lower())
    if severity_filter:
        query = query.filter(Complaint.severity == severity_filter.lower())

    records = query.order_by(Complaint.created_at.desc()).all()
    items = []
    for c in records:
        items.append({
            "complaint_code": c.complaint_code,
            "submitter_name": c.submitter.name if c.submitter else "User",
            "submitted_by": c.submitter.name if c.submitter else "User",
            "submitter_email": c.submitter.email if c.submitter else "—",
            "pc_code": c.pc.pc_code if c.pc else "—",
            "lab_name": c.lab.lab_name if c.lab else (c.pc.lab.lab_name if c.pc and c.pc.lab else "General"),
            "complaint_type": c.complaint_type,
            "severity": c.severity.value if hasattr(c.severity, 'value') else str(c.severity or 'medium'),
            "ai_predicted_priority": c.ai_predicted_priority or "—",
            "final_priority": c.final_priority or (c.priority.value if hasattr(c.priority, 'value') else str(c.priority)),
            "ai_confidence": f"{c.ai_confidence * 100:.0f}%" if c.ai_confidence else "—",
            "status": c.status.value if hasattr(c.status, 'value') else str(c.status or 'open'),
            "assigned_to": c.assignee.name if c.assignee else "Unassigned",
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
            "resolved_at": c.resolved_at.strftime("%Y-%m-%d %H:%M") if c.resolved_at else "—",
            "description": c.description,
        })

    return {
        "report_type": "Laboratory Complaints & AI Priority",
        "total": len(items),
        "generated_at": datetime.utcnow().isoformat(),
        "items": items,
    }


# ── 4. Lab Utilization Report ───────────────────────────────────────────────
@router.get("/utilization")
def get_utilization_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    lab_id: Optional[int] = Query(None),
    level_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LabUsage).options(joinedload(LabUsage.lab))
    if isinstance(lab_id, int):
        query = query.filter(LabUsage.lab_id == lab_id)

    s_date = parse_date(start_date)
    e_date = parse_date(end_date)
    if s_date:
        query = query.filter(LabUsage.session_date >= s_date)
    if e_date:
        query = query.filter(LabUsage.session_date <= e_date)

    records = query.order_by(LabUsage.session_date.desc()).all()
    items = []
    for u in records:
        pred = predict_utilization(u.number_of_students, u.pcs_used, u.session_duration_minutes)
        level = pred.get("utilization_level", "Medium")

        if level_filter and level.lower() != level_filter.lower():
            continue

        items.append({
            "id": u.id,
            "session_date": u.session_date.isoformat() if u.session_date else "",
            "lab_name": u.lab.lab_name if u.lab else f"Lab #{u.lab_id}",
            "lab_code": u.lab.lab_code if u.lab else "—",
            "number_of_students": u.number_of_students,
            "pcs_used": u.pcs_used,
            "session_duration_minutes": u.session_duration_minutes,
            "utilization_level": level,
            "cluster_label": level,
            "cluster_id": pred.get("cluster_id", 1),
            "confidence": f"{pred.get('confidence', 0.9) * 100:.0f}%",
        })

    return {
        "report_type": "AI Lab Utilization (K-Means)",
        "total": len(items),
        "generated_at": datetime.utcnow().isoformat(),
        "items": items,
    }


# ── 5. Inventory Report ─────────────────────────────────────────────────────
@router.get("/inventory")
def get_inventory_report(
    category_filter: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    lab_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Permission denied to view Inventory Reports.")

    query = db.query(InventoryItem)
    if category_filter:
        query = query.filter(InventoryItem.category == category_filter)
    if status_filter:
        query = query.filter(InventoryItem.status == status_filter)

    records = query.order_by(InventoryItem.item_name.asc()).all()
    items = []
    for item in records:
        items.append({
            "id": item.id,
            "item_name": item.item_name,
            "category": item.category,
            "location": item.location or "Central Storage",
            "quantity": item.quantity,
            "condition": item.condition.value if hasattr(item.condition, 'value') else str(item.condition),
            "status": item.status.value if hasattr(item.status, 'value') else str(item.status),
            "purchase_date": item.purchase_date.isoformat() if item.purchase_date else "",
            "notes": item.notes or "",
            "updated_at": item.updated_at.strftime("%Y-%m-%d") if item.updated_at else "",
        })

    return {
        "report_type": "Hardware & Component Inventory",
        "total": len(items),
        "generated_at": datetime.utcnow().isoformat(),
        "items": items,
    }


# ── 6. Lab Bookings Report ──────────────────────────────────────────────────
@router.get("/bookings")
def get_bookings_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    lab_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LabBooking).options(joinedload(LabBooking.lab), joinedload(LabBooking.faculty))

    if current_user.role == UserRole.FACULTY:
        query = query.filter(LabBooking.faculty_id == current_user.id)
    elif current_user.role == UserRole.STUDENT:
        # Students only see approved or completed bookings for awareness
        query = query.filter(LabBooking.status.in_(["approved", "completed"]))

    if isinstance(lab_id, int):
        query = query.filter(LabBooking.lab_id == lab_id)

    s_date = parse_date(start_date)
    e_date = parse_date(end_date)
    if s_date:
        query = query.filter(LabBooking.booking_date >= s_date)
    if e_date:
        query = query.filter(LabBooking.booking_date <= e_date)
    if status_filter:
        query = query.filter(LabBooking.status == status_filter.lower())

    records = query.order_by(LabBooking.booking_date.desc(), LabBooking.start_time.desc()).all()
    items = []
    for b in records:
        items.append({
            "booking_code": b.booking_code,
            "lab_name": b.lab.lab_name if b.lab else "—",
            "lab_code": b.lab.lab_code if b.lab else "—",
            "faculty_name": b.faculty.name if b.faculty else "Faculty",
            "faculty_email": b.faculty.email if b.faculty else "—",
            "purpose": b.purpose,
            "booking_date": b.booking_date.isoformat() if b.booking_date else "",
            "start_time": b.start_time.strftime("%H:%M") if b.start_time else "",
            "end_time": b.end_time.strftime("%H:%M") if b.end_time else "",
            "students": b.number_of_students,
            "students_expected": b.number_of_students,
            "status": b.status.value if hasattr(b.status, 'value') else str(b.status or 'pending'),
            "created_at": b.created_at.strftime("%Y-%m-%d") if b.created_at else "",
        })

    return {
        "report_type": "Laboratory Bookings & Reservations",
        "total": len(items),
        "generated_at": datetime.utcnow().isoformat(),
        "items": items,
    }


# ── 7. Universal CSV Export Endpoint ─────────────────────────────────────────
@router.get("/export/{report_type}")
def export_report_csv(
    report_type: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports any report directly into a downloadable CSV file format.
    """
    valid_reports = {
        "pc-health": get_pc_health_report,
        "pc_health": get_pc_health_report,
        "maintenance": get_maintenance_report,
        "complaints": get_complaints_report,
        "utilization": get_utilization_report,
        "inventory": get_inventory_report,
        "bookings": get_bookings_report,
    }

    if report_type in ["pc-health", "pc_health"]:
        data = get_pc_health_report(start_date=start_date, end_date=end_date, status_filter=status_filter, lab_id=None, current_user=current_user, db=db)
    elif report_type == "maintenance":
        data = get_maintenance_report(start_date=start_date, end_date=end_date, status_filter=status_filter, maintenance_type=None, current_user=current_user, db=db)
    elif report_type == "complaints":
        data = get_complaints_report(start_date=start_date, end_date=end_date, status_filter=status_filter, priority_filter=None, severity_filter=None, current_user=current_user, db=db)
    elif report_type == "utilization":
        data = get_utilization_report(start_date=start_date, end_date=end_date, lab_id=None, level_filter=status_filter, current_user=current_user, db=db)
    elif report_type == "inventory":
        data = get_inventory_report(category_filter=None, status_filter=status_filter, current_user=current_user, db=db)
    elif report_type == "bookings":
        data = get_bookings_report(start_date=start_date, end_date=end_date, status_filter=status_filter, lab_id=None, current_user=current_user, db=db)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid report type: {report_type}")

    items = data.get("items", [])
    output = io.StringIO()

    if not items:
        writer = csv.writer(output)
        writer.writerow(["No records found matching specified filters"])
    else:
        writer = csv.DictWriter(output, fieldnames=list(items[0].keys()))
        writer.writeheader()
        writer.writerows(items)

    filename = f"{report_type}_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
