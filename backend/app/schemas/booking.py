from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator
from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    lab_id: int
    purpose: str
    booking_date: date
    start_time: time
    end_time: time
    number_of_students: int

    @field_validator("end_time")
    @classmethod
    def end_must_be_after_start(cls, v, info):
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v

    @field_validator("number_of_students")
    @classmethod
    def students_positive(cls, v):
        if v < 1:
            raise ValueError("number_of_students must be at least 1")
        return v


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
    rejection_reason: Optional[str] = None


class FacultyInfo(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


class LabInfo(BaseModel):
    id: int
    lab_name: str
    lab_code: str
    location: Optional[str] = None
    capacity: int

    model_config = {"from_attributes": True}


class BookingResponse(BaseModel):
    id: int
    booking_code: str
    lab_id: int
    faculty_id: int
    purpose: str
    booking_date: date
    start_time: time
    end_time: time
    number_of_students: int
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lab: Optional[LabInfo] = None
    faculty: Optional[FacultyInfo] = None

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    items: List[BookingResponse]
    total: int
    page: int
    per_page: int
    pages: int


class AvailabilitySlot(BaseModel):
    booking_id: int
    booking_code: str
    faculty_name: str
    purpose: str
    start_time: time
    end_time: time
    status: str


class LabAvailability(BaseModel):
    lab_id: int
    lab_name: str
    lab_code: str
    capacity: int
    location: Optional[str]
    bookings: List[AvailabilitySlot]
    is_available_now: bool


class BookingStatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    cancelled: int
    completed: int
