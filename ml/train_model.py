"""
Train a RandomForestClassifier using the synthetic PC health data.
"""

import pandas as pd
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

def train_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, 'data', 'synthetic_pc_health.csv')
    
    if not os.path.exists(data_path):
        print(f"Data file not found at: {data_path}")
        print("Generating synthetic data first...")
        from ml.generate_synthetic_data import generate_synthetic_data
        generate_synthetic_data()

    df = pd.read_csv(data_path)
    
    X = df[['cpu_usage', 'ram_usage', 'disk_usage', 'error_count']]
    y = df['health_status']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    
    print("\n==================================================")
    print("RANDOM FOREST PC HEALTH MODEL EVALUATION")
    print("==================================================")
    print("Accuracy Score:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=le.classes_))
    print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
    print("==================================================")
    
    # Save model and encoder
    models_dir = os.path.join(current_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    model_file = os.path.join(models_dir, 'pc_health_model.joblib')
    encoder_file = os.path.join(models_dir, 'label_encoder.joblib')
    
    joblib.dump(clf, model_file)
    joblib.dump(le, encoder_file)
    print(f"\nModel saved to: {model_file}")
    print(f"Label encoder saved to: {encoder_file}")

if __name__ == "__main__":
    train_model()
