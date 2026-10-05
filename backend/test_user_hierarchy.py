"""
Test Suite: Student Self-Registration, Profile Management, and Hierarchical RBAC
Run: python backend/test_user_hierarchy.py
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_flow():
    print("==================================================")
    print("TESTING HIERARCHICAL RBAC, PROFILE & REGISTRATION")
    print("==================================================")

    # 1. Student Self-Registration Flow
    print("\n[1/6] Testing Student Self-Registration...")
    import time
    ts = int(time.time())
    new_student_email = f"student_{ts}@lab.edu"
    reg_res = client.post("/api/auth/register", json={
        "name": f"New Student {ts}",
        "email": new_student_email,
        "password": "mypassword123",
        "role": "admin"  # Attempt to elevate role to admin; should be ignored/forced to student!
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_data = reg_res.json()
    assert user_data["role"] == "student", f"Expected role 'student', got: {user_data['role']}"
    print(f"  [OK] Self-registered user forced to role: {user_data['role']}")

    # 2. Login with newly registered student
    print("\n[2/6] Logging in with new student...")
    login_res = client.post("/api/auth/login", json={
        "email": new_student_email,
        "password": "mypassword123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    student_token = login_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print(f"  [OK] Student login successful, received JWT token")

    # 3. Student Profile View & Update (Name, Photo, Password)
    print("\n[3/6] Testing Profile Management (Name, Avatar, Password)...")
    prof_res = client.get("/api/users/profile", headers=student_headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["email"] == new_student_email

    # Update name & avatar
    update_res = client.put("/api/users/profile", headers=student_headers, json={
        "name": f"Updated Name {ts}",
        "avatar_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    })
    assert update_res.status_code == 200, f"Profile update failed: {update_res.text}"
    assert update_res.json()["name"] == f"Updated Name {ts}"
    assert "data:image/png" in update_res.json()["avatar_url"]
    print("  [OK] Name and avatar photo updated successfully")

    # Change password
    pwd_res = client.put("/api/users/profile", headers=student_headers, json={
        "current_password": "mypassword123",
        "new_password": "brandnewpassword123"
    })
    assert pwd_res.status_code == 200, f"Password change failed: {pwd_res.text}"
    print("  [OK] Password changed successfully")

    # Verify old password fails & new password succeeds
    fail_login = client.post("/api/auth/login", json={"email": new_student_email, "password": "mypassword123"})
    assert fail_login.status_code == 401, "Old password should not work"
    succ_login = client.post("/api/auth/login", json={"email": new_student_email, "password": "brandnewpassword123"})
    assert succ_login.status_code == 200, "New password must succeed"
    print("  [OK] Login with new password succeeded, old password rejected")

    # 4. Student blocked from User Management
    print("\n[4/6] Verifying Student is blocked from User Management...")
    blocked_get = client.get("/api/users", headers=student_headers)
    assert blocked_get.status_code == 403, f"Expected 403, got: {blocked_get.status_code}"
    print("  [OK] Student access to /api/users correctly rejected with 403 Forbidden")

    # 5. Lab Technician (Assistant) Permissions
    print("\n[5/6] Testing Lab Technician (Assistant) Permissions...")
    asst_login = client.post("/api/auth/login", json={"email": "assistant@lab.edu", "password": "assistant123"})
    assert asst_login.status_code == 200
    asst_headers = {"Authorization": f"Bearer {asst_login.json()['access_token']}"}

    # Assistant list users -> must only see faculty
    asst_list = client.get("/api/users", headers=asst_headers)
    assert asst_list.status_code == 200
    items = asst_list.json()["items"]
    assert all(u["role"] == "faculty" for u in items), "Technician should only see faculty members"
    print(f"  [OK] Technician user list restricted to Faculty only ({len(items)} faculty listed)")

    # Assistant creates faculty -> must succeed
    new_fac_email = f"fac_{ts}@lab.edu"
    create_fac = client.post("/api/users", headers=asst_headers, json={
        "name": f"Prof. Test {ts}",
        "email": new_fac_email,
        "password": "facpassword123",
        "role": "faculty",
        "status": "active"
    })
    assert create_fac.status_code == 201, f"Technician failed to create faculty: {create_fac.text}"
    new_fac_id = create_fac.json()["id"]
    print(f"  [OK] Technician successfully created Faculty member (id: {new_fac_id})")

    # Assistant attempts to create student -> must fail with 403
    fail_create_stud = client.post("/api/users", headers=asst_headers, json={
        "name": "Invalid Student",
        "email": f"bad_stud_{ts}@lab.edu",
        "password": "password123",
        "role": "student"
    })
    assert fail_create_stud.status_code == 403, f"Expected 403, got: {fail_create_stud.status_code}"
    print("  [OK] Technician blocked from creating student (403 Forbidden)")

    # Assistant attempts to create admin -> must fail with 403
    fail_create_admin = client.post("/api/users", headers=asst_headers, json={
        "name": "Invalid Admin",
        "email": f"bad_admin_{ts}@lab.edu",
        "password": "password123",
        "role": "admin"
    })
    assert fail_create_admin.status_code == 403, f"Expected 403, got: {fail_create_admin.status_code}"
    print("  [OK] Technician blocked from creating admin (403 Forbidden)")

    # 6. Faculty Permissions
    print("\n[6/6] Testing Faculty Permissions...")
    fac_login = client.post("/api/auth/login", json={"email": "faculty@lab.edu", "password": "faculty123"})
    assert fac_login.status_code == 200
    fac_headers = {"Authorization": f"Bearer {fac_login.json()['access_token']}"}

    # Faculty list users -> must only see students
    fac_list = client.get("/api/users", headers=fac_headers)
    assert fac_list.status_code == 200
    fac_items = fac_list.json()["items"]
    assert all(u["role"] == "student" for u in fac_items), "Faculty should only see students"
    print(f"  [OK] Faculty user list restricted to Students only ({len(fac_items)} students listed)")

    # Faculty creates student -> must succeed
    new_stud_by_fac = client.post("/api/users", headers=fac_headers, json={
        "name": f"Student Added By Fac {ts}",
        "email": f"fac_added_stud_{ts}@lab.edu",
        "password": "studpassword123",
        "role": "student",
        "status": "active"
    })
    assert new_stud_by_fac.status_code == 201, f"Faculty failed to create student: {new_stud_by_fac.text}"
    print(f"  [OK] Faculty successfully created Student (id: {new_stud_by_fac.json()['id']})")

    # Faculty attempts to create faculty -> must fail with 403
    fail_fac_create_fac = client.post("/api/users", headers=fac_headers, json={
        "name": "Invalid Faculty",
        "email": f"bad_fac_{ts}@lab.edu",
        "password": "password123",
        "role": "faculty"
    })
    assert fail_fac_create_fac.status_code == 403, f"Expected 403, got: {fail_fac_create_fac.status_code}"
    print("  [OK] Faculty blocked from creating faculty (403 Forbidden)")

    print("\n==================================================")
    print("ALL TESTS PASSED 100%! HIERARCHY & PROFILE SECURE")
    print("==================================================")

if __name__ == "__main__":
    test_full_flow()
