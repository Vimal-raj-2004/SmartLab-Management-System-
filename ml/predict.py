"""
A prediction utility module.
"""

import joblib
import os
import numpy as np
import pandas as pd

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, 'models', 'pc_health_model.joblib')
le_path = os.path.join(current_dir, 'models', 'label_encoder.joblib')

model = None
le = None

def load_model():
    global model, le
    if model is None or le is None:
        if os.path.exists(model_path) and os.path.exists(le_path):
            model = joblib.load(model_path)
            le = joblib.load(le_path)
        else:
            raise FileNotFoundError("Model files not found. Train the model first.")

def predict_health(cpu_usage, ram_usage, disk_usage, error_count):
    load_model()
    
    features = pd.DataFrame(
        [[cpu_usage, ram_usage, disk_usage, error_count]],
        columns=['cpu_usage', 'ram_usage', 'disk_usage', 'error_count']
    )
    probs = model.predict_proba(features)[0]
    
    pred_idx = np.argmax(probs)
    health_prediction = le.classes_[pred_idx]
    confidence = float(probs[pred_idx])
    
    all_probabilities = {le.classes_[i]: float(probs[i]) for i in range(len(le.classes_))}
    
    possible_issue = 'Normal performance'
    if health_prediction in ['Warning', 'Critical']:
        issues = []
        if cpu_usage > 80:
            issues.append('High CPU usage')
        if ram_usage > 80:
            issues.append('High memory usage')
        if disk_usage > 85:
            issues.append('High disk utilization')
        if error_count > 5:
            issues.append('High number of system errors')
            
        if issues:
            possible_issue = ", ".join(issues)
        else:
            possible_issue = 'Abnormal performance detected'
            
    return {
        "health_prediction": health_prediction,
        "confidence": confidence,
        "all_probabilities": all_probabilities,
        "possible_issue": possible_issue
    }
