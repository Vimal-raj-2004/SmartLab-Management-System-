import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.seed import seed_database

# Initialize DB tables and seed
Base.metadata.create_all(bind=engine)
seed_database()

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("PHASE 3 INTEGRATION TESTS: COMPLAINTS & MAINTENANCE")
    print("=" * 60)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[OK] 1. Health check OK")

    # 2. Login as Admin
    login_admin = client.post("/api/auth/login", json={"email": "admin@lab.edu", "password": "admin123"})
    assert login_admin.status_code == 200
    admin_headers = {"Authorization": f"Bearer {login_admin.json()['access_token']}"}
    admin_id = login_admin.json()["user_id"]
    print("[OK] 2. Admin login OK")

    # 3. Login as Student
    login_student = client.post("/api/auth/login", json={"email": "student@lab.edu", "password": "student123"})
    assert login_student.status_code == 200
    student_headers = {"Authorization": f"Bearer {login_student.json()['access_token']}"}
    student_id = login_student.json()["user_id"]
    print("[OK] 3. Student login OK")

    # 4. Login as Faculty
    login_faculty = client.post("/api/auth/login", json={"email": "faculty@lab.edu", "password": "faculty123"})
    assert login_faculty.status_code == 200
    faculty_headers = {"Authorization": f"Bearer {login_faculty.json()['access_token']}"}
    print("[OK] 4. Faculty login OK")

    # 5. Login as Assistant
    login_asst = client.post("/api/auth/login", json={"email": "assistant@lab.edu", "password": "assistant123"})
    assert login_asst.status_code == 200
    asst_headers = {"Authorization": f"Bearer {login_asst.json()['access_token']}"}
    asst_id = login_asst.json()["user_id"]
    print("[OK] 5. Assistant login OK")

    # 6. Get Complaint Types
    types_res = client.get("/api/complaints/types", headers=student_headers)
    assert types_res.status_code == 200
    assert len(types_res.json()) >= 8
    print(f"[OK] 6. Complaint Types OK ({len(types_res.json())} types)")

    # 7. Student Submits Complaint
    # First get a PC
    pcs_res = client.get("/api/pcs/", headers=student_headers)
    assert pcs_res.status_code == 200
    target_pc = pcs_res.json()["items"][0]
    target_pc_id = target_pc["id"]

    student_comp_payload = {
        "pc_id": target_pc_id,
        "complaint_type": "Slow computer",
        "severity": "medium",
        "description": "System takes over 10 minutes to boot and IDE freezes frequently.",
        "priority": "medium"
    }
    submit_res = client.post("/api/complaints/", json=student_comp_payload, headers=student_headers)
    assert submit_res.status_code == 201, f"Submit complaint failed: {submit_res.text}"
    student_comp = submit_res.json()
    student_comp_id = student_comp["id"]
    print(f"[OK] 7. Student Submitted Complaint OK ({student_comp['complaint_code']})")

    # 8. Student Views Own Complaints
    student_list = client.get("/api/complaints/", headers=student_headers)
    assert student_list.status_code == 200
    student_items = student_list.json()["items"]
    assert any(c["id"] == student_comp_id for c in student_items)
    # Ensure all items belong to this student
    assert all(c["submitted_by"] == student_id for c in student_items)
    print(f"[OK] 8. Student My Complaints OK ({len(student_items)} items for this student)")

    # 9. Faculty Submits Complaint
    faculty_comp_payload = {
        "pc_id": target_pc_id,
        "complaint_type": "Software issue",
        "severity": "high",
        "description": "Python GCC compiler environment corrupted on workstation.",
        "priority": "high"
    }
    fac_submit_res = client.post("/api/complaints/", json=faculty_comp_payload, headers=faculty_headers)
    assert fac_submit_res.status_code == 201
    faculty_comp_id = fac_submit_res.json()["id"]
    print(f"[OK] 9. Faculty Submitted Complaint OK ({fac_submit_res.json()['complaint_code']})")

    # 10. Student forbidden from viewing Faculty complaint directly
    forbidden_res = client.get(f"/api/complaints/{faculty_comp_id}", headers=student_headers)
    assert forbidden_res.status_code == 403
    print("[OK] 10. Student blocked from other users complaints (403 Forbidden)")

    # 11. Assistant Views All Complaints
    asst_list = client.get("/api/complaints/", headers=asst_headers)
    assert asst_list.status_code == 200
    assert asst_list.json()["total"] >= 2
    print(f"[OK] 11. Lab Assistant views all complaints ({asst_list.json()['total']} total)")

    # 12. Assistant Assigns Complaint and changes status to in_progress
    patch_res = client.patch(
        f"/api/complaints/{student_comp_id}",
        json={"assigned_to": asst_id, "status": "in_progress", "priority": "high"},
        headers=asst_headers
    )
    assert patch_res.status_code == 200
    updated_comp = patch_res.json()
    assert updated_comp["status"] == "in_progress"
    assert updated_comp["assigned_to"] == asst_id
    print("[OK] 12. Lab Assistant assigns and updates complaint status OK")

    # 13. Create Maintenance Job & Auto-Update PC Status to 'maintenance'
    maint_payload = {
        "pc_id": target_pc_id,
        "complaint_id": student_comp_id,
        "issue_description": "Clean dust, reapply thermal paste, optimize OS startup services",
        "maintenance_type": "Hardware Repair",
        "assigned_to": asst_id,
        "status": "in_progress",
        "notes": "Opened chassis, inspected fan bearings",
        "update_pc_status": True
    }
    maint_res = client.post("/api/maintenance/", json=maint_payload, headers=asst_headers)
    assert maint_res.status_code == 201, f"Create maintenance failed: {maint_res.text}"
    maint_id = maint_res.json()["id"]
    print(f"[OK] 13. Maintenance job created (id: {maint_id})")

    # Verify PC status is now 'maintenance'
    pc_check = client.get(f"/api/pcs/{target_pc_id}", headers=admin_headers)
    assert pc_check.status_code == 200
    assert pc_check.json()["status"] == "maintenance"
    print(f"[OK] 14. PC status automatically set to 'maintenance' ({pc_check.json()['pc_code']})")

    # 15. Complete Maintenance & Auto-Restore PC Status to 'working'
    complete_res = client.patch(
        f"/api/maintenance/{maint_id}",
        json={
            "status": "completed",
            "notes": "Thermal paste reapplied. Temps reduced to 38C idle. Benchmark tests passed.",
            "set_pc_status": "working"
        },
        headers=asst_headers
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"
    print("[OK] 15. Maintenance marked completed")

    # Verify PC status restored to 'working'
    pc_restored = client.get(f"/api/pcs/{target_pc_id}", headers=admin_headers)
    assert pc_restored.json()["status"] == "working"
    print(f"[OK] 16. PC status automatically restored to 'working' ({pc_restored.json()['status']})")

    # Verify associated complaint was automatically resolved
    comp_check = client.get(f"/api/complaints/{student_comp_id}", headers=admin_headers)
    assert comp_check.json()["status"] == "resolved"
    assert comp_check.json()["resolved_at"] is not None
    print("[OK] 17. Linked complaint automatically marked resolved with resolved_at timestamp")

    # 18. PC Maintenance History
    history_res = client.get(f"/api/maintenance/pc/{target_pc_id}", headers=asst_headers)
    assert history_res.status_code == 200
    assert len(history_res.json()) >= 1
    print(f"[OK] 18. PC Maintenance History retrieved ({len(history_res.json())} records)")

    # 19. Complaint Stats Endpoint
    stats_res = client.get("/api/complaints/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    c_stats = stats_res.json()
    assert "open" in c_stats and "by_severity" in c_stats
    print(f"[OK] 19. Complaint statistics OK (Total: {c_stats['total']}, Resolved: {c_stats['resolved']})")

    # 20. Student Blocked From Maintenance Scheduling
    student_maint = client.post("/api/maintenance/", json=maint_payload, headers=student_headers)
    assert student_maint.status_code == 403
    print("[OK] 20. Student blocked from scheduling maintenance (403 Forbidden)")

    print("=" * 60)
    print("ALL 20 PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
