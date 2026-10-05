from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.lab import LabStatus

class LabBase(BaseModel):
    lab_name: str = Field(..., min_length=2, max_length=120)
    lab_code: str = Field(..., min_length=2, max_length=30)
    location: str = Field(..., min_length=2, max_length=200)
    capacity: int = Field(default=30, ge=1, le=500)
    description: Optional[str] = None
    status: LabStatus = LabStatus.ACTIVE

class LabCreate(LabBase):
    pass

class LabUpdate(BaseModel):
    lab_name: Optional[str] = Field(None, min_length=2, max_length=120)
    lab_code: Optional[str] = Field(None, min_length=2, max_length=30)
    location: Optional[str] = Field(None, min_length=2, max_length=200)
    capacity: Optional[int] = Field(None, ge=1, le=500)
    description: Optional[str] = None
    status: Optional[LabStatus] = None
    is_active: Optional[bool] = None

class LabResponse(LabBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    pc_count: Optional[int] = 0

    class Config:
        from_attributes = True

class LabListResponse(BaseModel):
    items: list[LabResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
