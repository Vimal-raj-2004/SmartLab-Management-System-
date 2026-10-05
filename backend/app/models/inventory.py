import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Date, Text
from app.database import Base, FlexibleEnum


class ItemCondition(str, enum.Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    DAMAGED = "damaged"


class InventoryStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"
    DISPOSED = "disposed"


class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    quantity = Column(Integer, default=1, nullable=False)
    condition = Column(FlexibleEnum(ItemCondition), default=ItemCondition.GOOD, nullable=False)
    location = Column(String(200), nullable=True)
    status = Column(FlexibleEnum(InventoryStatus), default=InventoryStatus.AVAILABLE, nullable=False)
    purchase_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
