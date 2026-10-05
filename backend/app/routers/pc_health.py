from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
import sys
import joblib
import numpy as np
import pandas as pd

from app.database import get_db
from app.models.pc_health import PCHealthLog
from app.models.pc import PC
from app.schemas.pc_health import PCHealthCreate, PCHealthResponse, PCHealthPredictionRequest, PCHealthPredictionResponse

router = APIRouter(prefix="/pc-health", tags=["PC Health"])

# Add project root to path for ml module access
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_PATH = os.path.join(PROJECT_ROOT, "ml", "models", "pc_health_model.joblib")
ENCODER_PATH = os.path.join(PROJECT_ROOT, "ml", "models", "label_encoder.joblib")

# Load model at module level (once)
model = None
label_encoder = None

def load_model():
    global model, label_encoder
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
            model = joblib.load(MODEL_PATH)
            label_encoder = joblib.load(ENCODER_PATH)
            print("[ML] PC Health Random Forest model loaded successfully")
            return True
        else:
            print(f"[ML WARNING] PC Health model file not found at {MODEL_PATH}")
            return False
    except Exception as e:
        print(f"[ML ERROR] Error loading model: {e}")
        return False

def predict_health(cpu_usage, ram_usage, disk_usage, error_count):
    global model, label_encoder
    if model is None or label_encoder is None:
        load_model()

    # Determine possible issue (do NOT claim exact hardware failure)
    issues = []
    if cpu_usage > 80:
        issues.append("High CPU usage")
    if ram_usage > 80:
        issues.append("High memory usage")
    if disk_usage > 85:
        issues.append("High disk utilization")
    if error_count > 5:
        issues.append("High number of system errors")

    if model is None or label_encoder is None:
        # Graceful rule-based heuristic when model hasn't been trained yet
        if cpu_usage > 85 or ram_usage > 85 or disk_usage > 90 or error_count > 10:
            health_label = "Critical"
            confidence = 0.85
        elif cpu_usage > 60 or ram_usage > 60 or disk_usage > 70 or error_count > 2:
            health_label = "Warning"
            confidence = 0.75
        else:
            health_label = "Healthy"
            confidence = 0.90
        
        possible_issue = "Normal performance" if health_label == "Healthy" else ("; ".join(issues) if issues else "Abnormal performance detected")
        return {
            "health_prediction": health_label,
            "confidence": confidence,
            "possible_issue": possible_issue,
            "probabilities": {health_label: confidence}
        }
    
    features = pd.DataFrame(
        [[cpu_usage, ram_usage, disk_usage, error_count]],
        columns=['cpu_usage', 'ram_usage', 'disk_usage', 'error_count']
    )
    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]
    
    health_label = label_encoder.inverse_transform([prediction])[0]
    confidence = float(max(probabilities))
    
    class_names = label_encoder.classes_
    prob_dict = {class_names[i]: round(float(probabilities[i]), 4) for i in range(len(class_names))}
    
    # Determine possible issue (do NOT claim exact hardware failure)
    issues = []
    if cpu_usage > 80:
        issues.append("High CPU usage")
    if ram_usage > 80:
        issues.append("High memory usage")
    if disk_usage > 85:
        issues.append("High disk utilization")
    if error_count > 5:
        issues.append("High number of system errors")
    
    if health_label == "Healthy":
        possible_issue = "Normal performance"
    elif issues:
        possible_issue = "; ".join(issues)
    else:
        possible_issue = "Abnormal performance detected"
    
    return {
        "health_prediction": health_label,
        "confidence": confidence,
        "possible_issue": possible_issue,
        "probabilities": prob_dict
    }

load_model()

@router.post("", response_model=PCHealthResponse)
def create_health_log(health_data: PCHealthCreate, db: Session = Depends(get_db)):
    prediction_data = predict_health(
        health_data.cpu_usage,
        health_data.ram_usage,
        health_data.disk_usage,
        health_data.error_count
    )
    
    db_log = PCHealthLog(
        pc_id=health_data.pc_id,
        cpu_usage=health_data.cpu_usage,
        ram_usage=health_data.ram_usage,
        disk_usage=health_data.disk_usage,
        error_count=health_data.error_count
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    response = PCHealthResponse.model_validate(db_log)
    response.health_prediction = prediction_data["health_prediction"]
    response.confidence = prediction_data["confidence"]
    response.possible_issue = prediction_data["possible_issue"]
    
    pc_record = db.query(PC).filter(PC.pc_code == health_data.pc_id).first()
    if pc_record:
        response.computer_name = pc_record.computer_name
        response.processor = pc_record.processor
    
    return response

@router.post("/predict", response_model=PCHealthPredictionResponse)
def predict_health_standalone(data: PCHealthPredictionRequest):
    prediction_data = predict_health(
        data.cpu_usage,
        data.ram_usage,
        data.disk_usage,
        data.error_count
    )
    return PCHealthPredictionResponse(**prediction_data)

@router.get("/latest", response_model=List[PCHealthResponse])
def get_latest_health(db: Session = Depends(get_db)):
    subquery = db.query(
        PCHealthLog.pc_id,
        func.max(PCHealthLog.recorded_at).label("latest_record")
    ).group_by(PCHealthLog.pc_id).subquery()
    
    latest_logs = db.query(PCHealthLog).join(
        subquery,
        (PCHealthLog.pc_id == subquery.c.pc_id) & (PCHealthLog.recorded_at == subquery.c.latest_record)
    ).all()
    
    pc_map = {p.pc_code: p for p in db.query(PC).all()}

    results = []
    for log in latest_logs:
        prediction_data = predict_health(log.cpu_usage, log.ram_usage, log.disk_usage, log.error_count)
        response = PCHealthResponse.model_validate(log)
        response.health_prediction = prediction_data["health_prediction"]
        response.confidence = prediction_data["confidence"]
        response.possible_issue = prediction_data["possible_issue"]
        if log.pc_id in pc_map:
            response.computer_name = pc_map[log.pc_id].computer_name
            response.processor = pc_map[log.pc_id].processor
        results.append(response)
        
    return results

@router.get("/history/{pc_id}", response_model=List[PCHealthResponse])
def get_health_history(pc_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(PCHealthLog).filter(PCHealthLog.pc_id == pc_id).order_by(PCHealthLog.recorded_at.desc()).offset(skip).limit(limit).all()
    
    pc_record = db.query(PC).filter(PC.pc_code == pc_id).first()

    results = []
    for log in logs:
        prediction_data = predict_health(log.cpu_usage, log.ram_usage, log.disk_usage, log.error_count)
        response = PCHealthResponse.model_validate(log)
        response.health_prediction = prediction_data["health_prediction"]
        response.confidence = prediction_data["confidence"]
        response.possible_issue = prediction_data["possible_issue"]
        if pc_record:
            response.computer_name = pc_record.computer_name
            response.processor = pc_record.processor
        results.append(response)
        
    return results
