import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class PCStatus(str, enum.Enum):
    WORKING = "working"
    AVAILABLE = "available"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"
    NOT_WORKING = "not_working"


class PC(Base):
    __tablename__ = "pcs"

    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("labs.id", ondelete="SET NULL"), nullable=True, index=True)
    pc_code = Column(String(50), unique=True, index=True, nullable=False)
    computer_name = Column(String(100), nullable=False)
    processor = Column(String(150), nullable=True)
    ram = Column(String(50), nullable=True)
    storage = Column(String(100), nullable=True)
    operating_system = Column(String(100), nullable=True)
    status = Column(FlexibleEnum(PCStatus), default=PCStatus.AVAILABLE, nullable=False, index=True)
    purchase_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lab = relationship("Lab", backref="pcs")
    maintenance_records = relationship("Maintenance", back_populates="pc", cascade="all, delete-orphan", passive_deletes=True)
    complaints = relationship("Complaint", back_populates="pc")
