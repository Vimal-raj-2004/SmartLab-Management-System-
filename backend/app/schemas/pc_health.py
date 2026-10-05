from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PCHealthCreate(BaseModel):
    pc_id: str = Field(..., min_length=1, max_length=50, description="PC identifier, e.g. LAB1-PC-01")
    cpu_usage: float = Field(..., ge=0, le=100, description="CPU usage percentage")
    ram_usage: float = Field(..., ge=0, le=100, description="RAM usage percentage")
    disk_usage: float = Field(..., ge=0, le=100, description="Disk usage percentage")
    error_count: int = Field(default=0, ge=0, description="Number of system errors")

    model_config = {"extra": "ignore"}

class PCHealthResponse(BaseModel):
    id: int
    pc_id: str
    cpu_usage: float
    ram_usage: float
    disk_usage: float
    error_count: int
    recorded_at: datetime
    health_prediction: Optional[str] = None
    confidence: Optional[float] = None
    possible_issue: Optional[str] = None
    computer_name: Optional[str] = None
    processor: Optional[str] = None

    class Config:
        from_attributes = True

class PCHealthPredictionRequest(BaseModel):
    cpu_usage: float = Field(..., ge=0, le=100)
    ram_usage: float = Field(..., ge=0, le=100)
    disk_usage: float = Field(..., ge=0, le=100)
    error_count: int = Field(default=0, ge=0)

class PCHealthPredictionResponse(BaseModel):
    health_prediction: str
    confidence: float
    possible_issue: str
    probabilities: dict
