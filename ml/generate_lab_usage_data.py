"""
Generate synthetic lab usage historical data for K-Means clustering.
AI-Based Smart Computer Laboratory Management and Asset Monitoring System — Phase 5B
"""

import os
import numpy as np
import pandas as pd


def generate_synthetic_lab_usage(n_samples: int = 600, output_path: str = None) -> pd.DataFrame:
    np.random.seed(42)

    if output_path is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(current_dir, 'data', 'synthetic_lab_usage.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 1. Low Utilization Sessions (~35% of total):
    # Short duration (30-60 min), small group (5-18 students, 5-18 PCs)
    n_low = int(n_samples * 0.35)
    low_students = np.random.normal(loc=12, scale=3, size=n_low).clip(5, 18).astype(int)
    low_pcs = np.clip(low_students - np.random.randint(0, 3, size=n_low), 5, 18)
    low_duration = np.random.normal(loc=45, scale=8, size=n_low).clip(30, 60).astype(int)

    # 2. Medium Utilization Sessions (~45% of total):
    # Regular lab classes, tutorials (60-120 min, 20-36 students, 20-36 PCs)
    n_med = int(n_samples * 0.45)
    med_students = np.random.normal(loc=28, scale=4, size=n_med).clip(20, 38).astype(int)
    med_pcs = np.clip(med_students - np.random.randint(0, 3, size=n_med), 18, 38)
    med_duration = np.random.normal(loc=95, scale=15, size=n_med).clip(60, 130).astype(int)

    # 3. High Utilization Sessions (~20% of total):
    # Full practical exams, workshops, hackathons (140-240 min, 40-65 students, 40-65 PCs)
    n_high = n_samples - n_low - n_med
    high_students = np.random.normal(loc=50, scale=6, size=n_high).clip(40, 65).astype(int)
    high_pcs = np.clip(high_students - np.random.randint(0, 3, size=n_high), 38, 65)
    high_duration = np.random.normal(loc=180, scale=20, size=n_high).clip(140, 240).astype(int)

    students = np.concatenate([low_students, med_students, high_students])
    pcs = np.concatenate([low_pcs, med_pcs, high_pcs])
    durations = np.concatenate([low_duration, med_duration, high_duration])

    # Shuffle records
    indices = np.arange(len(students))
    np.random.shuffle(indices)

    # Realistic lab IDs (1 to 5)
    lab_ids = np.random.choice([1, 2, 3, 4, 5], size=len(students))

    # Dates spanning the past 6 months
    base_date = pd.Timestamp.now() - pd.Timedelta(days=180)
    random_days = np.random.randint(0, 180, size=len(students))
    session_dates = [base_date + pd.Timedelta(days=int(d)) for d in random_days]

    df = pd.DataFrame({
        'lab_id': lab_ids[indices],
        'number_of_students': students[indices],
        'pcs_used': pcs[indices],
        'session_duration_minutes': durations[indices],
        'session_date': [d.strftime('%Y-%m-%d') for d in np.array(session_dates)[indices]],
    })

    df.to_csv(output_path, index=False)
    print(f"[OK] Generated {len(df)} synthetic lab usage records at: {output_path}")
    return df


if __name__ == "__main__":
    generate_synthetic_lab_usage()
