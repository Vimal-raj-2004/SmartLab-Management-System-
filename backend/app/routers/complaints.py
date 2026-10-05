import os
import sys
import math
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.complaint import Complaint, ComplaintSeverity, ComplaintStatus, ComplaintPriority, COMPLAINT_TYPES
from app.models.pc import PC, PCStatus
from app.models.lab import Lab
from app.schemas.complaint import (
    ComplaintCreate, ComplaintUpdate, ComplaintResponse,
    ComplaintListResponse, ComplaintStatsResponse,
    PredictPriorityRequest, PredictPriorityResponse,
    ComplaintAIModelStatsResponse,
)
from app.dependencies import get_current_user, require_admin

# Ensure project root is available to load ML module
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.predict_complaint_priority import predict_complaint_priority, load_complaint_priority_artifacts

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def generate_complaint_code(db: Session) -> str:
    count = db.query(func.count(Complaint.id)).scalar() or 0
    year = datetime.utcnow().year
    return f"CMP-{year}-{(count + 1):04d}"


@router.get("/types", tags=["Complaints"])
def get_complaint_types():
    """Return standard complaint types list."""
    return COMPLAINT_TYPES


@router.get("/stats", response_model=ComplaintStatsResponse)
def get_complaint_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Available to Admin and Lab Assistant to monitor complaints."""
    if current_user.role not in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to view complaint statistics.")

    total = db.query(func.count(Complaint.id)).scalar() or 0
    open_count = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.OPEN).scalar() or 0
    assigned_count = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.ASSIGNED).scalar() or 0
    in_progress_count = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.IN_PROGRESS).scalar() or 0
    resolved_count = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.RESOLVED).scalar() or 0
    closed_count = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.CLOSED).scalar() or 0

    # Severity counts
    by_severity = {}
    for sev in ComplaintSeverity:
        c = db.query(func.count(Complaint.id)).filter(Complaint.severity == sev).scalar() or 0
        by_severity[sev.value] = c

    # Type counts
    by_type = {}
    for ct in COMPLAINT_TYPES:
        c = db.query(func.count(Complaint.id)).filter(Complaint.complaint_type == ct).scalar() or 0
        by_type[ct] = c

    return {
        "total": total,
        "open": open_count,
        "assigned": assigned_count,
        "in_progress": in_progress_count,
        "resolved": resolved_count,
        "closed": closed_count,
        "by_severity": by_severity,
        "by_type": by_type,
    }


# ── Phase 5C: AI Priority Prediction Endpoints ──────────────────────────────
@router.post("/predict-priority", response_model=PredictPriorityResponse)
def predict_priority_preview(
    payload: PredictPriorityRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Real-time priority preview using TF-IDF text vectorization and a Decision Tree.
    Assists users and staff by showing the AI predicted priority and reasoning
    before or during complaint submission/review.
    """
    try:
        res = predict_complaint_priority(
            description=payload.description,
            complaint_type=payload.complaint_type,
            severity=payload.severity,
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI Priority model inference failed: {str(e)}"
        )


@router.get("/ai-model-stats", response_model=ComplaintAIModelStatsResponse)
def get_complaint_ai_model_stats(
    current_user: User = Depends(get_current_user),
):
    """
    Returns transparency statistics for the Phase 5C Complaint Priority model:
    Accuracy, confusion matrix, top Decision Tree split features, and classification report.
    """
    try:
        _, _, _, meta = load_complaint_priority_artifacts()
        return {
            "accuracy": meta.get("accuracy", 0.0),
            "trained_at": meta.get("trained_at", ""),
            "total_samples": meta.get("total_samples", 0),
            "test_samples": meta.get("test_samples", 0),
            "labels": meta.get("labels", []),
            "confusion_matrix": meta.get("confusion_matrix", []),
            "top_features": meta.get("top_features", []),
            "classification_report": meta.get("classification_report", {}),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load AI model metadata: {str(e)}"
        )


