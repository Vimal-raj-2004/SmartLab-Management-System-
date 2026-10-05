from datetime import date, datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class LabUsageBase(BaseModel):
    lab_id: int = Field(..., description="ID of the laboratory")
    booking_id: Optional[int] = Field(None, description="Optional associated booking ID")
    number_of_students: int = Field(..., ge=1, description="Number of students attending the session")
    pcs_used: int = Field(..., ge=1, description="Number of workstations/PCs used")
    session_duration_minutes: int = Field(..., ge=15, description="Duration of the session in minutes")
    session_date: date = Field(..., description="Date of the session")


class LabUsageCreate(LabUsageBase):
    pass


class LabUsageResponse(LabUsageBase):
    id: int
    created_at: datetime
    utilization_level: Optional[str] = Field(None, description="AI-classified utilization level: Low, Medium, High")
    cluster_id: Optional[int] = Field(None, description="K-Means cluster ID (0, 1, 2)")
    lab_name: Optional[str] = None
    lab_code: Optional[str] = None

    class Config:
        from_attributes = True


class PredictUtilizationRequest(BaseModel):
    number_of_students: int = Field(..., ge=1, le=200, description="Students present")
    pcs_used: int = Field(..., ge=1, le=200, description="PCs in use")
    session_duration_minutes: int = Field(..., ge=15, le=600, description="Session length in minutes")


class ClusterStat(BaseModel):
    cluster_id: int
    level: str  # "Low", "Medium", "High"
    centroid: Dict[str, float]
    session_count: int
    percentage: float
    description: str


class PredictUtilizationResponse(BaseModel):
    cluster_id: int
    utilization_level: str
    confidence: float
    distance_to_center: float
    explanation: str
    cluster_characteristics: Dict[str, Any]


class UtilizationStatsResponse(BaseModel):
    total_sessions: int
    low_count: int
    medium_count: int
    high_count: int
    low_percentage: float
    medium_percentage: float
    high_percentage: float
    avg_students: float
    avg_pcs_used: float
    avg_duration_minutes: float
    cluster_statistics: List[ClusterStat]
    lab_breakdown: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
