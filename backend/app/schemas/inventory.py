from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.models.inventory import ItemCondition, InventoryStatus

class InventoryBase(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., min_length=2, max_length=100)
    quantity: int = Field(default=1, ge=0)
    condition: ItemCondition = ItemCondition.GOOD
    location: Optional[str] = Field(None, max_length=200)
    status: InventoryStatus = InventoryStatus.AVAILABLE
    purchase_date: Optional[date] = None
    notes: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = Field(None, min_length=2, max_length=200)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    quantity: Optional[int] = Field(None, ge=0)
    condition: Optional[ItemCondition] = None
    location: Optional[str] = None
    status: Optional[InventoryStatus] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InventoryListResponse(BaseModel):
    items: list[InventoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
