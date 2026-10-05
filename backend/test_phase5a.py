"""
test_phase5a.py - Comprehensive Test Suite for Phase 5A:
PC Monitoring Agent & AI PC Health Prediction
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.seed import seed_database

# Ensure database tables exist
Base.metadata.create_all(bind=engine)
seed_database()

client = TestClient(app)

def run_tests():
    print("=" * 65)
    print("PHASE 5A INTEGRATION TESTS: PC HEALTH MONITORING & AI PREDICTION")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. POST /api/pc-health - Valid telemetry submission
    # -------------------------------------------------------------
    print("\n[TEST 1] Submitting telemetry to POST /api/pc-health...")
    payload_healthy = {
        "pc_id": "LAB1-PC-01",
        "cpu_usage": 24.5,
        "ram_usage": 45.2,
        "disk_usage": 52.0,
        "error_count": 0
    }
    res = client.post("/api/pc-health", json=payload_healthy)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["pc_id"] == "LAB1-PC-01"
    assert data["cpu_usage"] == 24.5
    assert data["health_prediction"] in ["Healthy", "Warning", "Critical"]
    assert "Normal performance" in data["possible_issue"]
    print(f"[OK] Telemetry recorded with id={data['id']}, prediction={data['health_prediction']}, issue={data['possible_issue']}")

    # -------------------------------------------------------------
    # 2. Telemetry with High CPU/RAM -> Stress pattern prediction
    # -------------------------------------------------------------
    print("\n[TEST 2] Submitting high resource telemetry...")
    payload_critical = {
        "pc_id": "LAB1-PC-02",
        "cpu_usage": 96.5,
        "ram_usage": 92.0,
        "disk_usage": 94.5,
        "error_count": 15
    }
    res = client.post("/api/pc-health", json=payload_critical)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["pc_id"] == "LAB1-PC-02"
    assert data["health_prediction"] in ["Warning", "Critical"]
    # Check that issue wording describes metric observations without claiming exact hardware failure
    assert any(term in data["possible_issue"] for term in ["High CPU", "High memory", "High disk", "system errors", "Abnormal performance"])
    print(f"[OK] High telemetry recorded: prediction={data['health_prediction']}, issue='{data['possible_issue']}'")

    # -------------------------------------------------------------
    # 3. Validation Rules: Ranges 0-100, Error count >= 0
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing validation rules...")
    # Invalid CPU > 100
    res_bad_cpu = client.post("/api/pc-health", json={"pc_id": "LAB1-PC-01", "cpu_usage": 115.0, "ram_usage": 50, "disk_usage": 50, "error_count": 0})
    assert res_bad_cpu.status_code == 422, "Should reject CPU > 100"

    # Invalid RAM < 0
    res_bad_ram = client.post("/api/pc-health", json={"pc_id": "LAB1-PC-01", "cpu_usage": 50, "ram_usage": -5.0, "disk_usage": 50, "error_count": 0})
    assert res_bad_ram.status_code == 422, "Should reject RAM < 0"

    # Invalid Disk > 100
    res_bad_disk = client.post("/api/pc-health", json={"pc_id": "LAB1-PC-01", "cpu_usage": 50, "ram_usage": 50, "disk_usage": 105.0, "error_count": 0})
    assert res_bad_disk.status_code == 422, "Should reject Disk > 100"

    # Invalid Error Count < 0
    res_bad_err = client.post("/api/pc-health", json={"pc_id": "LAB1-PC-01", "cpu_usage": 50, "ram_usage": 50, "disk_usage": 50, "error_count": -1})
    assert res_bad_err.status_code == 422, "Should reject error_count < 0"

    # Empty PC ID
    res_bad_id = client.post("/api/pc-health", json={"pc_id": "", "cpu_usage": 50, "ram_usage": 50, "disk_usage": 50, "error_count": 0})
    assert res_bad_id.status_code == 422, "Should reject empty pc_id"
    print("[OK] All validation rules verified (ranges 0-100 and error_count >= 0 properly enforced).")

    # -------------------------------------------------------------
    # 4. Standalone Prediction Endpoint: POST /api/pc-health/predict
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing standalone prediction endpoint POST /api/pc-health/predict...")
    pred_payload = {
        "cpu_usage": 75.0,
        "ram_usage": 78.0,
        "disk_usage": 72.0,
        "error_count": 4
    }
    res_pred = client.post("/api/pc-health/predict", json=pred_payload)
    assert res_pred.status_code == 200, res_pred.text
    pred_data = res_pred.json()
    assert "health_prediction" in pred_data
    assert "confidence" in pred_data
    assert "possible_issue" in pred_data
    assert "probabilities" in pred_data
    print(f"[OK] Standalone prediction successful: {pred_data['health_prediction']} (confidence: {pred_data['confidence']:.2f})")

    # -------------------------------------------------------------
    # 5. GET /api/pc-health/latest
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing GET /api/pc-health/latest...")
    res_latest = client.get("/api/pc-health/latest")
    assert res_latest.status_code == 200, res_latest.text
    latest_list = res_latest.json()
    assert len(latest_list) >= 2
    pc_ids = [item["pc_id"] for item in latest_list]
    assert "LAB1-PC-01" in pc_ids
    assert "LAB1-PC-02" in pc_ids
    print(f"[OK] Retrieved latest health for {len(latest_list)} PCs: {pc_ids}")

    # -------------------------------------------------------------
    # 6. GET /api/pc-health/history/{pc_id}
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing GET /api/pc-health/history/{pc_id}...")
    res_hist = client.get("/api/pc-health/history/LAB1-PC-01")
    assert res_hist.status_code == 200, res_hist.text
    hist_list = res_hist.json()
    assert len(hist_list) >= 1
    assert hist_list[0]["pc_id"] == "LAB1-PC-01"
    print(f"[OK] Retrieved {len(hist_list)} historical health log(s) for LAB1-PC-01")

    print("\n" + "=" * 65)
    print("ALL PHASE 5A INTEGRATION TESTS PASSED SUCCESSFULLY! (6/6)")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