@router.get("", response_model=ComplaintListResponse)
@router.get("/", response_model=ComplaintListResponse, include_in_schema=False)
def list_complaints(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[ComplaintStatus] = Query(default=None),
    severity: Optional[ComplaintSeverity] = Query(default=None),
    priority: Optional[ComplaintPriority] = Query(default=None),
    lab_id: Optional[int] = Query(default=None),
    pc_id: Optional[int] = Query(default=None),
    my_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint).options(
        joinedload(Complaint.submitter),
        joinedload(Complaint.assignee),
        joinedload(Complaint.pc),
        joinedload(Complaint.lab),
    )

    # Role-based restriction: Students and Faculty can only see their own complaints
    if current_user.role in [UserRole.STUDENT, UserRole.FACULTY] or my_only:
        query = query.filter(Complaint.submitted_by == current_user.id)

    # Filters
    if status:
        query = query.filter(Complaint.status == status)
    if severity:
        query = query.filter(Complaint.severity == severity)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if lab_id:
        query = query.filter(Complaint.lab_id == lab_id)
    if pc_id:
        query = query.filter(Complaint.pc_id == pc_id)
    if search:
        query = query.filter(
            Complaint.complaint_code.ilike(f"%{search}%") |
            Complaint.description.ilike(f"%{search}%") |
            Complaint.complaint_type.ilike(f"%{search}%")
        )

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    items = query.order_by(Complaint.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_complaint(
    payload: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-derive lab_id from PC if not explicitly supplied
    lab_id = payload.lab_id
    if payload.pc_id:
        pc = db.query(PC).filter(PC.id == payload.pc_id).first()
        if not pc:
            raise HTTPException(status_code=400, detail="Specified PC not found.")
        if not lab_id and pc.lab_id:
            lab_id = pc.lab_id

    code = generate_complaint_code(db)

    # ── Phase 5C: AI Priority Prediction using TF-IDF + Decision Tree ───────────
    ai_predicted = "medium"
    ai_conf = 0.50
    ai_reason = "Rule-based priority assignment"
    try:
        sev_val = payload.severity.value if hasattr(payload.severity, 'value') else str(payload.severity)
        pred = predict_complaint_priority(
            description=payload.description,
            complaint_type=payload.complaint_type,
            severity=sev_val,
        )
        ai_predicted = pred["predicted_priority"]
        ai_conf = pred["confidence"]
        ai_reason = pred["reason"]
    except Exception as e:
        print(f"[Phase 5C AI] Inference warning on complaint create: {e}")

    # Determine final_priority: Staff/caller explicit priority or AI recommendation
    chosen_final = (payload.final_priority or ai_predicted).lower()
    
    # Map final priority string to existing ComplaintPriority enum
    prio_enum = ComplaintPriority.MEDIUM
    try:
        prio_enum = ComplaintPriority(chosen_final)
    except Exception:
        prio_enum = payload.priority or ComplaintPriority.MEDIUM

    complaint = Complaint(
        complaint_code=code,
        submitted_by=current_user.id,
        pc_id=payload.pc_id,
        lab_id=lab_id,
        complaint_type=payload.complaint_type,
        severity=payload.severity,
        description=payload.description,
        status=ComplaintStatus.OPEN,
        priority=prio_enum,
        ai_predicted_priority=ai_predicted,
        final_priority=chosen_final,
        ai_prediction_reason=ai_reason,
        ai_confidence=ai_conf,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Eager reload for nested response
    refreshed = db.query(Complaint).options(
        joinedload(Complaint.submitter),
        joinedload(Complaint.assignee),
        joinedload(Complaint.pc),
        joinedload(Complaint.lab),
    ).filter(Complaint.id == complaint.id).first()

    return refreshed


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).options(
        joinedload(Complaint.submitter),
        joinedload(Complaint.assignee),
        joinedload(Complaint.pc),
        joinedload(Complaint.lab),
    ).filter(Complaint.id == complaint_id).first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # Students and Faculty can only view their own
    if current_user.role in [UserRole.STUDENT, UserRole.FACULTY] and complaint.submitted_by != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this complaint.")

    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    is_admin_or_assistant = current_user.role in [UserRole.ADMIN, UserRole.LAB_ASSISTANT]
    is_assigned_person = complaint.assigned_to == current_user.id
    is_authorized_staff = is_admin_or_assistant or is_assigned_person
    is_owner = complaint.submitted_by == current_user.id

    # Students / Faculty can only update description/severity if still OPEN
    if not is_authorized_staff:
        if not is_owner:
            raise HTTPException(status_code=403, detail="Permission denied.")
        if complaint.status != ComplaintStatus.OPEN:
            raise HTTPException(status_code=400, detail="Cannot edit a complaint that is already assigned or in progress.")

        update_data = payload.model_dump(exclude_unset=True)
        # Disallow students from changing status, priority, final_priority, or assigned_to
        for disallowed in ["status", "priority", "final_priority", "assigned_to", "resolved_at", "notes", "set_pc_working"]:
            update_data.pop(disallowed, None)
    else:
        update_data = payload.model_dump(exclude_unset=True)

        # Extract transient fields not stored on Complaint model directly
        notes = update_data.pop("notes", None)
        set_pc_working = update_data.pop("set_pc_working", None)

        # Allow staff to review & update final_priority and priority
        if "final_priority" in update_data and update_data["final_priority"]:
            fp = update_data["final_priority"].lower()
            complaint.final_priority = fp
            try:
                complaint.priority = ComplaintPriority(fp)
            except Exception:
                pass
            update_data.pop("final_priority", None)
            update_data.pop("priority", None)
        elif "priority" in update_data and update_data["priority"]:
            p_val = update_data["priority"].value if hasattr(update_data["priority"], 'value') else str(update_data["priority"]).lower()
            complaint.final_priority = p_val

        # If assigning user, verify assignee exists
        if "assigned_to" in update_data and update_data["assigned_to"]:
            assignee = db.query(User).filter(User.id == update_data["assigned_to"]).first()
            if not assignee:
                raise HTTPException(status_code=400, detail="Assigned user not found.")
            # Auto move status to ASSIGNED if currently OPEN
            if complaint.status == ComplaintStatus.OPEN and "status" not in update_data:
                update_data["status"] = ComplaintStatus.ASSIGNED

        # If status changed to RESOLVED or CLOSED, set resolved_at
        if "status" in update_data:
            if update_data["status"] in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
                update_data["resolved_at"] = datetime.utcnow()
                if complaint.pc_id and (set_pc_working is None or set_pc_working is True):
                    pc = db.query(PC).filter(PC.id == complaint.pc_id).first()
                    if pc and pc.status in [PCStatus.NOT_WORKING, PCStatus.MAINTENANCE]:
                        pc.status = PCStatus.WORKING
                        pc.updated_at = datetime.utcnow()
            elif update_data["status"] in [ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]:
                update_data["resolved_at"] = None

    for field, val in update_data.items():
        setattr(complaint, field, val)

    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    refreshed = db.query(Complaint).options(
        joinedload(Complaint.submitter),
        joinedload(Complaint.assignee),
        joinedload(Complaint.pc),
        joinedload(Complaint.lab),
    ).filter(Complaint.id == complaint.id).first()

    return refreshed


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(
    complaint_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    from app.models.maintenance import Maintenance
    db.query(Maintenance).filter(Maintenance.complaint_id == complaint_id).update({"complaint_id": None}, synchronize_session=False)
    db.delete(complaint)
    db.commit()
