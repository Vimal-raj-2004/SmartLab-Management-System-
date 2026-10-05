"""
Prediction function for Complaint Priority using TF-IDF + Decision Tree (Phase 5C).
"""

import os
import joblib
import numpy as np
from scipy.sparse import hstack, csr_matrix
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

_MODEL = None
_TFIDF = None
_OHE = None
_METADATA = None


def load_complaint_priority_artifacts():
    global _MODEL, _TFIDF, _OHE, _METADATA
    if _MODEL is None:
        model_path = os.path.join(MODELS_DIR, "complaint_dt_model.joblib")
        tfidf_path = os.path.join(MODELS_DIR, "complaint_tfidf.joblib")
        ohe_path = os.path.join(MODELS_DIR, "complaint_ohe.joblib")
        meta_path = os.path.join(MODELS_DIR, "complaint_metadata.joblib")

        if not os.path.exists(model_path) or not os.path.exists(tfidf_path):
            raise FileNotFoundError("Trained complaint model artifacts not found. Run train_complaint_priority.py first.")

        _MODEL = joblib.load(model_path)
        _TFIDF = joblib.load(tfidf_path)
        _OHE = joblib.load(ohe_path)
        _METADATA = joblib.load(meta_path)

    return _MODEL, _TFIDF, _OHE, _METADATA


def predict_complaint_priority(
    description: str,
    complaint_type: str,
    severity: str,
) -> Dict[str, Any]:
    """
    Predicts priority ('low', 'medium', 'high') for a complaint based on:
    1. TF-IDF representation of the description text
    2. One-hot encoded complaint type
    3. Numerically mapped severity level
    """
    model, tfidf, ohe, meta = load_complaint_priority_artifacts()

    # 1. Clean and normalize inputs
    clean_desc = (description or "").strip().lower()
    clean_type = (complaint_type or "Other").strip()
    clean_sev = (severity or "medium").strip().lower()
    if clean_sev not in meta["severity_map"]:
        clean_sev = "medium"

    sev_num = meta["severity_map"].get(clean_sev, 2.0)

    # 2. Extract TF-IDF features
    tfidf_vec = tfidf.transform([clean_desc])

    # Find which vocabulary words actually appeared in this description
    feature_names = tfidf.get_feature_names_out()
    nonzero_indices = tfidf_vec.nonzero()[1]
    detected_words = []
    for idx in nonzero_indices:
        score = tfidf_vec[0, idx]
        detected_words.append((feature_names[idx], float(score)))
    # Sort detected words by TF-IDF weight descending
    detected_words.sort(key=lambda x: x[1], reverse=True)
    top_detected_terms = [w[0] for w in detected_words[:5]]

    # 3. Transform structured features
    import pandas as pd
    type_df = pd.DataFrame([{"complaint_type": clean_type}])
    type_vec = ohe.transform(type_df)
    sev_vec = csr_matrix([[sev_num]])

    # 4. Combine into complete feature vector
    X_input = hstack([tfidf_vec, type_vec, sev_vec]).tocsr()

    # 5. Predict using Decision Tree
    predicted_label = str(model.predict(X_input)[0]).lower()
    probabilities = model.predict_proba(X_input)[0]
    classes = [c.lower() for c in model.classes_]

    prob_dict = {
        cls: round(float(prob), 4)
        for cls, prob in zip(classes, probabilities)
    }
    confidence = prob_dict.get(predicted_label, round(float(max(probabilities)), 4))

    # 6. Generate an objective, transparent explanation
    # Clarify that this is based on statistical keyword frequencies and decision rules, not human LLM reasoning
    terms_phrase = (
        f"Key terms detected: [{', '.join(top_detected_terms)}]"
        if top_detected_terms
        else "No specific domain keywords detected in text"
    )

    reason = (
        f"AI Decision Tree predicted {predicted_label.upper()} priority with {confidence * 100:.1f}% confidence. "
        f"Evaluation factors: {terms_phrase}, reported severity='{clean_sev}', type='{clean_type}'. "
        f"(Statistical TF-IDF keyword weighting & Decision Tree rules)."
    )

    return {
        "predicted_priority": predicted_label,
        "confidence": confidence,
        "probabilities": prob_dict,
        "detected_terms": top_detected_terms,
        "reason": reason,
        "model_accuracy": meta.get("accuracy", 0.0),
        "classes": classes,
    }


if __name__ == "__main__":
    test_cases = [
        {
            "description": "The computer is completely dead and smoke was seen coming from the power supply.",
            "complaint_type": "Computer not starting",
            "severity": "high",
        },
        {
            "description": "Student reports slight delay opening file explorer, but software works fine.",
            "complaint_type": "Slow computer",
            "severity": "low",
        },
        {
            "description": "Mouse left click button is stuck down, making it hard to double click.",
            "complaint_type": "Mouse issue",
            "severity": "medium",
        },
        {
            "description": "Sparks and fire seen inside CPU casing! Entire lab section power tripped.",
            "complaint_type": "Computer not starting",
            "severity": "medium",  # User entered medium, but text has sparks/fire
        },
        {
            "description": "Small scratch on the plastic frame of monitor bezel.",
            "complaint_type": "Monitor issue",
            "severity": "high",  # User entered high out of annoyance, but text is trivial
        },
    ]

    print("\n--- Testing Phase 5C Prediction Function ---")
    for idx, tc in enumerate(test_cases, 1):
        res = predict_complaint_priority(**tc)
        print(f"\nCase {idx}:")
        print(f"  Description: \"{tc['description']}\"")
        print(f"  Type: {tc['complaint_type']} | Severity: {tc['severity']}")
        print(f"  --> Predicted Priority: {res['predicted_priority'].upper()} (Confidence: {res['confidence'] * 100:.1f}%)")
        print(f"  --> Probabilities: {res['probabilities']}")
        print(f"  --> Detected Terms: {res['detected_terms']}")
        print(f"  --> Reason: {res['reason']}")
