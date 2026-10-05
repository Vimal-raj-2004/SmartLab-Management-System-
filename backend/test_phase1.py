import sys
import os

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("RUNNING PHASE 1 FULL INTEGRATION TEST SUITE")
    print("==================================================")

    # 1. Health check
    print("\n[1/5] Testing Health Check & Root API...")
    res_health = client.get("/api/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
    print(f"  [OK] /api/health: {res_health.json()['status']} ({res_health.json()['service']})")

    res_root = client.get("/")
    assert res_root.status_code == 200
    print(f"  [OK] / Root: {res_root.json()['status']} ({res_root.json()['phase']})")

    # 2. Test JWT Login for all 4 roles
    print("\n[2/5] Testing JWT Authentication for 4 Roles...")
    roles = [
        ("admin@lab.edu", "admin123", "admin", "System Administrator"),
        ("faculty@lab.edu", "faculty123", "faculty", "Dr. Alan Turing"),
        ("assistant@lab.edu", "assistant123", "lab_assistant", "Robert Croft"),
        ("student@lab.edu", "student123", "student", "John Doe"),
    ]

    tokens = {}
    for email, pwd, expected_role, expected_name in roles:
        res = client.post("/api/auth/login", json={"email": email, "password": pwd})
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        data = res.json()
        assert data["role"] == expected_role, f"Role mismatch: {data['role']} vs {expected_role}"
        assert len(data["name"]) > 0, "Name should not be empty"
        assert data["status"] == "active"
        assert "access_token" in data
        tokens[expected_role] = data["access_token"]
        print(f"  [OK] {expected_role.upper().ljust(14)}: Authenticated -> {data['name']} ({data['email']})")

    # 3. Test Invalid Login Rejection
    print("\n[3/5] Testing Invalid Login Rejection...")
    res_bad = client.post("/api/auth/login", json={"email": "admin@lab.edu", "password": "wrongpassword"})
    assert res_bad.status_code == 401
    print(f"  [OK] Bad password correctly rejected with HTTP 401 Unauthorized: {res_bad.json()['detail']}")

    # 4. Test Authenticated Profile & Role-Based Authorization
    print("\n[4/5] Testing JWT Protected Route & RBAC Access Controls...")
    # Admin accesses /api/users
    res_admin = client.get("/api/users/", headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert res_admin.status_code == 200
    print(f"  [OK] Admin Access: Allowed ({len(res_admin.json())} users listed)")

    # Student attempts to access /api/users (Should be forbidden)
    res_student = client.get("/api/users/", headers={"Authorization": f"Bearer {tokens['student']}"})
    assert res_student.status_code == 403
    print("  [OK] Student Access: Blocked with HTTP 403 Forbidden (RBAC Working)")

    # 5. Test Register Endpoint
    print("\n[5/5] Testing User Registration Flow...")
    reg_data = {
        "name": "Marie Curie",
        "email": "marie.curie@lab.edu",
        "password": "curiepassword123",
        "role": "student"
    }
    # Check if user already exists
    res_check = client.post("/api/auth/login", json={"email": "marie.curie@lab.edu", "password": "curiepassword123"})
    if res_check.status_code != 200:
        res_reg = client.post("/api/auth/register", json=reg_data)
        assert res_reg.status_code == 201, f"Registration failed: {res_reg.text}"
        print(f"  [OK] Registered new student: {res_reg.json()['name']} ({res_reg.json()['email']})")
    else:
        print("  [OK] User 'marie.curie@lab.edu' already registered.")

    # Log in as the new student
    res_curie_login = client.post("/api/auth/login", json={"email": "marie.curie@lab.edu", "password": "curiepassword123"})
    assert res_curie_login.status_code == 200
    print("  [OK] Newly registered user logged in successfully with JWT token generation")

    print("\n==================================================")
    print("ALL PHASE 1 INTEGRATION TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
