"""
Phase 5C — Train Complaint Priority Prediction Model using TF-IDF + Decision Tree.

Features:
1. description: Processed via sklearn.feature_extraction.text.TfidfVectorizer
2. complaint_type: One-Hot Encoded
3. severity: Ordinal mapped (low=1, medium=2, high=3)

Target:
- priority: 'low', 'medium', 'high'

Evaluates and logs:
- Accuracy
- Classification Report
- Confusion Matrix
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from scipy.sparse import hstack, csr_matrix
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "complaints_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

SEVERITY_MAP = {
    "low": 1.0,
    "medium": 2.0,
    "high": 3.0,
}

KNOWN_COMPLAINT_TYPES = [
    "Computer not starting",
    "Slow computer",
    "Network issue",
    "Software issue",
    "Keyboard issue",
    "Mouse issue",
    "Monitor issue",
    "Other",
]


def load_and_preprocess_data(csv_path: str):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Run generate_complaints_dataset.py first.")

    df = pd.read_csv(csv_path)

    # 1. Validation & Missing Value Handling
    df["description"] = df["description"].fillna("").astype(str).str.strip()
    df["complaint_type"] = df["complaint_type"].fillna("Other").astype(str)
    df["severity"] = df["severity"].fillna("medium").astype(str).str.lower()
    df["priority"] = df["priority"].fillna("medium").astype(str).str.lower()

    # Filter out empty descriptions
    df = df[df["description"].str.len() > 3].reset_index(drop=True)

    # Encode severity ordinally
    df["severity_num"] = df["severity"].map(lambda s: SEVERITY_MAP.get(s, 2.0))

    return df


def train_model():
    print("=" * 65)
    print(" Phase 5C: Training Complaint Priority AI Model ")
    print(" Architecture: TF-IDF Text Vectorizer + Decision Tree ")
    print("=" * 65)

    df = load_and_preprocess_data(DATA_PATH)
    print(f"\nLoaded {len(df)} complaint samples from {DATA_PATH}")

    # Train / Test split (80% train, 20% test) with stratified sampling on priority
    X_train_df, X_test_df, y_train, y_test = train_test_split(
        df,
        df["priority"],
        test_size=0.20,
        random_state=42,
        stratify=df["priority"]
    )

    print(f"Training set size: {len(X_train_df)} | Test set size: {len(X_test_df)}")

    # 1. TF-IDF Vectorization for Complaint Descriptions
    tfidf = TfidfVectorizer(
        max_features=200,
        stop_words="english",
        ngram_range=(1, 2),
        lowercase=True,
        sublinear_tf=True
    )
    X_train_tfidf = tfidf.fit_transform(X_train_df["description"])
    X_test_tfidf = tfidf.transform(X_test_df["description"])

    # 2. One-Hot Encoding for Complaint Type
    ohe = OneHotEncoder(categories=[KNOWN_COMPLAINT_TYPES], handle_unknown="ignore", sparse_output=True)
    X_train_type = ohe.fit_transform(X_train_df[["complaint_type"]])
    X_test_type = ohe.transform(X_test_df[["complaint_type"]])

    # 3. Severity numeric feature as sparse matrix
    X_train_sev = csr_matrix(X_train_df[["severity_num"]].values)
    X_test_sev = csr_matrix(X_test_df[["severity_num"]].values)

    # 4. Combine all features: TF-IDF + Type + Severity
    X_train_combined = hstack([X_train_tfidf, X_train_type, X_train_sev]).tocsr()
    X_test_combined = hstack([X_test_tfidf, X_test_type, X_test_sev]).tocsr()

    # Feature names for explainability
    tfidf_feature_names = [f"word:{f}" for f in tfidf.get_feature_names_out()]
    type_feature_names = [f"type:{t}" for t in KNOWN_COMPLAINT_TYPES]
    all_feature_names = tfidf_feature_names + type_feature_names + ["meta:severity"]

    print(f"Combined feature space dimensions: {X_train_combined.shape[1]} features")

    # 5. Train Decision Tree Classifier
    dt_model = DecisionTreeClassifier(
        criterion="gini",
        max_depth=9,
        min_samples_split=3,
        min_samples_leaf=2,
        random_state=42
    )
    dt_model.fit(X_train_combined, y_train)

    # 6. Model Evaluation on Test Holdout
    y_pred = dt_model.predict(X_test_combined)
    accuracy = accuracy_score(y_test, y_pred)
    report_dict = classification_report(y_test, y_pred, output_dict=True)
    report_text = classification_report(y_test, y_pred)
    labels = sorted(list(dt_model.classes_))  # ['high', 'low', 'medium']
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    print("\n" + "-" * 40)
    print(f"MODEL ACCURACY: {accuracy * 100:.2f}%")
    print("-" * 40)
    print("\nCLASSIFICATION REPORT:")
    print(report_text)
    print("-" * 40)
    print(f"CONFUSION MATRIX (Labels: {labels}):")
    print(cm)
    print("-" * 40)

    # 7. Extract Top Decision Tree Feature Importances
    importances = dt_model.feature_importances_
    top_indices = np.argsort(importances)[::-1][:20]
    top_features = [
        {"feature": all_feature_names[i], "importance": round(float(importances[i]), 4)}
        for i in top_indices if importances[i] > 0.005
    ]

    print("\nTop Most Influential Features in Decision Tree:")
    for rank, item in enumerate(top_features[:10], 1):
        print(f"  {rank}. {item['feature']:<25} (Importance: {item['importance']:.4f})")

    # 8. Save Artifacts
    model_file = os.path.join(MODELS_DIR, "complaint_dt_model.joblib")
    tfidf_file = os.path.join(MODELS_DIR, "complaint_tfidf.joblib")
    ohe_file = os.path.join(MODELS_DIR, "complaint_ohe.joblib")
    meta_file = os.path.join(MODELS_DIR, "complaint_metadata.joblib")

    joblib.dump(dt_model, model_file)
    joblib.dump(tfidf, tfidf_file)
    joblib.dump(ohe, ohe_file)

    now_iso = datetime.now().isoformat()
    metadata = {
        "classes": labels,
        "accuracy": round(float(accuracy), 4),
        "classification_report": report_dict,
        "classification_report_text": report_text,
        "confusion_matrix": cm.tolist(),
        "labels": labels,
        "top_features": top_features,
        "all_feature_names": all_feature_names,
        "known_types": KNOWN_COMPLAINT_TYPES,
        "severity_map": SEVERITY_MAP,
        "trained_at": now_iso,
        "total_samples": len(df),
        "test_samples": len(X_test_df),
    }
    joblib.dump(metadata, meta_file)

    print(f"\nAll artifacts successfully saved to {MODELS_DIR}")
    return accuracy, metadata


if __name__ == "__main__":
    train_model()
