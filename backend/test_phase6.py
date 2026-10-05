"""
Verification script for Phase 6 — Dashboard, Analytics, and Reports.
Tests all role-specific dashboard endpoints, report endpoints, and CSV exports.
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8000/api"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"[-] Login failed for {email}: {resp.status_code} {resp.text}")
        return None
    return resp.json()["access_token"]

def main():
    print("==================================================")
    print("Testing Phase 6 — Dashboard, Analytics & Reports")
    print("==================================================")

    # 1. Admin Analytics & Dashboards
    admin_token = login("admin@lab.edu", "admin123")
    if not admin_token:
        print("Failed to authenticate as admin. Exiting.")
        sys.exit(1)

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    print("\n[1] Testing GET /dashboard/admin-analytics ...")
    res = requests.get(f"{BASE_URL}/dashboard/admin-analytics", headers=admin_headers)
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    kpis = data.get("kpis", {})
    charts = data.get("charts", {})
    print(f"  [+] KPIs retrieved successfully:")
    print(f"      Total Users: {kpis.get('total_users')}")
    print(f"      Total Labs: {kpis.get('total_labs')}")
    print(f"      Total PCs: {kpis.get('total_pcs')}")
    print(f"      Working PCs: {kpis.get('working_pcs')}")
    print(f"      Maintenance PCs: {kpis.get('maintenance_pcs')}")
    print(f"      Critical PCs: {kpis.get('critical_pcs')}")
    print(f"      Open Complaints: {kpis.get('open_complaints')}")
    print(f"      High Priority Complaints: {kpis.get('high_priority_complaints')}")
    print(f"      Today's Bookings: {kpis.get('today_bookings')}")
    print(f"      Lab Utilization: {kpis.get('lab_utilization')}")
    print(f"  [+] 6 Recharts Datasets retrieved:")
    for chart_name, chart_data in charts.items():
        print(f"      - {chart_name}: {len(chart_data)} items")

    # 2. Faculty Stats
    faculty_token = login("faculty@lab.edu", "faculty123")
    if faculty_token:
        print("\n[2] Testing GET /dashboard/faculty-stats ...")
        f_headers = {"Authorization": f"Bearer {faculty_token}"}
        res = requests.get(f"{BASE_URL}/dashboard/faculty-stats", headers=f_headers)
        assert res.status_code == 200, f"Error: {res.text}"
        fdata = res.json()
        print(f"  [+] Faculty stats retrieved:")
        print(f"      My Bookings: {fdata.get('my_bookings_count')}")
        print(f"      Upcoming Sessions: {len(fdata.get('upcoming_sessions', []))}")
        print(f"      Booking History: {len(fdata.get('booking_history', []))}")
        print(f"      My Complaints: {fdata.get('complaints', {}).get('total')}")
        print(f"      Lab Availability: {len(fdata.get('lab_availability', []))} labs")
        print(f"      Lab Usage Info: {fdata.get('lab_usage_info')}")

    # 3. Assistant Stats
    assistant_token = login("assistant@lab.edu", "assistant123")
    if assistant_token:
        print("\n[3] Testing GET /dashboard/assistant-stats ...")
        a_headers = {"Authorization": f"Bearer {assistant_token}"}
        res = requests.get(f"{BASE_URL}/dashboard/assistant-stats", headers=a_headers)
        assert res.status_code == 200, f"Error: {res.text}"
        adata = res.json()
        print(f"  [+] Lab Assistant stats retrieved:")
        print(f"      PC Status: {adata.get('pc_status')}")
        print(f"      Critical PCs: {len(adata.get('critical_pcs', []))}")
        print(f"      Warning PCs: {len(adata.get('warning_pcs', []))}")
        print(f"      Open Complaints: {adata.get('open_complaints_count')}")
        print(f"      High Priority Tickets: {len(adata.get('high_priority_complaints', []))}")
        print(f"      Pending Maintenance: {len(adata.get('pending_maintenance', []))}")
        print(f"      Today's Schedule: {len(adata.get('today_schedule', []))}")

    # 4. Student Stats
    student_token = login("student@lab.edu", "student123")
    if student_token:
        print("\n[4] Testing GET /dashboard/student-stats ...")
        s_headers = {"Authorization": f"Bearer {student_token}"}
        res = requests.get(f"{BASE_URL}/dashboard/student-stats", headers=s_headers)
        assert res.status_code == 200, f"Error: {res.text}"
        sdata = res.json()
        print(f"  [+] Student stats retrieved:")
        print(f"      Complaints Summary: {sdata.get('complaints_summary')}")
        print(f"      My Complaints: {len(sdata.get('my_complaints', []))}")
        print(f"      Lab Information: {len(sdata.get('labs', []))}")
        print(f"      Today's Sessions: {len(sdata.get('today_sessions', []))}")

    # 5. Reports Endpoints
    print("\n[5] Testing Reports Endpoints & Filters ...")
    report_endpoints = [
        ("pc-health", "PC Health"),
        ("maintenance", "Maintenance"),
        ("complaints", "Complaints"),
        ("utilization", "Utilization"),
        ("inventory", "Inventory"),
        ("bookings", "Bookings"),
    ]
    for endpoint, name in report_endpoints:
        res = requests.get(f"{BASE_URL}/reports/{endpoint}", headers=admin_headers)
        assert res.status_code == 200, f"Error fetching {endpoint}: {res.text}"
        items = res.json().get("items", [])
        print(f"  [+] {name} report: {len(items)} records found")

    # 6. CSV Export Endpoints
    print("\n[6] Testing CSV Streaming Export ...")
    csv_types = ["pc_health", "maintenance", "complaints", "utilization", "inventory", "bookings"]
    for ct in csv_types:
        res = requests.get(f"{BASE_URL}/reports/export/{ct}", headers=admin_headers)
        assert res.status_code == 200, f"Error exporting CSV for {ct}: {res.status_code}"
        assert "text/csv" in res.headers.get("content-type", ""), f"Unexpected content-type: {res.headers.get('content-type')}"
        lines = res.text.strip().split("\n")
        print(f"  [+] CSV Export for '{ct}': {len(lines)} lines exported (Header: {lines[0] if lines else 'empty'})")

    print("\n==================================================")
    print("ALL PHASE 6 DASHBOARD, ANALYTICS & REPORTS TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    main()
