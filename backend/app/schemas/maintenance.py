from pydantic import BaseModel, Field
from typing import Optional, Union
from datetime import datetime, date
from app.models.maintenance import MaintenanceStatus


class MaintenanceTechnicianInfo(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class MaintenancePCInfo(BaseModel):
    id: int
    pc_code: str
    computer_name: str
    status: str
    lab_id: Optional[int] = None

    class Config:
        from_attributes = True


class MaintenanceComplaintInfo(BaseModel):
    id: int
    complaint_code: str
    complaint_type: str
    status: str

    class Config:
        from_attributes = True


class MaintenanceBase(BaseModel):
    pc_id: int
    complaint_id: Optional[int] = None
    issue_description: str = Field(..., min_length=5)
    maintenance_type: str = Field(..., min_length=2, max_length=100)
    assigned_to: Optional[int] = None
    status: MaintenanceStatus = MaintenanceStatus.PENDING
    start_date: Optional[Union[datetime, date]] = None
    completion_date: Optional[Union[datetime, date]] = None
    notes: Optional[str] = None


class MaintenanceCreate(MaintenanceBase):
    update_pc_status: bool = True  # Auto-update PC to 'maintenance'


class MaintenanceUpdate(BaseModel):
    status: Optional[MaintenanceStatus] = None
    assigned_to: Optional[int] = None
    notes: Optional[str] = None
    completion_date: Optional[Union[datetime, date]] = None
    issue_description: Optional[str] = None
    maintenance_type: Optional[str] = None
    set_pc_status: Optional[str] = None  # e.g. 'working' or 'available' when completed


class MaintenanceResponse(BaseModel):
    id: int
    pc_id: int
    complaint_id: Optional[int] = None
    issue_description: str
    maintenance_type: str
    assigned_to: Optional[int] = None
    status: MaintenanceStatus
    start_date: Union[datetime, date]
    completion_date: Optional[Union[datetime, date]] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    pc: Optional[MaintenancePCInfo] = None
    complaint: Optional[MaintenanceComplaintInfo] = None
    technician: Optional[MaintenanceTechnicianInfo] = None

    class Config:
        from_attributes = True


class MaintenanceListResponse(BaseModel):
    items: list[MaintenanceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
