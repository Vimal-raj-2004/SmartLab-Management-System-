"""This script generates SYNTHETIC (simulated) training data for the PC Health prediction model. The data is NOT collected from real computers. It is artificially generated to train a RandomForestClassifier."""

import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_healthy=500, num_warning=300, num_critical=200):
    np.random.seed(42)
    
    data = []
    
    # Healthy PCs
    for _ in range(num_healthy):
        cpu = np.random.uniform(5, 60)
        ram = np.random.uniform(10, 60)
        disk = np.random.uniform(10, 70)
        errors = np.random.randint(0, 3)
        
        # Add some noise
        if np.random.rand() > 0.9:
            cpu = np.random.uniform(60, 80)
            
        data.append([cpu, ram, disk, errors, 'Healthy'])
        
    # Warning PCs
    for _ in range(num_warning):
        cpu = np.random.uniform(60, 85)
        ram = np.random.uniform(60, 85)
        disk = np.random.uniform(70, 90)
        errors = np.random.randint(2, 11)
        
        # Add some noise
        if np.random.rand() > 0.8:
            cpu = np.random.uniform(10, 40)
            
        data.append([cpu, ram, disk, errors, 'Warning'])
        
    # Critical PCs
    for _ in range(num_critical):
        cpu = np.random.uniform(85, 100)
        ram = np.random.uniform(85, 100)
        disk = np.random.uniform(90, 100)
        errors = np.random.randint(10, 51)
        
        data.append([cpu, ram, disk, errors, 'Critical'])
        
    df = pd.DataFrame(data, columns=['cpu_usage', 'ram_usage', 'disk_usage', 'error_count', 'health_status'])
    
    # Shuffle
    df = df.sample(frac=1).reset_index(drop=True)
    
    # Ensure directory exists relative to this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    file_path = os.path.join(data_dir, 'synthetic_pc_health.csv')
    df.to_csv(file_path, index=False)
    
    print("==================================================")
    print("SYNTHETIC PC HEALTH DATASET GENERATION")
    print("NOTE: This data is generated programmatically for")
    print("machine learning experimentation and simulation.")
    print("It is NOT real hardware failure telemetry.")
    print("==================================================")
    print("\nSummary Statistics:")
    print(df.describe())
    print("\nClass Distribution:")
    print(df['health_status'].value_counts())
    print(f"\nSaved synthetic dataset to: {file_path}")

if __name__ == "__main__":
    generate_synthetic_data()
