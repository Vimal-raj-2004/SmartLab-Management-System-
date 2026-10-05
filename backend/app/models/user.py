import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base, FlexibleEnum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FACULTY = "faculty"
    LAB_ASSISTANT = "lab_assistant"
    STUDENT = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(FlexibleEnum(UserRole), default=UserRole.STUDENT, nullable=False, index=True)
    status = Column(String(30), default="active", nullable=False)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
