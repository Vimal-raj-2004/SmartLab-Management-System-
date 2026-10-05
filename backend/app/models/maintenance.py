import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class MaintenanceStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


MAINTENANCE_TYPES = [
    "Hardware Repair",
    "Component Replacement",
    "Software Installation",
    "OS Reinstallation",
    "Network Configuration",
    "Preventive Cleaning",
    "Diagnostics",
    "Other",
]


class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True, index=True)
    pc_id = Column(Integer, ForeignKey("pcs.id", ondelete="CASCADE"), nullable=False, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True, index=True)
    issue_description = Column(Text, nullable=False)
    maintenance_type = Column(String(100), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(FlexibleEnum(MaintenanceStatus), default=MaintenanceStatus.PENDING, nullable=False, index=True)
    start_date = Column(Date, default=date.today, server_default=func.current_date(), nullable=False)
    completion_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)

    # Relationships
    pc = relationship("PC", back_populates="maintenance_records")
    complaint = relationship("Complaint", backref="maintenance_records")
    technician = relationship("User", foreign_keys=[assigned_to], backref="assigned_maintenances")
