import math
from datetime import date, datetime, time as time_type, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

# Indian Standard Time (IST UTC+5:30) for laboratory scheduling
IST = timezone(timedelta(hours=5, minutes=30))

def get_current_ist_datetime() -> datetime:
    return datetime.now(IST)

def format_time_12h(t: time_type) -> str:
    if not t:
        return ""
    h = t.hour
    ampm = "PM" if h >= 12 else "AM"
    h12 = h % 12 or 12
    return f"{h12:02d}:{t.minute:02d} {ampm}"

from app.database import get_db
from app.models.user import User, UserRole
from app.models.lab import Lab
from app.models.booking import LabBooking, BookingStatus
from app.schemas.booking import (
    BookingCreate, BookingStatusUpdate, BookingResponse,
    BookingListResponse, AvailabilitySlot, LabAvailability,
    BookingStatsResponse,
)
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/bookings", tags=["Lab Bookings"])


def generate_booking_code(db: Session) -> str:
    count = db.query(func.count(LabBooking.id)).scalar() or 0
    year = datetime.utcnow().year
    return f"BK-{year}-{(count + 1):04d}"


def _check_overlap(db: Session, lab_id: int, booking_date: date,
                   start_time, end_time, exclude_id: Optional[int] = None) -> Optional[LabBooking]:
    """
    Returns an existing booking that overlaps with the requested time window.
    Two intervals [A,B] and [C,D] overlap when A < D AND C < B.
    Cancelled and Rejected bookings are ignored.
    """
    q = db.query(LabBooking).filter(
        LabBooking.lab_id == lab_id,
        LabBooking.booking_date == booking_date,
        LabBooking.status.notin_([BookingStatus.REJECTED, BookingStatus.CANCELLED]),
        # Overlap condition: NOT (end_time <= start OR start_time >= end)
        LabBooking.start_time < end_time,
        LabBooking.end_time > start_time,
    )
    if exclude_id:
        q = q.filter(LabBooking.id != exclude_id)
    return q.first()


def _auto_complete_past_bookings(db: Session):
    """
    Automatically marks approved bookings as COMPLETED once their scheduled time has passed.
    Also auto-rejects unapproved pending bookings whose time has passed.
    Wrapped in try/except with rollback so any database blip never breaks the calling endpoint.
    """
    try:
        now = get_current_ist_datetime()
        current_date = now.date()
        current_time = now.time()

        # 1. Past approved bookings -> COMPLETED
        past_approved = db.query(LabBooking).filter(
            LabBooking.status == BookingStatus.APPROVED,
            or_(
                LabBooking.booking_date < current_date,
                and_(
                    LabBooking.booking_date == current_date,
                    LabBooking.end_time <= current_time,
                )
            )
        ).all()

        modified = False
        for b in past_approved:
            b.status = BookingStatus.COMPLETED
            b.updated_at = now
            modified = True

        # 2. Past pending bookings -> REJECTED (Expired)
        past_pending = db.query(LabBooking).filter(
            LabBooking.status == BookingStatus.PENDING,
            or_(
                LabBooking.booking_date < current_date,
                and_(
                    LabBooking.booking_date == current_date,
                    LabBooking.end_time <= current_time,
                )
            )
        ).all()

        for b in past_pending:
            b.status = BookingStatus.REJECTED
            b.rejection_reason = "Booking expired before approval (scheduled time has passed)."
            b.updated_at = now
            modified = True

        if modified:
            db.commit()
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass



