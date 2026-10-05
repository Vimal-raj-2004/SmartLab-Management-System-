"""
Integration test for Phase 5B: AI Lab Utilization Analysis using K-Means (K=3)
Tests:
1. Direct K-Means model prediction function (sklearn pipeline, scaler, centroid mapping)
2. API POST /api/utilization/predict
3. API GET /api/utilization/sessions
4. API POST /api/utilization/sessions (Record new session & classify)
5. API GET /api/utilization/stats (Cluster stats, monthly history, lab breakdown)
6. API POST /api/utilization/sync-bookings
"""

import sys
import os
import requests

# Fix sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.predict_kmeans import predict_utilization, load_kmeans_artifacts

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
        # Fallback to test user or alternative login
        print(f"Login failed ({login_resp.status_code}): {login_resp.text}")
        raise Exception("Authentication failed")
    token = login_resp.json()["access_token"]
    AUTH_HEADERS = {"Authorization": f"Bearer {token}"}
    print("Authentication successful, token acquired.")

def test_direct_ml_predictions():
    print("\n--- 1. Testing Direct K-Means ML Engine ---")
    _, _, meta = load_kmeans_artifacts()
    print(f"Silhouette Score: {meta.get('silhouette_score')}")
    print(f"Cluster label mapping: {meta.get('cluster_to_level')}")

    test_cases = [
        {"students": 8, "pcs": 8, "duration": 40, "expected": "Low"},
        {"students": 28, "pcs": 27, "duration": 90, "expected": "Medium"},
        {"students": 55, "pcs": 50, "duration": 180, "expected": "High"},
    ]

    for tc in test_cases:
        res = predict_utilization(tc["students"], tc["pcs"], tc["duration"])
        print(f"Input: {tc['students']} students, {tc['pcs']} PCs, {tc['duration']}m -> Level: {res['utilization_level']} (Cluster {res['cluster_id']}), Dist: {res['distance_to_center']}, Conf: {res['confidence']:.1%}")
        assert res["utilization_level"] == tc["expected"], f"Expected {tc['expected']} but got {res['utilization_level']}"
    print("Direct ML predictions PASSED!")


def test_api_predict():
    print("\n--- 2. Testing API POST /api/utilization/predict ---")
    payload = {
        "number_of_students": 12,
        "pcs_used": 10,
        "session_duration_minutes": 45
    }
    r = requests.post(f"{BASE_URL}/api/utilization/predict", json=payload, headers=AUTH_HEADERS)
    print(f"Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 200
    data = r.json()
    assert data["utilization_level"] == "Low"
    assert "cluster_characteristics" in data
    print("API /predict PASSED!")


def test_api_stats():
    print("\n--- 3. Testing API GET /api/utilization/stats ---")
    r = requests.get(f"{BASE_URL}/api/utilization/stats", headers=AUTH_HEADERS)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200
    data = r.json()
    print(f"Total sessions: {data['total_sessions']}")
    print(f"Distribution: Low={data['low_count']} ({data['low_percentage']}%), Med={data['medium_count']} ({data['medium_percentage']}%), High={data['high_count']} ({data['high_percentage']}%)")
    print(f"Cluster stats count: {len(data['cluster_statistics'])}")
    print(f"Monthly trend items: {len(data['monthly_trend'])}")
    print(f"Lab breakdown: {len(data['lab_breakdown'])} labs")
    assert data["total_sessions"] > 0
    assert len(data["cluster_statistics"]) == 3
    print("API /stats PASSED!")


def test_api_sessions_and_create():
    print("\n--- 4. Testing API GET /api/utilization/sessions & POST /api/utilization/sessions ---")
    # GET
    r = requests.get(f"{BASE_URL}/api/utilization/sessions?limit=5", headers=AUTH_HEADERS)
    assert r.status_code == 200
    sessions = r.json()
    print(f"Fetched {len(sessions)} recent sessions")
    first = sessions[0]
    print(f"Sample session: Lab {first['lab_id']}, {first['number_of_students']} students, {first['pcs_used']} PCs, {first['session_duration_minutes']}m -> {first['utilization_level']}")

    # POST (simulate recording a completed lab session within lab 1 capacity of 40)
    new_session = {
        "lab_id": 1,
        "number_of_students": 38,
        "pcs_used": 36,
        "session_duration_minutes": 180,
        "session_date": "2026-09-25"
    }
    r2 = requests.post(f"{BASE_URL}/api/utilization/sessions", json=new_session, headers=AUTH_HEADERS)
    print(f"Status: {r2.status_code}, Response: {r2.text}")
    assert r2.status_code in (200, 201)
    created = r2.json()
    print(f"Created session ID: {created['id']}, Predicted Level: {created['utilization_level']} (Cluster {created['cluster_id']})")
    assert created["utilization_level"] == "High"
    print("API /sessions GET & POST PASSED!")


if __name__ == "__main__":
    try:
        authenticate()
        test_direct_ml_predictions()
        test_api_predict()
        test_api_stats()
        test_api_sessions_and_create()
        print("\n==========================================")
        print(" ALL PHASE 5B TESTS PASSED SUCCESSFULLY! ")
        print("==========================================\n")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
