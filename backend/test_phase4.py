"""
test_phase4.py - Comprehensive Integration Test Suite for Phase 4:
Lab Booking and Availability
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, time, timedelta
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
    print("PHASE 4 INTEGRATION TESTS: LAB BOOKING & AVAILABILITY")
    print("=" * 60)

    # 1. Health & Root Phase Check
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "Phase 4" in data.get("phase", "")
    print("[OK] 1. Root & Phase 4 verified.")

    # 2. Login tokens (using json=)
    res_adm = client.post("/api/auth/login", json={"email": "admin@lab.edu", "password": "admin123"})
    assert res_adm.status_code == 200, res_adm.text
    admin_token = res_adm.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_fac = client.post("/api/auth/login", json={"email": "faculty@lab.edu", "password": "faculty123"})
    assert res_fac.status_code == 200, res_fac.text
    faculty_token = res_fac.json()["access_token"]
    faculty_headers = {"Authorization": f"Bearer {faculty_token}"}

    res_asst = client.post("/api/auth/login", json={"email": "assistant@lab.edu", "password": "assistant123"})
    assert res_asst.status_code == 200, res_asst.text
    assistant_token = res_asst.json()["access_token"]
    assistant_headers = {"Authorization": f"Bearer {assistant_token}"}

    res_stu = client.post("/api/auth/login", json={"email": "student@lab.edu", "password": "student123"})
    assert res_stu.status_code == 200, res_stu.text
    student_token = res_stu.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[OK] 2. All 4 user role logins OK.")

    # Clean up any test bookings from prior runs (booking_date > today)
    from app.database import SessionLocal
    from app.models.booking import LabBooking
    db = SessionLocal()
    db.query(LabBooking).filter(LabBooking.booking_date > date.today()).delete()
    db.commit()
    db.close()

    # 3. Faculty create valid booking
    target_date = (date.today() + timedelta(days=5)).isoformat()
    payload = {
        "lab_id": 1,
        "purpose": "Algorithms Midterm Exam",
        "booking_date": target_date,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 35
    }
    res = client.post("/api/bookings", json=payload, headers=faculty_headers)
    assert res.status_code == 201, res.text
    created_booking = res.json()
    assert created_booking["booking_code"].startswith("BK-")
    assert created_booking["status"] == "pending"
    assert created_booking["number_of_students"] == 35
    assert created_booking["lab"]["id"] == 1
    print(f"[OK] 3. Faculty created valid booking: {created_booking['booking_code']}.")

    # 4. Capacity validation rejected (Lab 1 capacity is 40; requesting 45)
    target_date_6 = (date.today() + timedelta(days=6)).isoformat()
    res = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Big Class Test",
        "booking_date": target_date_6,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 45
    }, headers=faculty_headers)
    assert res.status_code == 422
    assert "exceeds lab capacity" in res.json()["detail"]
    print("[OK] 4. Capacity validation rejected 45 students for 40 capacity lab.")

    # 5. Past date rejected
    past_date = (date.today() - timedelta(days=1)).isoformat()
    res = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Past booking",
        "booking_date": past_date,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res.status_code == 422
    assert "past" in res.json()["detail"].lower()
    print("[OK] 5. Past date booking rejected.")

    # 6. Inverted time order rejected (end_time <= start_time)
    target_date_7 = (date.today() + timedelta(days=7)).isoformat()
    res = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Inverted time booking",
        "booking_date": target_date_7,
        "start_time": "14:00:00",
        "end_time": "12:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res.status_code == 422
    print("[OK] 6. Inverted time window rejected.")

    # 7. Overlap checking (4 overlapping scenarios)
    target_date_10 = (date.today() + timedelta(days=10)).isoformat()
    # Base: 10:00 - 12:00
    base_res = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Base Session 10-12",
        "booking_date": target_date_10,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert base_res.status_code == 201

    # Overlap 1: 11:00 - 13:00 (Starts inside)
    ov1 = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Overlap 1",
        "booking_date": target_date_10,
        "start_time": "11:00:00",
        "end_time": "13:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert ov1.status_code == 409
    assert "overlaps" in ov1.json()["detail"].lower()

    # Overlap 2: 09:00 - 11:00 (Ends inside)
    ov2 = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Overlap 2",
        "booking_date": target_date_10,
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert ov2.status_code == 409
    assert "overlaps" in ov2.json()["detail"].lower()

    # Overlap 3: 09:00 - 13:00 (Encloses completely)
    ov3 = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Overlap 3",
        "booking_date": target_date_10,
        "start_time": "09:00:00",
        "end_time": "13:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert ov3.status_code == 409

    # Overlap 4: 10:30 - 11:30 (Contained inside)
    ov4 = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Overlap 4",
        "booking_date": target_date_10,
        "start_time": "10:30:00",
        "end_time": "11:30:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert ov4.status_code == 409
    print("[OK] 7. All 4 overlapping intervals rejected with 409 Conflict.")

    # 8. Non-overlapping allowed: adjacent slots & different labs
    res_adj1 = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Early Session 8-10",
        "booking_date": target_date_10,
        "start_time": "08:00:00",
        "end_time": "10:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res_adj1.status_code == 201

    res_adj2 = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Afternoon Session 12-14",
        "booking_date": target_date_10,
        "start_time": "12:00:00",
        "end_time": "14:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res_adj2.status_code == 201

    res_difflab = client.post("/api/bookings", json={
        "lab_id": 2,
        "purpose": "Lab 2 at same 10-12 time",
        "booking_date": target_date_10,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res_difflab.status_code == 201
    print("[OK] 8. Adjacent slots and parallel labs booked successfully.")

    # 9. Overlap with rejected or cancelled booking is permitted
    target_date_15 = (date.today() + timedelta(days=15)).isoformat()
    res_to_rej = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "To be rejected",
        "booking_date": target_date_15,
        "start_time": "14:00:00",
        "end_time": "16:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res_to_rej.status_code == 201
    rej_id = res_to_rej.json()["id"]

    rej_patch = client.patch(
        f"/api/bookings/{rej_id}",
        json={"status": "rejected", "rejection_reason": "Lab reserved for maintenance"},
        headers=admin_headers
    )
    assert rej_patch.status_code == 200
    assert rej_patch.json()["status"] == "rejected"

    res_retry = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Retry after rejection",
        "booking_date": target_date_15,
        "start_time": "14:00:00",
        "end_time": "16:00:00",
        "number_of_students": 20
    }, headers=faculty_headers)
    assert res_retry.status_code == 201
    print("[OK] 9. Re-booking slot of rejected reservation succeeded.")

    # 10. Faculty list & cancellation of own booking
    res_list = client.get("/api/bookings", headers=faculty_headers)
    assert res_list.status_code == 200
    fac_items = res_list.json()["items"]
    assert len(fac_items) > 0
    first_pending = next((item for item in fac_items if item["status"] == "pending"), None)
    if first_pending:
        cancel_res = client.patch(
            f"/api/bookings/{first_pending['id']}",
            json={"status": "cancelled"},
            headers=faculty_headers
        )
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"
    print("[OK] 10. Faculty listed own bookings and cancelled pending booking.")

    # 11. Student permissions: forbidden
    res_stu_list = client.get("/api/bookings", headers=student_headers)
    assert res_stu_list.status_code == 403
    res_stu_post = client.post("/api/bookings", json={
        "lab_id": 1,
        "purpose": "Student trying to book",
        "booking_date": (date.today() + timedelta(days=3)).isoformat(),
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 5
    }, headers=student_headers)
    assert res_stu_post.status_code == 403
    print("[OK] 11. Student access properly restricted (403).")

    # 12. Admin & Assistant can view all bookings
    adm_all = client.get("/api/bookings", headers=admin_headers)
    assert adm_all.status_code == 200
    assert adm_all.json()["total"] > 0

    asst_all = client.get("/api/bookings", headers=assistant_headers)
    assert asst_all.status_code == 200
    assert asst_all.json()["total"] > 0
    print("[OK] 12. Admin and Assistant can list all bookings.")

    # 13. Admin approves a pending booking
    target_date_20 = (date.today() + timedelta(days=20)).isoformat()
    res_appr_cand = client.post("/api/bookings", json={
        "lab_id": 3,
        "purpose": "Research Seminar",
        "booking_date": target_date_20,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "number_of_students": 15
    }, headers=faculty_headers)
    assert res_appr_cand.status_code == 201
    cand_id = res_appr_cand.json()["id"]

    adm_appr = client.patch(
        f"/api/bookings/{cand_id}",
        json={"status": "approved"},
        headers=admin_headers
    )
    assert adm_appr.status_code == 200
    assert adm_appr.json()["status"] == "approved"
    print(f"[OK] 13. Admin approved booking ID {cand_id}.")

    # 14. Today's schedule
    sched = client.get("/api/bookings/today", headers=assistant_headers)
    assert sched.status_code == 200
    assert "items" in sched.json()
    print(f"[OK] 14. Today's schedule endpoint returned {len(sched.json()['items'])} sessions.")

    # 15. Availability endpoint
    today_str = date.today().isoformat()
    avail = client.get(f"/api/bookings/availability?check_date={today_str}", headers=faculty_headers)
    assert avail.status_code == 200
    labs_avail = avail.json()
    assert len(labs_avail) > 0
    assert "lab_name" in labs_avail[0]
    assert "bookings" in labs_avail[0]
    assert "is_available_now" in labs_avail[0]
    print(f"[OK] 15. Availability endpoint returned {len(labs_avail)} lab states.")

    # 16. Booking stats endpoint
    b_stats = client.get("/api/bookings/stats", headers=admin_headers)
    assert b_stats.status_code == 200
    st_data = b_stats.json()
    assert "total" in st_data
    assert "approved" in st_data
    print(f"[OK] 16. Booking stats endpoint OK: total={st_data['total']}, approved={st_data['approved']}.")

    # 17. Dashboard stats includes bookings
    dash_stats = client.get("/api/dashboard/stats", headers=admin_headers)
    assert dash_stats.status_code == 200
    d_data = dash_stats.json()
    assert "bookings" in d_data
    assert "total" in d_data["bookings"]
    print(f"[OK] 17. Admin dashboard stats includes bookings: {d_data['bookings']}.")

    # 18. Admin delete booking
    target_date_25 = (date.today() + timedelta(days=25)).isoformat()
    del_cand = client.post("/api/bookings", json={
        "lab_id": 4,
        "purpose": "Temp Booking to Delete",
        "booking_date": target_date_25,
        "start_time": "15:00:00",
        "end_time": "17:00:00",
        "number_of_students": 10
    }, headers=faculty_headers)
    assert del_cand.status_code == 201
    del_id = del_cand.json()["id"]

    del_resp = client.delete(f"/api/bookings/{del_id}", headers=admin_headers)
    assert del_resp.status_code == 204

    get_del = client.get(f"/api/bookings/{del_id}", headers=admin_headers)
    assert get_del.status_code == 404
    print(f"[OK] 18. Admin deleted booking ID {del_id} and verified 404.")

    print("=" * 60)
    print("ALL 18 PHASE 4 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
