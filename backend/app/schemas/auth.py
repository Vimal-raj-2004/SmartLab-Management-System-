from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: str
    status: str
    avatar_url: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None # email
    role: Optional[str] = None
    user_id: Optional[int] = None