# ── Create booking ────────────────────────────────────────────────────────
@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Faculty can create a lab booking. Admin can also create on behalf of faculty."""
    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only faculty or admin can create bookings.")

    # Validate lab exists
    lab = db.query(Lab).filter(Lab.id == payload.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found.")

    # Capacity validation
    if payload.number_of_students > lab.capacity:
        raise HTTPException(
            status_code=422,
            detail=f"Number of students ({payload.number_of_students}) exceeds lab capacity ({lab.capacity})."
        )

    now_ist = get_current_ist_datetime()
    today_ist = now_ist.date()
    current_time_ist = now_ist.time()

    # Date must not be in the past
    if payload.booking_date < today_ist:
        raise HTTPException(status_code=422, detail="Booking date cannot be in the past.")

    # End time must be later than start time
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=422, detail="End time must be later than start time.")

    # Prevent booking past time slots on today's date
    if payload.booking_date == today_ist:
        if payload.start_time <= current_time_ist or payload.end_time <= current_time_ist:
            slot_str = f"{format_time_12h(payload.start_time)} – {format_time_12h(payload.end_time)}"
            cur_str = format_time_12h(current_time_ist)
            raise HTTPException(
                status_code=422,
                detail=f"Cannot book a past time slot! The selected slot ({slot_str}) has already passed today (Current time: {cur_str}). Please choose an upcoming future time slot."
            )

    # Use transaction to prevent race conditions
    try:
        with db.begin_nested():
            # Check overlap inside the transaction
            conflict = _check_overlap(
                db, payload.lab_id, payload.booking_date,
                payload.start_time, payload.end_time
            )
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Lab '{lab.lab_name}' already has a booking ({conflict.booking_code}) "
                        f"on {payload.booking_date} from "
                        f"{conflict.start_time.strftime('%H:%M')} to {conflict.end_time.strftime('%H:%M')} "
                        f"that overlaps with your requested time "
                        f"{payload.start_time.strftime('%H:%M')}–{payload.end_time.strftime('%H:%M')}."
                    )
                )

            booking = LabBooking(
                booking_code=generate_booking_code(db),
                lab_id=payload.lab_id,
                faculty_id=current_user.id,
                purpose=payload.purpose,
                booking_date=payload.booking_date,
                start_time=payload.start_time,
                end_time=payload.end_time,
                number_of_students=payload.number_of_students,
                status=BookingStatus.PENDING,
            )
            db.add(booking)

        db.commit()
        db.refresh(booking)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create booking: {str(e)}")

    return db.query(LabBooking).options(
        joinedload(LabBooking.lab),
        joinedload(LabBooking.faculty),
    ).filter(LabBooking.id == booking.id).first()


# ── List bookings ─────────────────────────────────────────────────────────
@router.get("", response_model=BookingListResponse)
def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    lab_id: Optional[int] = Query(None),
    booking_date: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _auto_complete_past_bookings(db)

    q = db.query(LabBooking).options(
        joinedload(LabBooking.lab),
        joinedload(LabBooking.faculty),
    )

    # Faculty sees only own bookings; admin/assistant see all
    if current_user.role == UserRole.FACULTY:
        q = q.filter(LabBooking.faculty_id == current_user.id)
    elif current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Students cannot view bookings.")

    if lab_id:
        q = q.filter(LabBooking.lab_id == lab_id)
    if booking_date:
        q = q.filter(LabBooking.booking_date == booking_date)
    if status_filter:
        q = q.filter(LabBooking.status == status_filter)

    q = q.order_by(LabBooking.booking_date.desc(), LabBooking.start_time.desc())

    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    pages = math.ceil(total / per_page) if total > 0 else 1

    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages}


# ── Today's schedule ──────────────────────────────────────────────────────
@router.get("/today", response_model=BookingListResponse)
def get_today_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Today's approved/pending/completed bookings — for Lab Assistant portal."""
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    _auto_complete_past_bookings(db)

    today = date.today()
    items = (
        db.query(LabBooking)
        .options(joinedload(LabBooking.lab), joinedload(LabBooking.faculty))
        .filter(
            LabBooking.booking_date == today,
            LabBooking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING, BookingStatus.COMPLETED]),
        )
        .order_by(LabBooking.start_time)
        .all()
    )
    return {"items": items, "total": len(items), "page": 1, "per_page": len(items) + 1, "pages": 1}


