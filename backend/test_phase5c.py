"""
Phase 5C Integration Test Suite: AI Complaint Priority using TF-IDF + Decision Tree.

Tests:
1. Direct inference with predict_complaint_priority()
2. Standalone preview endpoint: POST /api/complaints/predict-priority
3. Model transparency endpoint: GET /api/complaints/ai-model-stats
4. Complaint submission with automatic AI priority assignment: POST /api/complaints
5. Staff review & priority override: PATCH /api/complaints/{id}
"""

import sys
import os
import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.predict_complaint_priority import predict_complaint_priority, load_complaint_priority_artifacts

BASE_URL = "http://127.0.0.1:8000"
AUTH_HEADERS = {}


def authenticate():
    global AUTH_HEADERS
    print("\n--- 0. Authenticating as Admin ---")
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@lab.edu", "password": "admin123"}
    )
    if login_resp.status_code != 200:
        raise Exception(f"Login failed ({login_resp.status_code}): {login_resp.text}")
    token = login_resp.json()["access_token"]
    AUTH_HEADERS = {"Authorization": f"Bearer {token}"}
    print("Authentication successful, token acquired.")


def test_direct_ml_predictions():
    print("\n--- 1. Testing Direct TF-IDF + Decision Tree ML Engine ---")
    _, _, _, meta = load_complaint_priority_artifacts()
    print(f"Model Holdout Accuracy: {meta.get('accuracy') * 100:.1f}%")
    print(f"Total training samples: {meta.get('total_samples')}")
    print(f"Top 5 Decision Tree features: {[f['feature'] for f in meta.get('top_features', [])[:5]]}")

    test_cases = [
        {
            "description": "The computer is completely dead and smoke was observed coming from the back power supply.",
            "complaint_type": "Computer not starting",
            "severity": "high",
            "expected_priority": "high",
        },
        {
            "description": "Mouse left click button is intermittently sticking during programming class.",
            "complaint_type": "Mouse issue",
            "severity": "medium",
            "expected_priority": "medium",
        },
        {
            "description": "Small scratch on the outer plastic bezel of the monitor stand, display is fine.",
            "complaint_type": "Monitor issue",
            "severity": "low",
            "expected_priority": "low",
        },
    ]

    for tc in test_cases:
        res = predict_complaint_priority(
            description=tc["description"],
            complaint_type=tc["complaint_type"],
            severity=tc["severity"],
        )
        print(f"Input: \"{tc['description'][:45]}...\" | Sev: {tc['severity']}")
        print(f" -> Predicted: {res['predicted_priority'].upper()} (Confidence: {res['confidence'] * 100:.1f}%)")
        print(f" -> Detected terms: {res['detected_terms']}")
        assert res["predicted_priority"] == tc["expected_priority"], f"Expected {tc['expected_priority']} but got {res['predicted_priority']}"

    print("Direct ML Predictions PASSED!")


def test_api_predict_priority_preview():
    print("\n--- 2. Testing API POST /api/complaints/predict-priority ---")
    payload = {
        "description": "Entire network switch disconnected. Ethernet link down for row 2, lab exam in 20 minutes.",
        "complaint_type": "Network issue",
        "severity": "high"
    }
    r = requests.post(f"{BASE_URL}/api/complaints/predict-priority", json=payload, headers=AUTH_HEADERS)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200
    data = r.json()
    print(f"Predicted Priority: {data['predicted_priority'].upper()} (Confidence: {data['confidence'] * 100:.1f}%)")
    print(f"Reason: {data['reason']}")
    assert data["predicted_priority"] in ["high", "medium", "low"]
    assert "probabilities" in data
    assert "detected_terms" in data
    print("API /predict-priority PASSED!")


def test_api_ai_model_stats():
    print("\n--- 3. Testing API GET /api/complaints/ai-model-stats ---")
    r = requests.get(f"{BASE_URL}/api/complaints/ai-model-stats", headers=AUTH_HEADERS)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200
    stats = r.json()
    print(f"Accuracy: {stats['accuracy'] * 100:.2f}%")
    print(f"Total samples: {stats['total_samples']}")
    print(f"Confusion matrix rows: {len(stats['confusion_matrix'])}")
    print(f"Top features count: {len(stats['top_features'])}")
    assert stats["accuracy"] > 0.70
    assert len(stats["confusion_matrix"]) == 3
    print("API /ai-model-stats PASSED!")


def test_api_complaint_lifecycle():
    print("\n--- 4. Testing Complaint Submission with Auto AI Priority & Staff Override ---")
    # 4A. Submit new complaint
    new_complaint = {
        "pc_id": 1,
        "complaint_type": "Computer not starting",
        "severity": "high",
        "description": "Motherboard emits continuous beeping and burning smell near CPU socket. System fails to post.",
        "priority": "medium"  # Submitter submitted medium, AI should assess high
    }
    r = requests.post(f"{BASE_URL}/api/complaints", json=new_complaint, headers=AUTH_HEADERS)
    print(f"Create Status: {r.status_code}")
    assert r.status_code in [200, 201]
    created = r.json()
    complaint_id = created["id"]
    print(f"Created Complaint ID: {complaint_id} ({created['complaint_code']})")
    print(f"AI Predicted Priority: {created.get('ai_predicted_priority')}")
    print(f"Final Priority: {created.get('final_priority')}")
    print(f"AI Confidence: {created.get('ai_confidence')}")
    print(f"AI Reason: {created.get('ai_prediction_reason')}")
    assert created.get("ai_predicted_priority") is not None
    assert created.get("final_priority") is not None
    assert created.get("ai_prediction_reason") is not None

    # 4B. Staff Review & Override Priority
    print(f"\n--- 5. Staff Overrides Final Priority on Complaint #{complaint_id} ---")
    override_payload = {
        "final_priority": "urgent",
        "status": "in_progress"
    }
    r_patch = requests.patch(f"{BASE_URL}/api/complaints/{complaint_id}", json=override_payload, headers=AUTH_HEADERS)
    print(f"Patch Status: {r_patch.status_code}")
    assert r_patch.status_code == 200
    updated = r_patch.json()
    print(f"Updated Final Priority: {updated.get('final_priority')}")
    print(f"Original AI Predicted Priority Preserved: {updated.get('ai_predicted_priority')}")
    assert updated.get("final_priority") == "urgent"
    assert updated.get("ai_predicted_priority") == created.get("ai_predicted_priority")
    print("Staff Override and AI Preservation PASSED!")


if __name__ == "__main__":
    try:
        authenticate()
        test_direct_ml_predictions()
        test_api_predict_priority_preview()
        test_api_ai_model_stats()
        test_api_complaint_lifecycle()
        print("\n==========================================")
        print(" ALL PHASE 5C TESTS PASSED SUCCESSFULLY! ")
        print("==========================================\n")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
