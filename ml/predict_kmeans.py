"""
Prediction module for AI Lab Utilization Analysis using K-Means.
Phase 5B — AI-Based Smart Computer Laboratory Management and Asset Monitoring System
"""

import os
import joblib
import numpy as np


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(CURRENT_DIR, 'models', 'kmeans_model.joblib')
SCALER_FILE = os.path.join(CURRENT_DIR, 'models', 'kmeans_scaler.joblib')
METADATA_FILE = os.path.join(CURRENT_DIR, 'models', 'kmeans_metadata.joblib')

_kmeans = None
_scaler = None
_metadata = None


def load_kmeans_artifacts():
    global _kmeans, _scaler, _metadata
    if _kmeans is None or _scaler is None or _metadata is None:
        if not (os.path.exists(MODEL_FILE) and os.path.exists(SCALER_FILE) and os.path.exists(METADATA_FILE)):
            from ml.train_kmeans import train_kmeans_model
            _metadata = train_kmeans_model()
            _kmeans = joblib.load(MODEL_FILE)
            _scaler = joblib.load(SCALER_FILE)
        else:
            _kmeans = joblib.load(MODEL_FILE)
            _scaler = joblib.load(SCALER_FILE)
            _metadata = joblib.load(METADATA_FILE)
    return _kmeans, _scaler, _metadata


def predict_utilization(number_of_students: int, pcs_used: int, session_duration_minutes: int):
    """
    Classifies a lab session into Low, Medium, or High utilization.

    Steps:
    1. Standardizes [number_of_students, pcs_used, session_duration_minutes] using fitted StandardScaler.
    2. Uses K-Means to identify the nearest cluster centroid in geometric space.
    3. Maps cluster index to semantic level (Low / Medium / High) via learned centroid ranking.
    4. Computes distance to centroid and confidence score.
    """
    kmeans, scaler, metadata = load_kmeans_artifacts()

    # Feature vector
    features = np.array([[number_of_students, pcs_used, session_duration_minutes]], dtype=float)

    # 1. Standardize using fitted scaler
    features_scaled = scaler.transform(features)

    # 2. Predict cluster
    cluster_id = int(kmeans.predict(features_scaled)[0])

    # 3. Calculate distance to each cluster center
    distances = np.linalg.norm(kmeans.cluster_centers_ - features_scaled, axis=1)
    distance_to_center = float(distances[cluster_id])

    # Calculate confidence as inverse relative distance (softmax-like or proximity)
    inv_distances = 1.0 / (distances + 1e-5)
    confidence = float(inv_distances[cluster_id] / np.sum(inv_distances))

    # 4. Map to semantic level
    cluster_to_level = metadata.get('cluster_to_level', {0: 'Low', 1: 'Medium', 2: 'High'})
    utilization_level = cluster_to_level.get(cluster_id, 'Medium')
    cluster_stats = metadata.get('cluster_stats', {}).get(utilization_level, {})

    # 5. Explanatory context
    explanation = (
        f"Session classified as {utilization_level} Utilization (Cluster #{cluster_id}). "
        f"Characteristics: {number_of_students} students and {pcs_used} PCs across {session_duration_minutes} minutes "
        f"aligns closely with the {utilization_level.lower()} cluster centroid "
        f"(averaging ~{cluster_stats.get('students_mean', '-')} students and ~{cluster_stats.get('duration_mean', '-')} mins)."
    )

    return {
        'cluster_id': cluster_id,
        'utilization_level': utilization_level,
        'confidence': round(confidence, 4),
        'distance_to_center': round(distance_to_center, 4),
        'explanation': explanation,
        'cluster_characteristics': cluster_stats,
    }


if __name__ == "__main__":
    test_cases = [
        {"number_of_students": 10, "pcs_used": 10, "session_duration_minutes": 40},
        {"number_of_students": 28, "pcs_used": 26, "session_duration_minutes": 90},
        {"number_of_students": 55, "pcs_used": 52, "session_duration_minutes": 180},
    ]

    print("\nRunning K-Means Utilization Test Cases:")
    for tc in test_cases:
        res = predict_utilization(**tc)
        print(f"\nInput: {tc}")
        print(f" -> Level: {res['utilization_level']} (Cluster {res['cluster_id']})")
        print(f" -> Confidence: {res['confidence'] * 100:.1f}%, Distance: {res['distance_to_center']}")
        print(f" -> {res['explanation']}")
