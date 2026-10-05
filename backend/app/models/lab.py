import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from app.database import Base, FlexibleEnum


class LabStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    CLOSED = "closed"


class Lab(Base):
    __tablename__ = "labs"

    id = Column(Integer, primary_key=True, index=True)
    lab_name = Column(String(120), unique=True, nullable=False, index=True)
    lab_code = Column(String(30), unique=True, nullable=False, index=True)
    location = Column(String(200), nullable=False)
    capacity = Column(Integer, default=30, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(FlexibleEnum(LabStatus), default=LabStatus.ACTIVE, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
