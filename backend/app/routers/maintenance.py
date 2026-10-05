import math
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.maintenance import Maintenance, MaintenanceStatus, MAINTENANCE_TYPES
from app.models.pc import PC, PCStatus
from app.models.complaint import Complaint, ComplaintStatus
from app.schemas.maintenance import (
    MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse, MaintenanceListResponse
)
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get("/types", tags=["Maintenance"])
def get_maintenance_types():
    """Return standard maintenance types list."""
    return MAINTENANCE_TYPES


@router.get("", response_model=MaintenanceListResponse)
@router.get("/", response_model=MaintenanceListResponse, include_in_schema=False)
def list_maintenance(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[MaintenanceStatus] = Query(default=None),
    pc_id: Optional[int] = Query(default=None),
    complaint_id: Optional[int] = Query(default=None),
    assigned_to: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT, UserRole.FACULTY]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to view maintenance records.")

    query = db.query(Maintenance).options(
        joinedload(Maintenance.pc),
        joinedload(Maintenance.complaint),
        joinedload(Maintenance.technician),
    )

    if status:
        query = query.filter(Maintenance.status == status)
    if pc_id:
        query = query.filter(Maintenance.pc_id == pc_id)
    if complaint_id:
        query = query.filter(Maintenance.complaint_id == complaint_id)
    if assigned_to:
        query = query.filter(Maintenance.assigned_to == assigned_to)
    if search:
        query = query.filter(
            Maintenance.issue_description.ilike(f"%{search}%") |
            Maintenance.maintenance_type.ilike(f"%{search}%") |
            Maintenance.notes.ilike(f"%{search}%")
        )

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    items = query.order_by(Maintenance.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/pc/{pc_id}", response_model=list[MaintenanceResponse])
def get_pc_maintenance_history(
    pc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full maintenance history for a specific PC asset."""
    records = db.query(Maintenance).options(
        joinedload(Maintenance.pc),
        joinedload(Maintenance.complaint),
        joinedload(Maintenance.technician),
    ).filter(Maintenance.pc_id == pc_id).order_by(Maintenance.created_at.desc()).all()

    return records


@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_maintenance(
    payload: MaintenanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Only Admins and Lab Assistants can schedule maintenance.")

    pc = db.query(PC).filter(PC.id == payload.pc_id).first()
    if not pc:
        raise HTTPException(status_code=400, detail="PC not found.")

    if payload.complaint_id:
        complaint = db.query(Complaint).filter(Complaint.id == payload.complaint_id).first()
        if not complaint:
            raise HTTPException(status_code=400, detail="Associated complaint not found.")
        # Automatically update complaint status to IN_PROGRESS
        complaint.status = ComplaintStatus.IN_PROGRESS
        if payload.assigned_to and not complaint.assigned_to:
            complaint.assigned_to = payload.assigned_to

    # Auto-update PC status to 'maintenance' if requested
    if payload.update_pc_status:
        pc.status = PCStatus.MAINTENANCE

    maintenance = Maintenance(
        pc_id=payload.pc_id,
        complaint_id=payload.complaint_id,
        issue_description=payload.issue_description,
        maintenance_type=payload.maintenance_type,
        assigned_to=payload.assigned_to or current_user.id,
        status=payload.status,
        start_date=payload.start_date or date.today(),
        completion_date=payload.completion_date,
        notes=payload.notes,
    )
    db.add(maintenance)
    db.commit()
    db.refresh(maintenance)

    refreshed = db.query(Maintenance).options(
        joinedload(Maintenance.pc),
        joinedload(Maintenance.complaint),
        joinedload(Maintenance.technician),
    ).filter(Maintenance.id == maintenance.id).first()

    return refreshed


@router.get("/{maintenance_id}", response_model=MaintenanceResponse)
def get_maintenance(
    maintenance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(Maintenance).options(
        joinedload(Maintenance.pc),
        joinedload(Maintenance.complaint),
        joinedload(Maintenance.technician),
    ).filter(Maintenance.id == maintenance_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")

    return record


@router.patch("/{maintenance_id}", response_model=MaintenanceResponse)
def update_maintenance(
    maintenance_id: int,
    payload: MaintenanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Only Admins and Lab Assistants can update maintenance.")

    record = db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")

    update_data = payload.model_dump(exclude_unset=True)
    set_pc_status = update_data.pop("set_pc_status", None)

    # If completing maintenance
    if update_data.get("status") == MaintenanceStatus.COMPLETED:
        if not update_data.get("completion_date") and not record.completion_date:
            update_data["completion_date"] = date.today()

        # If a complaint is linked, optionally resolve it
        if record.complaint_id:
            complaint = db.query(Complaint).filter(Complaint.id == record.complaint_id).first()
            if complaint and complaint.status != ComplaintStatus.RESOLVED:
                complaint.status = ComplaintStatus.RESOLVED
                complaint.resolved_at = datetime.utcnow()

        # If set_pc_status provided (defaulting to working), update PC status
        pc = db.query(PC).filter(PC.id == record.pc_id).first()
        if pc:
            if set_pc_status:
                try:
                    pc.status = PCStatus(set_pc_status)
                except ValueError:
                    pc.status = PCStatus.WORKING
            elif pc.status == PCStatus.MAINTENANCE:
                pc.status = PCStatus.WORKING

    elif set_pc_status:
        # User explicitly requested changing PC status
        pc = db.query(PC).filter(PC.id == record.pc_id).first()
        if pc:
            try:
                pc.status = PCStatus(set_pc_status)
            except ValueError:
                pass

    for field, val in update_data.items():
        setattr(record, field, val)

    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    refreshed = db.query(Maintenance).options(
        joinedload(Maintenance.pc),
        joinedload(Maintenance.complaint),
        joinedload(Maintenance.technician),
    ).filter(Maintenance.id == record.id).first()

    return refreshed


@router.delete("/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance(
    maintenance_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    record = db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")
    db.delete(record)
    db.commit()
