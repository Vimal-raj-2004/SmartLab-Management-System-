"""
Train a KMeans Clustering Model (K=3) for AI Lab Utilization Analysis.
Phase 5B — AI-Based Smart Computer Laboratory Management and Asset Monitoring System
"""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score


FEATURES = ['number_of_students', 'pcs_used', 'session_duration_minutes']


def train_kmeans_model(data_path: str = None):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    if data_path is None:
        data_path = os.path.join(current_dir, 'data', 'synthetic_lab_usage.csv')

    # 1. Load Data
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Generating synthetic dataset first...")
        from ml.generate_lab_usage_data import generate_synthetic_lab_usage
        generate_synthetic_lab_usage(output_path=data_path)

    df = pd.read_csv(data_path)
    print(f"[DATA] Loaded {len(df)} records from {data_path}")

    # 2. Validate Data and Handle Missing Values
    print("[PREPROCESSING] Validating data and checking for missing values...")
    missing_count = df[FEATURES].isnull().sum().sum()
    if missing_count > 0:
        print(f"[PREPROCESSING] Found {missing_count} missing values. Imputing with median.")
        df[FEATURES] = df[FEATURES].fillna(df[FEATURES].median())
    else:
        print("[PREPROCESSING] No missing values found. Data is complete and clean.")

    # Remove non-positive or corrupted rows
    valid_mask = (df['number_of_students'] > 0) & (df['pcs_used'] > 0) & (df['session_duration_minutes'] > 0)
    df = df[valid_mask].copy()

    X = df[FEATURES].values

    # 3. Feature Scaling (Standardization)
    # Features have vastly different scales:
    # - number_of_students (5-65)
    # - pcs_used (5-65)
    # - session_duration_minutes (30-240)
    # StandardScaler ensures equal geometric weighting during Euclidean distance calculations.
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    print(f"[SCALING] Standardized {X.shape[1]} features (mean=0, std=1).")

    # 4. Fit KMeans with K=3
    k = 3
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
    cluster_labels = kmeans.fit_predict(X_scaled)

    # Calculate clustering quality metric
    sil_score = silhouette_score(X_scaled, cluster_labels)
    inertia = kmeans.inertia_
    print(f"[K-MEANS] Fitted 3 clusters. Inertia: {inertia:.2f}, Silhouette Score: {sil_score:.3f}")

    # 5. Objective Cluster Interpretation (Converting Cluster IDs to Low, Medium, High)
    # K-Means returns arbitrary indices (0, 1, 2).
    # We examine the unscaled cluster centers to determine true operational utilization:
    unscaled_centers = scaler.inverse_transform(kmeans.cluster_centers_)
    
    # Calculate composite intensity score based on relative resource usage across all 3 features:
    feature_means = X.mean(axis=0)
    intensity_scores = []
    for idx, center in enumerate(unscaled_centers):
        # Ratio of centroid values relative to dataset averages
        intensity = (
            (center[0] / feature_means[0]) +
            (center[1] / feature_means[1]) +
            (center[2] / feature_means[2])
        )
        intensity_scores.append((idx, intensity, center))

    # Sort cluster indices by intensity score ascending:
    # Rank 0 (lowest)  -> Low
    # Rank 1 (middle)  -> Medium
    # Rank 2 (highest) -> High
    sorted_by_intensity = sorted(intensity_scores, key=lambda item: item[1])
    
    level_names = ['Low', 'Medium', 'High']
    cluster_to_level = {}
    level_to_cluster = {}
    cluster_stats = {}

    for rank, (cluster_idx, intensity, center) in enumerate(sorted_by_intensity):
        level = level_names[rank]
        cluster_to_level[int(cluster_idx)] = level
        level_to_cluster[level] = int(cluster_idx)

        count = int((cluster_labels == cluster_idx).sum())
        pct = round(float(count / len(cluster_labels) * 100), 1)

        cluster_stats[level] = {
            'cluster_id': int(cluster_idx),
            'level': level,
            'students_mean': round(float(center[0]), 1),
            'pcs_mean': round(float(center[1]), 1),
            'duration_mean': round(float(center[2]), 1),
            'intensity_score': round(float(intensity), 2),
            'count': count,
            'percentage': pct,
            'description': (
                f"{level} Utilization: Average {round(center[0])} students, "
                f"{round(center[1])} PCs, {round(center[2])} mins session"
            )
        }

    print("\n==================================================")
    print("K-MEANS CLUSTER INTERPRETATION & CENTROID SUMMARY")
    print("==================================================")
    for level in level_names:
        stats = cluster_stats[level]
        print(f"[{level.upper()}] Cluster ID: {stats['cluster_id']} | "
              f"Students: {stats['students_mean']}, PCs: {stats['pcs_mean']}, "
              f"Duration: {stats['duration_mean']} min | Sessions: {stats['count']} ({stats['percentage']}%)")
    print("==================================================")

    # 6. Save Model Artifacts
    models_dir = os.path.join(current_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    model_file = os.path.join(models_dir, 'kmeans_model.joblib')
    scaler_file = os.path.join(models_dir, 'kmeans_scaler.joblib')
    metadata_file = os.path.join(models_dir, 'kmeans_metadata.joblib')

    metadata = {
        'features': FEATURES,
        'cluster_to_level': cluster_to_level,
        'level_to_cluster': level_to_cluster,
        'cluster_stats': cluster_stats,
        'unscaled_centers': unscaled_centers.tolist(),
        'silhouette_score': float(sil_score),
        'inertia': float(inertia),
    }

    joblib.dump(kmeans, model_file)
    joblib.dump(scaler, scaler_file)
    joblib.dump(metadata, metadata_file)

    print(f"\n[SAVED] KMeans model saved to: {model_file}")
    print(f"[SAVED] Scaler saved to: {scaler_file}")
    print(f"[SAVED] Metadata saved to: {metadata_file}")
    return metadata


if __name__ == "__main__":
    train_kmeans_model()
