from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.inventory import InventoryItem, InventoryStatus, ItemCondition
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse, InventoryListResponse
from app.dependencies import require_admin, get_current_user
from app.models.user import User, UserRole
import math

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=InventoryListResponse)
@router.get("/", response_model=InventoryListResponse, include_in_schema=False)
def list_inventory(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[InventoryStatus] = Query(default=None),
    category: Optional[str] = Query(default=None),
    condition: Optional[ItemCondition] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryItem)

    if search:
        query = query.filter(
            InventoryItem.item_name.ilike(f"%{search}%") |
            InventoryItem.category.ilike(f"%{search}%") |
            InventoryItem.location.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(InventoryItem.status == status)
    if category:
        query = query.filter(InventoryItem.category.ilike(f"%{category}%"))
    if condition:
        query = query.filter(InventoryItem.condition == condition)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    items = query.order_by(InventoryItem.item_name).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_inventory_item(
    payload: InventoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    item = InventoryItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/categories", tags=["Inventory"])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get distinct categories for filter dropdowns."""
    from sqlalchemy import distinct
    cats = db.query(distinct(InventoryItem.category)).order_by(InventoryItem.category).all()
    return [c[0] for c in cats]


@router.get("/{item_id}", response_model=InventoryResponse)
def get_inventory_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.patch("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: int,
    payload: InventoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    db.delete(item)
    db.commit()
