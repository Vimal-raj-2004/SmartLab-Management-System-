import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserListResponse, ProfileUpdate
from app.dependencies import get_current_user
from app.utils.security import get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["Users"])


def require_user_manager(current_user: User = Depends(get_current_user)) -> User:
    """
    Allows Admin, Lab Assistant (Technician), and Faculty to access user management.
    Students are strictly forbidden.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT, UserRole.FACULTY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage users."
        )
    return current_user


# ─── Self Profile Endpoints (All Roles) ────────────────────────────────────

@router.get("/profile", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve personal profile details for the currently logged-in user."""
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows any user to update their name, avatar photo, and password.
    If new_password is provided, current_password must be verified first.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None and payload.name.strip():
        user.name = payload.name.strip()

    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url

    if payload.new_password:
        if len(payload.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long."
            )
        if not payload.current_password or not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect. Please re-enter your current password."
            )
        user.password_hash = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Hierarchical User Management Endpoints ────────────────────────────────

@router.get("", response_model=UserListResponse)
@router.get("/", response_model=UserListResponse, include_in_schema=False)
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    role: Optional[UserRole] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(require_user_manager),
    db: Session = Depends(get_db),
):
    """
    Hierarchical listing:
    - Admin: Can list all roles or filter by role.
    - Lab Assistant: Restricted to viewing FACULTY only.
    - Faculty: Restricted to viewing STUDENT only.
    """
    query = db.query(User)

    if current_user.role == UserRole.ADMIN:
        if role:
            query = query.filter(User.role == role)
    elif current_user.role == UserRole.LAB_ASSISTANT:
        # Technicians can only view Faculty
        query = query.filter(User.role == UserRole.FACULTY)
    elif current_user.role == UserRole.FACULTY:
        # Faculty can only view Students
        query = query.filter(User.role == UserRole.STUDENT)

    if search:
        query = query.filter(
            User.name.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(User.status == status)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    users = query.order_by(User.name).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_user_manager),
    db: Session = Depends(get_db),
):
    """
    Hierarchical user creation:
    - Admin: Can create any role (Admin, Lab Assistant, Faculty, Student).
    - Lab Assistant: Can ONLY create Faculty accounts.
    - Faculty: Can ONLY create Student accounts.
    """
    if current_user.role == UserRole.LAB_ASSISTANT:
        if payload.role != UserRole.FACULTY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Lab technicians only have permission to create Faculty accounts."
            )
    elif current_user.role == UserRole.FACULTY:
        if payload.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faculty members only have permission to create Student accounts."
            )

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    hashed = get_password_hash(payload.password)
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hashed,
        role=payload.role,
        status=payload.status or "active",
        avatar_url=payload.avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(require_user_manager),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Enforce hierarchical read scope
    if current_user.role == UserRole.LAB_ASSISTANT and user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Lab technicians can only view Faculty details.")
    elif current_user.role == UserRole.FACULTY and user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Faculty can only view Student details.")

    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(require_user_manager),
    db: Session = Depends(get_db),
):
    """
    Hierarchical user update:
    - Admin: Can update any user.
    - Lab Assistant: Can only update Faculty, and cannot change role.
    - Faculty: Can only update Students, and cannot change role.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == UserRole.LAB_ASSISTANT:
        if user.role != UserRole.FACULTY:
            raise HTTPException(status_code=403, detail="Lab technicians can only edit Faculty members.")
        if payload.role and payload.role != UserRole.FACULTY:
            raise HTTPException(status_code=403, detail="You cannot modify the role of this user.")
    elif current_user.role == UserRole.FACULTY:
        if user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Faculty members can only edit Students.")
        if payload.role and payload.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="You cannot modify the role of this user.")

    update_data = payload.model_dump(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    elif "password" in update_data:
        update_data.pop("password")

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_user_manager),
    db: Session = Depends(get_db),
):
    """
    Hierarchical user deactivation:
    - Admin: Can deactivate any user (except self).
    - Lab Assistant: Can deactivate Faculty only.
    - Faculty: Can deactivate Students only.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself.")

    if current_user.role == UserRole.LAB_ASSISTANT and user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Lab technicians can only deactivate Faculty accounts.")
    elif current_user.role == UserRole.FACULTY and user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Faculty can only deactivate Student accounts.")

    user.status = "inactive"
    db.commit()
