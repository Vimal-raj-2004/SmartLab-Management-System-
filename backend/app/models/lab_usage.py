from datetime import datetime
from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class LabUsage(Base):
    __tablename__ = "lab_usage"

    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("labs.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("lab_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    number_of_students = Column(Integer, nullable=False)
    pcs_used = Column(Integer, nullable=False)
    session_duration_minutes = Column(Integer, nullable=False)
    session_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    lab = relationship("Lab", backref="usages")
    booking = relationship("LabBooking", backref="usage")
