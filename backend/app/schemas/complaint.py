from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.complaint import ComplaintSeverity, ComplaintStatus, ComplaintPriority


class SubmitterInfo(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class AssigneeInfo(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class ComplaintPCInfo(BaseModel):
    id: int
    pc_code: str
    computer_name: str
    status: str

    class Config:
        from_attributes = True


class ComplaintLabInfo(BaseModel):
    id: int
    lab_name: str
    lab_code: str

    class Config:
        from_attributes = True


class ComplaintBase(BaseModel):
    pc_id: Optional[int] = None
    lab_id: Optional[int] = None
    complaint_type: str = Field(..., min_length=2, max_length=100)
    severity: ComplaintSeverity = ComplaintSeverity.MEDIUM
    description: str = Field(..., min_length=5)
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    final_priority: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    status: Optional[ComplaintStatus] = None
    priority: Optional[ComplaintPriority] = None
    final_priority: Optional[str] = None
    assigned_to: Optional[int] = None
    description: Optional[str] = None
    severity: Optional[ComplaintSeverity] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None
    set_pc_working: Optional[bool] = None


class ComplaintResponse(BaseModel):
    id: int
    complaint_code: str
    submitted_by: int
    pc_id: Optional[int] = None
    lab_id: Optional[int] = None
    complaint_type: str
    severity: ComplaintSeverity
    description: str
    status: ComplaintStatus
    priority: ComplaintPriority

    # Phase 5C AI Priority fields
    ai_predicted_priority: Optional[str] = None
    final_priority: Optional[str] = None
    ai_prediction_reason: Optional[str] = None
    ai_confidence: Optional[float] = None

    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    submitter: Optional[SubmitterInfo] = None
    assignee: Optional[AssigneeInfo] = None
    pc: Optional[ComplaintPCInfo] = None
    lab: Optional[ComplaintLabInfo] = None

    class Config:
        from_attributes = True


class ComplaintListResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ComplaintStatsResponse(BaseModel):
    total: int
    open: int
    assigned: int
    in_progress: int
    resolved: int
    closed: int
    by_severity: dict[str, int]
    by_type: dict[str, int]


# Phase 5C: AI Prediction Request & Response schemas
class PredictPriorityRequest(BaseModel):
    description: str = Field(..., min_length=3, description="Complaint description text")
    complaint_type: str = Field(default="Other", description="Category of the complaint")
    severity: str = Field(default="medium", description="Reported severity (low, medium, high)")


class PredictPriorityResponse(BaseModel):
    predicted_priority: str
    confidence: float
    probabilities: dict[str, float]
    detected_terms: list[str]
    reason: str
    model_accuracy: float
    classes: list[str]


class ComplaintAIModelStatsResponse(BaseModel):
    accuracy: float
    trained_at: str
    total_samples: int
    test_samples: int
    labels: list[str]
    confusion_matrix: list[list[int]]
    top_features: list[dict]
    classification_report: dict