# ── Availability ──────────────────────────────────────────────────────────
@router.get("/availability")
def get_availability(
    check_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return per-lab availability with booked time slots for a given date."""
    if check_date is None:
        check_date = date.today()

    _auto_complete_past_bookings(db)

    now = datetime.now().time()
    labs = db.query(Lab).filter(Lab.status == "active").order_by(Lab.lab_name).all()
    result = []
    for lab in labs:
        bookings = (
            db.query(LabBooking)
            .options(joinedload(LabBooking.faculty))
            .filter(
                LabBooking.lab_id == lab.id,
                LabBooking.booking_date == check_date,
                LabBooking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING]),
            )
            .order_by(LabBooking.start_time)
            .all()
        )

        # Is the lab occupied right now (only for today)?
        is_busy_now = False
        if check_date == date.today():
            for b in bookings:
                if b.status == BookingStatus.APPROVED and b.start_time <= now <= b.end_time:
                    is_busy_now = True
                    break

        slots = [
            AvailabilitySlot(
                booking_id=b.id,
                booking_code=b.booking_code,
                faculty_name=b.faculty.name if b.faculty else "Unknown",
                purpose=b.purpose,
                start_time=b.start_time,
                end_time=b.end_time,
                status=b.status.value if hasattr(b.status, "value") else str(b.status),
            )
            for b in bookings
        ]
        result.append(
            LabAvailability(
                lab_id=lab.id,
                lab_name=lab.lab_name,
                lab_code=lab.lab_code,
                capacity=lab.capacity,
                location=lab.location,
                bookings=slots,
                is_available_now=not is_busy_now,
            )
        )
    return result


# ── Stats ─────────────────────────────────────────────────────────────────
@router.get("/stats", response_model=BookingStatsResponse)
def get_booking_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    _auto_complete_past_bookings(db)

    total = db.query(func.count(LabBooking.id)).scalar() or 0
    pending = db.query(func.count(LabBooking.id)).filter(LabBooking.status == BookingStatus.PENDING).scalar() or 0
    approved = db.query(func.count(LabBooking.id)).filter(LabBooking.status == BookingStatus.APPROVED).scalar() or 0
    rejected = db.query(func.count(LabBooking.id)).filter(LabBooking.status == BookingStatus.REJECTED).scalar() or 0
    cancelled = db.query(func.count(LabBooking.id)).filter(LabBooking.status == BookingStatus.CANCELLED).scalar() or 0
    completed = db.query(func.count(LabBooking.id)).filter(LabBooking.status == BookingStatus.COMPLETED).scalar() or 0

    return {
        "total": total, "pending": pending, "approved": approved,
        "rejected": rejected, "cancelled": cancelled, "completed": completed,
    }


# ── Get single booking ────────────────────────────────────────────────────
@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _auto_complete_past_bookings(db)

    booking = (
        db.query(LabBooking)
        .options(joinedload(LabBooking.lab), joinedload(LabBooking.faculty))
        .filter(LabBooking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    # Faculty can only see own bookings
    if current_user.role == UserRole.FACULTY and booking.faculty_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return booking


# ── Update booking status ─────────────────────────────────────────────────
@router.patch("/{booking_id}", response_model=BookingResponse)
def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _auto_complete_past_bookings(db)

    booking = (
        db.query(LabBooking)
        .options(joinedload(LabBooking.lab), joinedload(LabBooking.faculty))
        .filter(LabBooking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    new_status = payload.status

    # Check if scheduled time has already passed
    now = datetime.now()
    is_past = (
        booking.booking_date < now.date() or
        (booking.booking_date == now.date() and booking.end_time <= now.time())
    )
    if is_past and new_status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel a reservation whose scheduled time has already passed."
        )
    if is_past and booking.status == BookingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify a completed booking reservation."
        )

    # Permission rules
    if current_user.role == UserRole.FACULTY:
        # Faculty can only cancel their own pending/approved bookings
        if booking.faculty_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot modify another faculty's booking.")
        if new_status != BookingStatus.CANCELLED:
            raise HTTPException(status_code=403, detail="Faculty can only cancel bookings.")
        if booking.status not in [BookingStatus.PENDING, BookingStatus.APPROVED]:
            raise HTTPException(status_code=422, detail=f"Cannot cancel a booking in '{booking.status}' state.")

    elif current_user.role in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        allowed = {
            BookingStatus.APPROVED, BookingStatus.REJECTED,
            BookingStatus.CANCELLED, BookingStatus.COMPLETED,
        }
        if new_status not in allowed:
            raise HTTPException(status_code=422, detail="Invalid status transition.")
        if new_status == BookingStatus.REJECTED and not payload.rejection_reason:
            raise HTTPException(status_code=422, detail="rejection_reason is required when rejecting a booking.")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    booking.status = new_status
    booking.updated_at = datetime.utcnow()
    if payload.rejection_reason:
        booking.rejection_reason = payload.rejection_reason

    db.commit()
    db.refresh(booking)
    return booking


# ── Delete booking (admin only) ───────────────────────────────────────────
@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    booking = db.query(LabBooking).filter(LabBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    db.delete(booking)
    db.commit()
