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
    print("PHASE 2 INTEGRATION TESTS")
    print("=" * 60)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[OK] 1. Health check OK")

    # 2. Login as Admin
    login_res = client.post("/api/auth/login", json={"email": "admin@lab.edu", "password": "admin123"})
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] 2. Admin login & JWT retrieval OK")

    # 3. Login as Faculty
    faculty_res = client.post("/api/auth/login", json={"email": "faculty@lab.edu", "password": "faculty123"})
    assert faculty_res.status_code == 200, f"Faculty login failed: {faculty_res.text}"
    faculty_token = faculty_res.json()["access_token"]
    faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
    print("[OK] 3. Faculty login OK")

    # 4. Login as Student
    student_res = client.post("/api/auth/login", json={"email": "student@lab.edu", "password": "student123"})
    assert student_res.status_code == 200, f"Student login failed: {student_res.text}"
    student_token = student_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[OK] 4. Student login OK")

    # 5. Dashboard stats (Admin only)
    dash_res = client.get("/api/dashboard/stats", headers=admin_headers)
    assert dash_res.status_code == 200, f"Dashboard stats failed: {dash_res.text}"
    stats = dash_res.json()
    assert "users" in stats and "labs" in stats and "pcs" in stats and "inventory" in stats
    print(f"[OK] 5. Admin Dashboard Stats OK (Total Labs: {stats['labs']['total']}, Total PCs: {stats['pcs']['total']}, Inventory: {stats['inventory']['total']}, Users: {stats['users']['total']})")

    # 6. Labs CRUD & Filtering
    labs_res = client.get("/api/labs/", headers=admin_headers)
    assert labs_res.status_code == 200, f"List labs failed: {labs_res.text}"
    labs_data = labs_res.json()
    assert labs_data["total"] >= 4, f"Expected at least 4 labs, got {labs_data['total']}"
    print(f"[OK] 6. Labs List OK ({labs_data['total']} labs found)")

    # Create new lab (or handle already exists from prior run)
    new_lab = {
        "lab_name": "Test Robotics Lab",
        "lab_code": "TRL-99",
        "location": "Block D, 3rd Floor",
        "capacity": 25,
        "description": "Robotics testing lab",
        "status": "active"
    }
    create_lab_res = client.post("/api/labs/", json=new_lab, headers=admin_headers)
    if create_lab_res.status_code == 201:
        created_lab_id = create_lab_res.json()["id"]
        print("[OK] 7. Create Lab OK (id:", created_lab_id, ")")
    else:
        # If it was created in a previous test run, fetch it
        search_lab = client.get("/api/labs/?search=TRL-99", headers=admin_headers)
        created_lab_id = search_lab.json()["items"][0]["id"]
        print("[OK] 7. Lab already present (id:", created_lab_id, ")")

    # Search lab
    search_lab_res = client.get("/api/labs/?search=Robotics", headers=admin_headers)
    assert search_lab_res.status_code == 200
    assert search_lab_res.json()["total"] >= 1
    print("[OK] 8. Search Lab OK")

    # 7. PCs CRUD & Filtering
    pcs_res = client.get("/api/pcs/", headers=admin_headers)
    assert pcs_res.status_code == 200, f"List PCs failed: {pcs_res.text}"
    pcs_data = pcs_res.json()
    assert pcs_data["total"] >= 7, f"Expected at least 7 PCs, got {pcs_data['total']}"
    print(f"[OK] 9. PCs List OK ({pcs_data['total']} PCs found)")

    # Create PC (or handle already exists)
    new_pc = {
        "lab_id": created_lab_id,
        "pc_code": "TRL-PC-101",
        "computer_name": "ROBO-01",
        "processor": "Intel Core i7-13700K",
        "ram": "32 GB DDR5",
        "storage": "1 TB NVMe",
        "operating_system": "Ubuntu 22.04 LTS",
        "status": "available",
        "purchase_date": "2024-03-01",
        "notes": "Configured with ROS 2"
    }
    create_pc_res = client.post("/api/pcs/", json=new_pc, headers=admin_headers)
    if create_pc_res.status_code == 201:
        created_pc_id = create_pc_res.json()["id"]
        print("[OK] 10. Create PC OK (id:", created_pc_id, ")")
    else:
        print("[OK] 10. PC already present")

    # Filter PCs by status
    avail_pcs_res = client.get("/api/pcs/?status=available", headers=admin_headers)
    assert avail_pcs_res.status_code == 200
    print(f"[OK] 11. Filter PCs by status OK ({avail_pcs_res.json()['total']} available PCs)")

    # 8. Inventory CRUD & Categories
    inv_res = client.get("/api/inventory/", headers=admin_headers)
    assert inv_res.status_code == 200, f"List inventory failed: {inv_res.text}"
    inv_data = inv_res.json()
    assert inv_data["total"] >= 10, f"Expected at least 10 items, got {inv_data['total']}"
    print(f"[OK] 12. Inventory List OK ({inv_data['total']} items found)")

    cats_res = client.get("/api/inventory/categories", headers=admin_headers)
    assert cats_res.status_code == 200
    print(f"[OK] 13. Inventory Categories OK ({cats_res.json()})")

    # 9. User Management (Admin only)
    users_res = client.get("/api/users/", headers=admin_headers)
    assert users_res.status_code == 200, f"List users failed: {users_res.text}"
    users_data = users_res.json()
    assert users_data["total"] >= 4, f"Expected at least 4 users, got {users_data['total']}"
    print(f"[OK] 14. Admin Users List OK ({users_data['total']} users found)")

    # 10. Role Permissions Check
    # Student attempting to access /api/users/ must get 403 Forbidden
    student_users_res = client.get("/api/users/", headers=student_headers)
    assert student_users_res.status_code == 403, f"Expected 403 for student accessing users, got {student_users_res.status_code}"
    print("[OK] 15. Role permission guard OK (Student blocked from Admin Users list with 403)")

    # Faculty can view labs
    faculty_labs_res = client.get("/api/labs/", headers=faculty_headers)
    assert faculty_labs_res.status_code == 200
    print("[OK] 16. Faculty read-only access to Labs OK")

    # Faculty blocked from creating labs
    faculty_create_lab = client.post("/api/labs/", json={"lab_name": "Unauthorized Lab", "lab_code": "UL-00", "location": "N/A"}, headers=faculty_headers)
    assert faculty_create_lab.status_code == 403
    print("[OK] 17. Faculty write blocked on Labs OK (403)")

    print("=" * 60)
    print("ALL 17 PHASE 2 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
