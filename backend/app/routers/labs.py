from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.lab import Lab, LabStatus
from app.models.pc import PC
from app.schemas.lab import LabCreate, LabUpdate, LabResponse, LabListResponse
from app.dependencies import require_admin, require_role, get_current_user
from app.models.user import User, UserRole
import math

router = APIRouter(prefix="/labs", tags=["Labs"])

def build_lab_response(lab: Lab, db: Session) -> dict:
    pc_count = db.query(func.count(PC.id)).filter(PC.lab_id == lab.id).scalar()
    data = {
        "id": lab.id,
        "lab_name": lab.lab_name,
        "lab_code": lab.lab_code,
        "location": lab.location,
        "capacity": lab.capacity,
        "description": lab.description,
        "status": lab.status,
        "is_active": lab.is_active,
        "created_at": lab.created_at,
        "updated_at": lab.updated_at,
        "pc_count": pc_count or 0,
    }
    return data


@router.get("", response_model=LabListResponse)
@router.get("/", response_model=LabListResponse, include_in_schema=False)
def list_labs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[LabStatus] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Lab)
    if search:
        query = query.filter(
            Lab.lab_name.ilike(f"%{search}%") |
            Lab.lab_code.ilike(f"%{search}%") |
            Lab.location.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(Lab.status == status)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    labs = query.order_by(Lab.lab_name).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [build_lab_response(lab, db) for lab in labs],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", response_model=LabResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=LabResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_lab(
    payload: LabCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Lab).filter(Lab.lab_code == payload.lab_code).first():
        raise HTTPException(status_code=400, detail="Lab code already exists")
    if db.query(Lab).filter(Lab.lab_name == payload.lab_name).first():
        raise HTTPException(status_code=400, detail="Lab name already exists")

    lab = Lab(**payload.model_dump())
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return build_lab_response(lab, db)


@router.get("/{lab_id}", response_model=LabResponse)
def get_lab(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    return build_lab_response(lab, db)


@router.patch("/{lab_id}", response_model=LabResponse)
def update_lab(
    lab_id: int,
    payload: LabUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "lab_code" in update_data:
        existing = db.query(Lab).filter(Lab.lab_code == update_data["lab_code"], Lab.id != lab_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Lab code already in use")

    if "lab_name" in update_data:
        existing = db.query(Lab).filter(Lab.lab_name == update_data["lab_name"], Lab.id != lab_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Lab name already in use")

    for field, value in update_data.items():
        setattr(lab, field, value)

    db.commit()
    db.refresh(lab)
    return build_lab_response(lab, db)


@router.delete("/{lab_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab(
    lab_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    # Soft delete — set inactive
    lab.is_active = False
    lab.status = LabStatus.CLOSED
    db.commit()
