import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class ComplaintSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ComplaintPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


COMPLAINT_TYPES = [
    "Computer not starting",
    "Slow computer",
    "Network issue",
    "Software issue",
    "Keyboard issue",
    "Mouse issue",
    "Monitor issue",
    "Other",
]


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_code = Column(String(50), unique=True, index=True, nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pc_id = Column(Integer, ForeignKey("pcs.id", ondelete="SET NULL"), nullable=True, index=True)
    lab_id = Column(Integer, ForeignKey("labs.id", ondelete="SET NULL"), nullable=True, index=True)
    complaint_type = Column(String(100), nullable=False, index=True)
    severity = Column(FlexibleEnum(ComplaintSeverity), default=ComplaintSeverity.MEDIUM, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(FlexibleEnum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False, index=True)
    priority = Column(FlexibleEnum(ComplaintPriority), default=ComplaintPriority.MEDIUM, nullable=False, index=True)
    
    # Phase 5C: AI Complaint Priority fields
    ai_predicted_priority = Column(String(50), nullable=True)
    final_priority = Column(String(50), nullable=True)
    ai_prediction_reason = Column(Text, nullable=True)
    ai_confidence = Column(Float, nullable=True)

    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    submitter = relationship("User", foreign_keys=[submitted_by], backref="submitted_complaints")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_complaints")
    pc = relationship("PC", back_populates="complaints")
    lab = relationship("Lab", backref="complaints")
