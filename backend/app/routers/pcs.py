from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app.database import get_db
from app.models.pc import PC, PCStatus
from app.models.lab import Lab
from app.models.maintenance import Maintenance
from app.models.complaint import Complaint
from app.schemas.pc import PCCreate, PCUpdate, PCResponse, PCListResponse
from app.dependencies import require_admin, get_current_user
from app.models.user import User, UserRole
import math

router = APIRouter(prefix="/pcs", tags=["PCs"])


@router.get("", response_model=PCListResponse)
@router.get("/", response_model=PCListResponse, include_in_schema=False)
def list_pcs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[PCStatus] = Query(default=None),
    lab_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PC).options(joinedload(PC.lab))

    if search:
        query = query.filter(
            PC.pc_code.ilike(f"%{search}%") |
            PC.computer_name.ilike(f"%{search}%") |
            PC.processor.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(PC.status == status)
    if lab_id:
        query = query.filter(PC.lab_id == lab_id)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    pcs = query.order_by(PC.pc_code).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": pcs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", response_model=PCResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PCResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_pc(
    payload: PCCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(PC).filter(PC.pc_code == payload.pc_code).first():
        raise HTTPException(status_code=400, detail="PC code already exists")

    if payload.lab_id:
        lab = db.query(Lab).filter(Lab.id == payload.lab_id).first()
        if not lab:
            raise HTTPException(status_code=400, detail="Lab not found")

    pc = PC(**payload.model_dump())
    db.add(pc)
    db.commit()
    db.refresh(pc)
    db.refresh(pc, ["lab"])
    return pc


@router.get("/{pc_id}", response_model=PCResponse)
def get_pc(
    pc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pc = db.query(PC).options(joinedload(PC.lab)).filter(PC.id == pc_id).first()
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")
    return pc


@router.patch("/{pc_id}", response_model=PCResponse)
def update_pc(
    pc_id: int,
    payload: PCUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Admin and Lab Assistant can update PCs
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    pc = db.query(PC).options(joinedload(PC.lab)).filter(PC.id == pc_id).first()
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "pc_code" in update_data:
        existing = db.query(PC).filter(PC.pc_code == update_data["pc_code"], PC.id != pc_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="PC code already in use")

    if "lab_id" in update_data and update_data["lab_id"]:
        lab = db.query(Lab).filter(Lab.id == update_data["lab_id"]).first()
        if not lab:
            raise HTTPException(status_code=400, detail="Lab not found")

    for field, value in update_data.items():
        setattr(pc, field, value)

    db.commit()
    db.refresh(pc)
    return pc


@router.delete("/{pc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pc(
    pc_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pc = db.query(PC).filter(PC.id == pc_id).first()
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")

    # Safely delete related maintenance records first to prevent foreign key integrity errors
    db.query(Maintenance).filter(Maintenance.pc_id == pc_id).delete(synchronize_session=False)

    # Disassociate any complaints linked to this PC
    db.query(Complaint).filter(Complaint.pc_id == pc_id).update({"pc_id": None}, synchronize_session=False)

    # Clean up any telemetry / health logs
    try:
        from app.models.pc_health import PCHealthLog
        db.query(PCHealthLog).filter(
            (PCHealthLog.pc_id == str(pc_id)) | (PCHealthLog.pc_id == pc.pc_code)
        ).delete(synchronize_session=False)
    except Exception:
        pass

    db.delete(pc)
    db.commit()
