"""
FastAPI Router for Role-Specific Dashboards & Analytics (Phase 6).
Provides role-tailored datasets and Recharts chart structures for:
1. Admin Dashboard (All 10 KPIs + 6 Recharts Charts)
2. Faculty Dashboard (My Bookings, Upcoming Sessions, Availability, Complaints)
3. Lab Assistant Dashboard (PC Status, Critical/Warning PCs, High Priority Tickets, Maintenance, Today's Schedule)
4. Student Dashboard (My Complaints, Status Breakdown, Lab Info, Today's Sessions)
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.lab import Lab, LabStatus
from app.models.pc import PC, PCStatus
from app.models.pc_health import PCHealthLog
from app.models.inventory import InventoryItem
from app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from app.models.maintenance import Maintenance, MaintenanceStatus
from app.models.booking import LabBooking, BookingStatus
from app.models.lab_usage import LabUsage
from app.dependencies import get_current_user, require_admin
from app.routers.bookings import _auto_complete_past_bookings
from app.routers.pc_health import predict_health

router = APIRouter(prefix="/dashboard", tags=["Dashboards & Analytics"])


# ── 1. Admin Comprehensive Analytics & Recharts Datasets ─────────────────────
@router.get("/admin-analytics")
def get_admin_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _auto_complete_past_bookings(db)
    today = date.today()

    # 1. Facility & User KPIs
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_labs = db.query(func.count(Lab.id)).scalar() or 0
    total_pcs = db.query(func.count(PC.id)).scalar() or 0

    # 2. PC Status KPIs
    working_pcs = db.query(func.count(PC.id)).filter(
        PC.status.in_([PCStatus.WORKING, PCStatus.AVAILABLE])
    ).scalar() or 0

    maintenance_pcs = db.query(func.count(PC.id)).filter(
        PC.status == PCStatus.MAINTENANCE
    ).scalar() or 0

    not_working_pcs = db.query(func.count(PC.id)).filter(
        PC.status == PCStatus.NOT_WORKING
    ).scalar() or 0

    # Determine Critical PCs via latest PC health logs or NOT_WORKING status
    pcs = db.query(PC).all()
    critical_count = 0
    warning_count = 0
    good_count = 0

    for pc in pcs:
        latest_log = db.query(PCHealthLog).filter(
            PCHealthLog.pc_id == pc.pc_code
        ).order_by(PCHealthLog.recorded_at.desc()).first()

        if latest_log:
            pred = predict_health(
                latest_log.cpu_usage,
                latest_log.ram_usage,
                latest_log.disk_usage,
                latest_log.error_count
            )
            h = pred.get("predicted_status", "Good")
        else:
            h = "Critical" if pc.status == PCStatus.NOT_WORKING else ("Warning" if pc.status == PCStatus.MAINTENANCE else "Good")

        if h == "Critical":
            critical_count += 1
        elif h == "Warning":
            warning_count += 1
        else:
            good_count += 1

    # 3. Complaints KPIs
    open_complaints = db.query(func.count(Complaint.id)).filter(
        Complaint.status.in_([ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS])
    ).scalar() or 0

    high_priority_complaints = db.query(func.count(Complaint.id)).filter(
        Complaint.status.in_([ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]),
        Complaint.priority.in_([ComplaintPriority.HIGH, ComplaintPriority.URGENT])
    ).scalar() or 0

    # 4. Bookings & Utilization KPIs
    today_bookings = db.query(func.count(LabBooking.id)).filter(
        LabBooking.booking_date == today,
        LabBooking.status.in_([BookingStatus.APPROVED, BookingStatus.COMPLETED])
    ).scalar() or 0

    total_sessions = db.query(func.count(LabUsage.id)).scalar() or 0
    avg_duration = db.query(func.avg(LabUsage.session_duration_minutes)).scalar() or 0.0
    avg_students = db.query(func.avg(LabUsage.number_of_students)).scalar() or 0.0

    # ──────────────────────────────────────────────────────────────────────────
    # 6 Datasets for Recharts Visualizations
    # ──────────────────────────────────────────────────────────────────────────

    # Chart 1: PC Health Distribution (Donut / Pie)
    pc_health_distribution = [
        {"name": "Good", "value": good_count, "color": "#10b981"},
        {"name": "Warning", "value": warning_count, "color": "#f59e0b"},
        {"name": "Critical", "value": critical_count, "color": "#ef4444"},
    ]

    # Chart 2: Lab Utilization (Stacked Bar / Bar by Lab)
    labs_all = db.query(Lab).all()
    lab_utilization_chart = []
    for l in labs_all:
        usages = db.query(LabUsage).filter(LabUsage.lab_id == l.id).all()
        # Count roughly or estimate
        u_count = len(usages)
        avg_pcs = round(sum(u.pcs_used for u in usages) / max(1, u_count), 1) if u_count else 0
        lab_utilization_chart.append({
            "lab": l.lab_code,
            "sessions": u_count,
            "avg_pcs_used": avg_pcs,
            "capacity": l.capacity,
        })

    # Chart 3: Complaints by Priority (Bar / Pie)
    complaints_by_priority = [
        {"priority": "Low", "count": db.query(func.count(Complaint.id)).filter(Complaint.priority == ComplaintPriority.LOW).scalar() or 0, "color": "#10b981"},
        {"priority": "Medium", "count": db.query(func.count(Complaint.id)).filter(Complaint.priority == ComplaintPriority.MEDIUM).scalar() or 0, "color": "#f59e0b"},
        {"priority": "High", "count": db.query(func.count(Complaint.id)).filter(Complaint.priority == ComplaintPriority.HIGH).scalar() or 0, "color": "#f97316"},
        {"priority": "Urgent", "count": db.query(func.count(Complaint.id)).filter(Complaint.priority == ComplaintPriority.URGENT).scalar() or 0, "color": "#ef4444"},
    ]

    # Chart 4: Complaints by Status (Bar)
    complaints_by_status = [
        {"status": "Open", "count": db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.OPEN).scalar() or 0, "color": "#3b82f6"},
        {"status": "Assigned", "count": db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.ASSIGNED).scalar() or 0, "color": "#6366f1"},
        {"status": "In Progress", "count": db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.IN_PROGRESS).scalar() or 0, "color": "#f59e0b"},
        {"status": "Resolved", "count": db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.RESOLVED).scalar() or 0, "color": "#10b981"},
        {"status": "Closed", "count": db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.CLOSED).scalar() or 0, "color": "#64748b"},
    ]

    # Chart 5: Maintenance Status (Pie / Donut)
    maintenance_status = [
        {"status": "Pending", "count": db.query(func.count(Maintenance.id)).filter(Maintenance.status == MaintenanceStatus.PENDING).scalar() or 0, "color": "#f59e0b"},
        {"status": "In Progress", "count": db.query(func.count(Maintenance.id)).filter(Maintenance.status == MaintenanceStatus.IN_PROGRESS).scalar() or 0, "color": "#3b82f6"},
        {"status": "Completed", "count": db.query(func.count(Maintenance.id)).filter(Maintenance.status == MaintenanceStatus.COMPLETED).scalar() or 0, "color": "#10b981"},
    ]

    # Chart 6: PC Status (Bar)
    pc_status = [
        {"status": "Available", "count": db.query(func.count(PC.id)).filter(PC.status == PCStatus.AVAILABLE).scalar() or 0, "color": "#10b981"},
        {"status": "Working", "count": db.query(func.count(PC.id)).filter(PC.status == PCStatus.WORKING).scalar() or 0, "color": "#3b82f6"},
        {"status": "In Use", "count": db.query(func.count(PC.id)).filter(PC.status == PCStatus.IN_USE).scalar() or 0, "color": "#8b5cf6"},
        {"status": "Maintenance", "count": maintenance_pcs, "color": "#f59e0b"},
        {"status": "Not Working", "count": not_working_pcs, "color": "#ef4444"},
    ]

    return {
        "kpis": {
            "total_users": total_users,
            "total_labs": total_labs,
            "total_pcs": total_pcs,
            "working_pcs": working_pcs,
            "maintenance_pcs": maintenance_pcs,
            "critical_pcs": critical_count,
            "open_complaints": open_complaints,
            "high_priority_complaints": high_priority_complaints,
            "today_bookings": today_bookings,
            "lab_utilization": {
                "total_sessions": total_sessions,
                "avg_duration_minutes": round(avg_duration, 1),
                "avg_students": round(avg_students, 1),
            },
        },
        "charts": {
            "pc_health_distribution": pc_health_distribution,
            "lab_utilization": lab_utilization_chart,
            "complaints_by_priority": complaints_by_priority,
            "complaints_by_status": complaints_by_status,
            "maintenance_status": maintenance_status,
            "pc_status": pc_status,
        }
    }


# ── 2. Faculty Dashboard Stats ───────────────────────────────────────────────
@router.get("/faculty-stats")
def get_faculty_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Faculty access only.")

    _auto_complete_past_bookings(db)
    today = date.today()

    # My Bookings
    my_bookings_query = db.query(LabBooking).filter(LabBooking.faculty_id == current_user.id)
    total_my_bookings = my_bookings_query.count()

    # Upcoming sessions (approved, today or in future)
    upcoming = my_bookings_query.options(joinedload(LabBooking.lab)).filter(
        LabBooking.status == BookingStatus.APPROVED,
        LabBooking.booking_date >= today
    ).order_by(LabBooking.booking_date.asc(), LabBooking.start_time.asc()).limit(5).all()

    # Booking history (past or completed)
    history = my_bookings_query.options(joinedload(LabBooking.lab)).filter(
        (LabBooking.booking_date < today) | (LabBooking.status == BookingStatus.COMPLETED)
    ).order_by(LabBooking.booking_date.desc()).limit(5).all()

    # My complaints
    my_complaints = db.query(Complaint).filter(Complaint.submitted_by == current_user.id).order_by(Complaint.created_at.desc()).all()
    open_comp = sum(1 for c in my_complaints if c.status in [ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS])
    resolved_comp = sum(1 for c in my_complaints if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])

    # Lab availability
    labs = db.query(Lab).filter(Lab.status == LabStatus.ACTIVE).all()
    lab_avail = []
    for l in labs:
        # Check if booked today
        active_booking = db.query(LabBooking).filter(
            LabBooking.lab_id == l.id,
            LabBooking.booking_date == today,
            LabBooking.status == BookingStatus.APPROVED
        ).first()
        lab_avail.append({
            "id": l.id,
            "lab_name": l.lab_name,
            "lab_code": l.lab_code,
            "capacity": l.capacity,
            "location": l.location,
            "is_busy_today": active_booking is not None,
            "current_purpose": active_booking.purpose if active_booking else "Available for booking",
        })

    # Lab usage info
    faculty_lab_ids = [b.lab_id for b in my_bookings_query.all()]
    lab_usage_info = {
        "total_sessions_booked": total_my_bookings,
        "completed_sessions": my_bookings_query.filter(LabBooking.status == BookingStatus.COMPLETED).count(),
        "total_students_engaged": db.query(func.sum(LabBooking.number_of_students)).filter(
            LabBooking.faculty_id == current_user.id,
            LabBooking.status.in_([BookingStatus.APPROVED, BookingStatus.COMPLETED])
        ).scalar() or 0,
    }

    return {
        "my_bookings_count": total_my_bookings,
        "upcoming_sessions": [
            {
                "id": b.id,
                "booking_code": b.booking_code,
                "lab_name": b.lab.lab_name if b.lab else "—",
                "lab_code": b.lab.lab_code if b.lab else "—",
                "booking_date": b.booking_date.isoformat(),
                "start_time": b.start_time.strftime("%H:%M"),
                "end_time": b.end_time.strftime("%H:%M"),
                "students": b.number_of_students,
                "purpose": b.purpose,
            }
            for b in upcoming
        ],
        "booking_history": [
            {
                "id": b.id,
                "booking_code": b.booking_code,
                "lab_name": b.lab.lab_name if b.lab else "—",
                "booking_date": b.booking_date.isoformat(),
                "status": b.status.value if hasattr(b.status, 'value') else str(b.status),
                "purpose": b.purpose,
            }
            for b in history
        ],
        "complaints": {
            "total": len(my_complaints),
            "open": open_comp,
            "resolved": resolved_comp,
            "recent": [
                {
                    "id": c.id,
                    "code": c.complaint_code,
                    "category": c.complaint_type,
                    "severity": c.severity.value if hasattr(c.severity, 'value') else str(c.severity),
                    "priority": c.final_priority or (c.priority.value if hasattr(c.priority, 'value') else str(c.priority)),
                    "status": c.status.value if hasattr(c.status, 'value') else str(c.status),
                }
                for c in my_complaints[:5]
            ]
        },
        "lab_availability": lab_avail,
        "lab_usage_info": lab_usage_info,
    }


# ── 3. Lab Assistant Dashboard Stats ─────────────────────────────────────────
@router.get("/assistant-stats")
def get_assistant_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.LAB_ASSISTANT, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Lab Assistant access only.")

    _auto_complete_past_bookings(db)
    today = date.today()

    # 1. PC Status
    total_pcs = db.query(func.count(PC.id)).scalar() or 0
    available_pcs = db.query(func.count(PC.id)).filter(PC.status == PCStatus.AVAILABLE).scalar() or 0
    working_pcs = db.query(func.count(PC.id)).filter(PC.status == PCStatus.WORKING).scalar() or 0
    maintenance_pcs = db.query(func.count(PC.id)).filter(PC.status == PCStatus.MAINTENANCE).scalar() or 0
    not_working_pcs = db.query(func.count(PC.id)).filter(PC.status == PCStatus.NOT_WORKING).scalar() or 0

    # 2. Critical & Warning PCs
    pcs = db.query(PC).options(joinedload(PC.lab)).all()
    critical_pcs = []
    warning_pcs = []

    for pc in pcs:
        latest_log = db.query(PCHealthLog).filter(
            PCHealthLog.pc_id == pc.pc_code
        ).order_by(PCHealthLog.recorded_at.desc()).first()

        if latest_log:
            pred = predict_health(
                latest_log.cpu_usage,
                latest_log.ram_usage,
                latest_log.disk_usage,
                latest_log.error_count
            )
            h = pred.get("predicted_status", "Good")
            issues = pred.get("possible_issues", [])
        else:
            h = "Critical" if pc.status == PCStatus.NOT_WORKING else ("Warning" if pc.status == PCStatus.MAINTENANCE else "Good")
            issues = ["Hardware offline or in maintenance"] if h != "Good" else []

        pc_info = {
            "id": pc.id,
            "pc_code": pc.pc_code,
            "lab_name": pc.lab.lab_name if pc.lab else "—",
            "operating_status": pc.status.value if hasattr(pc.status, 'value') else str(pc.status),
            "health_status": h,
            "issues": issues,
        }

        if h == "Critical":
            critical_pcs.append(pc_info)
        elif h == "Warning":
            warning_pcs.append(pc_info)

    # 3. Open & High Priority Complaints
    open_complaints_count = db.query(func.count(Complaint.id)).filter(
        Complaint.status.in_([ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS])
    ).scalar() or 0

    high_prio_complaints = db.query(Complaint).options(
        joinedload(Complaint.pc), joinedload(Complaint.lab), joinedload(Complaint.submitter)
    ).filter(
        Complaint.status.in_([ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]),
        Complaint.priority.in_([ComplaintPriority.HIGH, ComplaintPriority.URGENT])
    ).order_by(Complaint.created_at.desc()).all()

    # 4. Pending Maintenance
    pending_maint = db.query(Maintenance).options(
        joinedload(Maintenance.pc).joinedload(PC.lab), joinedload(Maintenance.technician)
    ).filter(
        Maintenance.status == MaintenanceStatus.PENDING
    ).order_by(Maintenance.created_at.desc()).all()

    # 5. Today's Lab Schedule
    today_schedule = db.query(LabBooking).options(
        joinedload(LabBooking.lab), joinedload(LabBooking.faculty)
    ).filter(
        LabBooking.booking_date == today,
        LabBooking.status.in_([BookingStatus.APPROVED, BookingStatus.COMPLETED])
    ).order_by(LabBooking.start_time.asc()).all()

    return {
        "pc_status": {
            "total": total_pcs,
            "available": available_pcs,
            "working": working_pcs,
            "maintenance": maintenance_pcs,
            "not_working": not_working_pcs,
        },
        "critical_pcs": critical_pcs,
        "warning_pcs": warning_pcs,
        "open_complaints_count": open_complaints_count,
        "high_priority_complaints": [
            {
                "id": c.id,
                "code": c.complaint_code,
                "submitter": c.submitter.name if c.submitter else "User",
                "pc_code": c.pc.pc_code if c.pc else "—",
                "lab_name": c.lab.lab_name if c.lab else "—",
                "category": c.complaint_type,
                "priority": c.final_priority or (c.priority.value if hasattr(c.priority, 'value') else str(c.priority)),
                "ai_predicted": c.ai_predicted_priority or "—",
                "status": c.status.value if hasattr(c.status, 'value') else str(c.status),
                "created_at": c.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for c in high_prio_complaints[:6]
        ],
        "pending_maintenance": [
            {
                "id": m.id,
                "pc_code": m.pc.pc_code if m.pc else "—",
                "lab_name": m.pc.lab.lab_name if (m.pc and m.pc.lab) else "—",
                "issue": m.issue_description,
                "type": m.maintenance_type,
                "technician": m.technician.name if m.technician else "Unassigned",
                "start_date": m.start_date.isoformat() if m.start_date else "",
            }
            for m in pending_maint[:6]
        ],
        "today_schedule": [
            {
                "id": s.id,
                "booking_code": s.booking_code,
                "lab_code": s.lab.lab_code if s.lab else "—",
                "lab_name": s.lab.lab_name if s.lab else "—",
                "faculty": s.faculty.name if s.faculty else "Faculty",
                "time_slot": f"{s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')}",
                "students": s.number_of_students,
                "purpose": s.purpose,
                "status": s.status.value if hasattr(s.status, 'value') else str(s.status),
            }
            for s in today_schedule
        ]
    }


# ── 4. Student Dashboard Stats ───────────────────────────────────────────────
@router.get("/student-stats")
def get_student_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()

    # 1. My Complaints
    my_complaints = db.query(Complaint).options(
        joinedload(Complaint.pc), joinedload(Complaint.lab)
    ).filter(
        Complaint.submitted_by == current_user.id
    ).order_by(Complaint.created_at.desc()).all()

    open_count = sum(1 for c in my_complaints if c.status in [ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED])
    in_progress_count = sum(1 for c in my_complaints if c.status == ComplaintStatus.IN_PROGRESS)
    resolved_count = sum(1 for c in my_complaints if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])

    # 2. Lab Information
    labs = db.query(Lab).filter(Lab.status == LabStatus.ACTIVE).all()
    lab_info = []
    for l in labs:
        # Check active session right now
        booked_today = db.query(LabBooking).filter(
            LabBooking.lab_id == l.id,
            LabBooking.booking_date == today,
            LabBooking.status == BookingStatus.APPROVED
        ).first()

        lab_info.append({
            "id": l.id,
            "lab_name": l.lab_name,
            "lab_code": l.lab_code,
            "capacity": l.capacity,
            "location": l.location,
            "status": "In Session" if booked_today else "Open / Free Study",
        })

    # 3. Relevant Booking / Session Info (Permitted Today Schedule)
    today_sessions = db.query(LabBooking).options(
        joinedload(LabBooking.lab), joinedload(LabBooking.faculty)
    ).filter(
        LabBooking.booking_date == today,
        LabBooking.status.in_([BookingStatus.APPROVED, BookingStatus.COMPLETED])
    ).order_by(LabBooking.start_time.asc()).all()

    return {
        "complaints_summary": {
            "total": len(my_complaints),
            "open": open_count,
            "in_progress": in_progress_count,
            "resolved": resolved_count,
        },
        "my_complaints": [
            {
                "id": c.id,
                "code": c.complaint_code,
                "pc_code": c.pc.pc_code if c.pc else "—",
                "lab_name": c.lab.lab_name if c.lab else "—",
                "category": c.complaint_type,
                "severity": c.severity.value if hasattr(c.severity, 'value') else str(c.severity),
                "priority": c.final_priority or (c.priority.value if hasattr(c.priority, 'value') else str(c.priority)),
                "ai_predicted_priority": c.ai_predicted_priority or "—",
                "status": c.status.value if hasattr(c.status, 'value') else str(c.status),
                "created_at": c.created_at.strftime("%Y-%m-%d %H:%M"),
                "resolved_at": c.resolved_at.strftime("%Y-%m-%d %H:%M") if c.resolved_at else None,
            }
            for c in my_complaints
        ],
        "labs": lab_info,
        "today_sessions": [
            {
                "id": s.id,
                "lab_code": s.lab.lab_code if s.lab else "—",
                "lab_name": s.lab.lab_name if s.lab else "—",
                "time_slot": f"{s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')}",
                "faculty": s.faculty.name if s.faculty else "Faculty",
                "purpose": s.purpose,
                "status": s.status.value if hasattr(s.status, 'value') else str(s.status),
            }
            for s in today_sessions
        ]
    }
