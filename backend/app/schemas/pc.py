from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.models.pc import PCStatus

class PCBase(BaseModel):
    lab_id: Optional[int] = None
    pc_code: str = Field(..., min_length=2, max_length=50)
    computer_name: str = Field(..., min_length=2, max_length=100)
    processor: Optional[str] = Field(None, max_length=150)
    ram: Optional[str] = Field(None, max_length=50)
    storage: Optional[str] = Field(None, max_length=100)
    operating_system: Optional[str] = Field(None, max_length=100)
    status: PCStatus = PCStatus.AVAILABLE
    purchase_date: Optional[date] = None
    notes: Optional[str] = None

class PCCreate(PCBase):
    pass

class PCUpdate(BaseModel):
    lab_id: Optional[int] = None
    pc_code: Optional[str] = Field(None, min_length=2, max_length=50)
    computer_name: Optional[str] = Field(None, min_length=2, max_length=100)
    processor: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    operating_system: Optional[str] = None
    status: Optional[PCStatus] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None

class LabInfo(BaseModel):
    id: int
    lab_name: str
    lab_code: str

    class Config:
        from_attributes = True

class PCResponse(PCBase):
    id: int
    created_at: datetime
    updated_at: datetime
    lab: Optional[LabInfo] = None

    class Config:
        from_attributes = True

class PCListResponse(BaseModel):
    items: list[PCResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
