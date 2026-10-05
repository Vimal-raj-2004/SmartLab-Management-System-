from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base
from datetime import datetime

class PCHealthLog(Base):
    __tablename__ = "pc_health_logs"

    id = Column(Integer, primary_key=True, index=True)
    pc_id = Column(String, nullable=False, index=True)
    cpu_usage = Column(Float, nullable=False)
    ram_usage = Column(Float, nullable=False)
    disk_usage = Column(Float, nullable=False)
    error_count = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=datetime.utcnow)
