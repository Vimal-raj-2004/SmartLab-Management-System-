"""
FastAPI Router for AI Lab Utilization Analysis using K-Means (Phase 5B).
"""

import os
import sys
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.lab import Lab
from app.models.booking import LabBooking, BookingStatus
from app.models.lab_usage import LabUsage
from app.schemas.lab_usage import (
    LabUsageCreate, LabUsageResponse,
    PredictUtilizationRequest, PredictUtilizationResponse,
    UtilizationStatsResponse, ClusterStat,
)
from app.dependencies import get_current_user

# Ensure project root in sys.path for ml module
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.predict_kmeans import predict_utilization, load_kmeans_artifacts

router = APIRouter(prefix="/utilization", tags=["AI Lab Utilization"])


# ── Standalone Prediction Endpoint ──────────────────────────────────────────
@router.post("/predict", response_model=PredictUtilizationResponse)
def predict_session_utilization(
    payload: PredictUtilizationRequest,
    current_user: Any = Depends(get_current_user),
):
    """
    Accepts student count, workstations used, and session duration in minutes.
    Standardizes features and predicts Low, Medium, or High utilization via K-Means.
    """
    try:
        result = predict_utilization(
            number_of_students=payload.number_of_students,
            pcs_used=payload.pcs_used,
            session_duration_minutes=payload.session_duration_minutes,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ── List Lab Usage Sessions ────────────────────────────────────────────────
@router.get("/sessions", response_model=List[LabUsageResponse])
def get_usage_sessions(
    lab_id: Optional[int] = Query(None),
    level: Optional[str] = Query(None, description="Filter by Low, Medium, High"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns recorded lab usage sessions with AI utilization classification.
    """
    q = db.query(LabUsage).options(joinedload(LabUsage.lab)).order_by(LabUsage.session_date.desc(), LabUsage.id.desc())

    if lab_id:
        q = q.filter(LabUsage.lab_id == lab_id)
    if start_date:
        q = q.filter(LabUsage.session_date >= start_date)
    if end_date:
        q = q.filter(LabUsage.session_date <= end_date)

    usages = q.offset(skip).limit(limit).all()

    results = []
    for u in usages:
        pred = predict_utilization(
            number_of_students=u.number_of_students,
            pcs_used=u.pcs_used,
            session_duration_minutes=u.session_duration_minutes,
        )
        
        # Apply level filter in Python if specified
        if level and pred['utilization_level'].lower() != level.lower():
            continue

        resp = LabUsageResponse.model_validate(u)
        resp.utilization_level = pred['utilization_level']
        resp.cluster_id = pred['cluster_id']
        resp.lab_name = u.lab.lab_name if u.lab else None
        resp.lab_code = u.lab.lab_code if u.lab else None
        results.append(resp)

    return results


# ── Record New Usage Session ────────────────────────────────────────────────
@router.post("/sessions", response_model=LabUsageResponse, status_code=status.HTTP_201_CREATED)
def record_usage_session(
    payload: LabUsageCreate,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Records a new lab usage session and runs K-Means classification.
    """
    lab = db.query(Lab).filter(Lab.id == payload.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found.")

    if payload.pcs_used > lab.capacity:
        raise HTTPException(
            status_code=422,
            detail=f"PCs used ({payload.pcs_used}) cannot exceed lab capacity ({lab.capacity})."
        )

    usage = LabUsage(
        lab_id=payload.lab_id,
        booking_id=payload.booking_id,
        number_of_students=payload.number_of_students,
        pcs_used=payload.pcs_used,
        session_duration_minutes=payload.session_duration_minutes,
        session_date=payload.session_date,
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)

    pred = predict_utilization(
        number_of_students=usage.number_of_students,
        pcs_used=usage.pcs_used,
        session_duration_minutes=usage.session_duration_minutes,
    )

    resp = LabUsageResponse.model_validate(usage)
    resp.utilization_level = pred['utilization_level']
    resp.cluster_id = pred['cluster_id']
    resp.lab_name = lab.lab_name
    resp.lab_code = lab.lab_code
    return resp


# ── Utilization Analytics & Cluster Statistics ──────────────────────────────
@router.get("/stats", response_model=UtilizationStatsResponse)
def get_utilization_statistics(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Aggregates utilization metrics, cluster distributions, and monthly trends.
    """
    usages = db.query(LabUsage).options(joinedload(LabUsage.lab)).all()
    total = len(usages)

    kmeans, scaler, metadata = load_kmeans_artifacts()
    cluster_stats_meta = metadata.get('cluster_stats', {})

    counts = {'Low': 0, 'Medium': 0, 'High': 0}
    lab_agg = {}
    monthly_agg = {}

    total_students = 0
    total_pcs = 0
    total_duration = 0

    for u in usages:
        pred = predict_utilization(u.number_of_students, u.pcs_used, u.session_duration_minutes)
        lvl = pred['utilization_level']
        counts[lvl] = counts.get(lvl, 0) + 1

        total_students += u.number_of_students
        total_pcs += u.pcs_used
        total_duration += u.session_duration_minutes

        # Lab breakdown
        lab_name = u.lab.lab_name if u.lab else f"Lab #{u.lab_id}"
        if lab_name not in lab_agg:
            lab_agg[lab_name] = {'lab_name': lab_name, 'total_sessions': 0, 'Low': 0, 'Medium': 0, 'High': 0, 'avg_students': 0, 'total_students': 0}
        lab_agg[lab_name]['total_sessions'] += 1
        lab_agg[lab_name][lvl] += 1
        lab_agg[lab_name]['total_students'] += u.number_of_students

        # Monthly trend (YYYY-MM)
        month_str = u.session_date.strftime("%Y-%m")
        if month_str not in monthly_agg:
            monthly_agg[month_str] = {'month': month_str, 'total': 0, 'Low': 0, 'Medium': 0, 'High': 0}
        monthly_agg[month_str]['total'] += 1
        monthly_agg[month_str][lvl] += 1

    # Finalize lab averages
    lab_breakdown = []
    for l_data in lab_agg.values():
        if l_data['total_sessions'] > 0:
            l_data['avg_students'] = round(l_data['total_students'] / l_data['total_sessions'], 1)
        lab_breakdown.append(l_data)
    lab_breakdown.sort(key=lambda x: x['total_sessions'], reverse=True)

    # Sort monthly trend
    monthly_trend = sorted(monthly_agg.values(), key=lambda x: x['month'])

    # Format cluster statistics
    cluster_statistics: List[ClusterStat] = []
    for level in ['Low', 'Medium', 'High']:
        c_info = cluster_stats_meta.get(level, {})
        c_count = counts.get(level, 0)
        c_pct = round((c_count / total * 100), 1) if total > 0 else 0.0

        cluster_statistics.append(
            ClusterStat(
                cluster_id=c_info.get('cluster_id', 0),
                level=level,
                centroid={
                    'students': c_info.get('students_mean', 0.0),
                    'pcs_used': c_info.get('pcs_mean', 0.0),
                    'duration_minutes': c_info.get('duration_mean', 0.0),
                },
                session_count=c_count,
                percentage=c_pct,
                description=c_info.get('description', f"{level} Utilization cluster"),
            )
        )

    low_pct = round((counts['Low'] / total * 100), 1) if total > 0 else 0.0
    med_pct = round((counts['Medium'] / total * 100), 1) if total > 0 else 0.0
    high_pct = round((counts['High'] / total * 100), 1) if total > 0 else 0.0

    return {
        'total_sessions': total,
        'low_count': counts['Low'],
        'medium_count': counts['Medium'],
        'high_count': counts['High'],
        'low_percentage': low_pct,
        'medium_percentage': med_pct,
        'high_percentage': high_pct,
        'avg_students': round(total_students / total, 1) if total > 0 else 0.0,
        'avg_pcs_used': round(total_pcs / total, 1) if total > 0 else 0.0,
        'avg_duration_minutes': round(total_duration / total, 1) if total > 0 else 0.0,
        'cluster_statistics': cluster_statistics,
        'lab_breakdown': lab_breakdown,
        'monthly_trend': monthly_trend,
    }


# ── Sync from Bookings ──────────────────────────────────────────────────────
@router.post("/sync-bookings")
def sync_usages_from_bookings(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Syncs completed bookings into lab_usage records if not already synced.
    """
    completed_bookings = db.query(LabBooking).filter(
        LabBooking.status.in_([BookingStatus.COMPLETED, BookingStatus.APPROVED])
    ).all()

    existing_booking_ids = set(
        x[0] for x in db.query(LabUsage.booking_id).filter(LabUsage.booking_id.isnot(None)).all()
    )

    created_count = 0
    for b in completed_bookings:
        if b.id in existing_booking_ids:
            continue

        # Calculate duration in minutes
        duration = 60
        if b.start_time and b.end_time:
            t1 = datetime.combine(date.today(), b.start_time)
            t2 = datetime.combine(date.today(), b.end_time)
            diff = (t2 - t1).total_seconds() / 60
            if diff > 0:
                duration = int(diff)

        pcs = min(b.number_of_students, (b.lab.capacity if b.lab else 40))

        usage = LabUsage(
            lab_id=b.lab_id,
            booking_id=b.id,
            number_of_students=b.number_of_students,
            pcs_used=pcs,
            session_duration_minutes=duration,
            session_date=b.booking_date,
        )
        db.add(usage)
        created_count += 1

    db.commit()
    return {"message": f"Successfully synced {created_count} bookings into lab usage records."}
