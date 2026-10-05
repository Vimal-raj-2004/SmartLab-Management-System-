"""
Production Database Reset & Cleanup Script.
Ensures:
1. Exactly 4 role login users (Admin, Faculty, Lab Assistant, Student).
2. Exactly 4 clean labs (Computer Lab A, Computer Lab B, Research Lab, AI / ML Lab).
3. Exactly 4 Dell PCs (one in each lab).
4. Clean, valid complaints, maintenance, and bookings without dangling references.
Runs on whichever database engine is currently active (PostgreSQL or local SQLite).
"""

import sys
import os
from datetime import date, datetime, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models.user import User, UserRole
from app.models.lab import Lab, LabStatus
from app.models.pc import PC, PCStatus
from app.models.inventory import InventoryItem, ItemCondition, InventoryStatus
from app.models.complaint import Complaint, ComplaintSeverity, ComplaintStatus, ComplaintPriority
from app.models.maintenance import Maintenance, MaintenanceStatus
from app.models.booking import LabBooking, BookingStatus
from app.models.lab_usage import LabUsage
from app.utils.security import get_password_hash

def clean_database():
    print("=" * 60)
    print("STARTING PRODUCTION DATABASE CLEANUP & DEDUPLICATION")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Clear child records first to avoid foreign key conflicts
        print("[1/5] Cleaning child tables (maintenance, complaints, bookings, usages)...")
        db.query(Maintenance).delete(synchronize_session=False)
        db.query(Complaint).delete(synchronize_session=False)
        db.query(LabBooking).delete(synchronize_session=False)
        db.query(LabUsage).delete(synchronize_session=False)
        try:
            from app.models.pc_health import PCHealthLog
            db.query(PCHealthLog).delete(synchronize_session=False)
        except Exception:
            pass

        # 2. Clear PCs and Labs
        print("[2/5] Cleaning PCs and Labs...")
        db.query(PC).delete(synchronize_session=False)
        db.query(Lab).delete(synchronize_session=False)

        # 3. Clean Users - keep or recreate exactly 4 users
        print("[3/5] Cleaning Users...")
        db.query(User).delete(synchronize_session=False)
        db.commit()

        # 4. Insert 4 canonical role users
        print("[4/5] Inserting 4 Canonical Role Users...")
        admin = User(
            name="System Administrator",
            email="admin@lab.edu",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            status="active",
        )
        faculty = User(
            name="Dr. Priya Sharma",
            email="faculty@lab.edu",
            password_hash=get_password_hash("faculty123"),
            role=UserRole.FACULTY,
            status="active",
        )
        assistant = User(
            name="Ravi Kumar",
            email="assistant@lab.edu",
            password_hash=get_password_hash("assistant123"),
            role=UserRole.LAB_ASSISTANT,
            status="active",
        )
        student = User(
            name="Anjali Singh",
            email="student@lab.edu",
            password_hash=get_password_hash("student123"),
            role=UserRole.STUDENT,
            status="active",
        )
        db.add_all([admin, faculty, assistant, student])
        db.commit()
        db.refresh(admin)
        db.refresh(faculty)
        db.refresh(assistant)
        db.refresh(student)
        print(f"  -> Created 4 Users: admin, faculty, assistant, student")

        # 5. Insert exactly 4 Labs
        print("[5/5] Inserting 4 Labs...")
        lab_a = Lab(
            lab_name="Computer Lab A",
            lab_code="CLA-01",
            location="Block A, Ground Floor",
            capacity=40,
            description="Primary undergraduate programming lab",
            status=LabStatus.ACTIVE,
            is_active=True,
        )
        lab_b = Lab(
            lab_name="Computer Lab B",
            lab_code="CLB-02",
            location="Block A, First Floor",
            capacity=35,
            description="Networking and hardware laboratory",
            status=LabStatus.ACTIVE,
            is_active=True,
        )
        lab_r = Lab(
            lab_name="Research Lab",
            lab_code="RES-03",
            location="Block B, Second Floor",
            capacity=20,
            description="Postgraduate research computing lab",
            status=LabStatus.ACTIVE,
            is_active=True,
        )
        lab_ai = Lab(
            lab_name="AI / ML Lab",
            lab_code="AML-04",
            location="Block C, First Floor",
            capacity=25,
            description="GPU workstations for AI/ML and deep learning projects",
            status=LabStatus.ACTIVE,
            is_active=True,
        )
        db.add_all([lab_a, lab_b, lab_r, lab_ai])
        db.commit()
        db.refresh(lab_a)
        db.refresh(lab_b)
        db.refresh(lab_r)
        db.refresh(lab_ai)
        print("  -> Created 4 Labs: CLA-01, CLB-02, RES-03, AML-04")

        # 6. Insert exactly 4 Dell PCs (one in each Lab)
        print("Inserting 4 Original Dell Workstations...")
        pc1 = PC(
            lab_id=lab_a.id,
            pc_code="CLA-PC-001",
            computer_name="LAB-A-01",
            processor="Dell OptiPlex 7090 - Intel Core i5-11400 @ 2.60GHz",
            ram="16 GB DDR4",
            storage="512 GB NVMe SSD",
            operating_system="Windows 11 Pro",
            status=PCStatus.AVAILABLE,
            purchase_date=date(2023, 6, 1),
            notes="Dell OptiPlex 7090 Desktop Workstation",
        )
        pc2 = PC(
            lab_id=lab_b.id,
            pc_code="CLB-PC-001",
            computer_name="LAB-B-01",
            processor="Dell OptiPlex 7000 - Intel Core i7-12700 @ 2.10GHz",
            ram="16 GB DDR4",
            storage="1 TB SSD",
            operating_system="Ubuntu 22.04 LTS",
            status=PCStatus.WORKING,
            purchase_date=date(2023, 8, 15),
            notes="Dell OptiPlex 7000 Tower",
        )
        pc3 = PC(
            lab_id=lab_r.id,
            pc_code="RES-PC-001",
            computer_name="RESEARCH-01",
            processor="Dell Precision 3660 - Intel Core i9-12900 @ 2.40GHz",
            ram="32 GB DDR5",
            storage="2 TB NVMe SSD",
            operating_system="Ubuntu 22.04 LTS",
            status=PCStatus.AVAILABLE,
            purchase_date=date(2022, 12, 1),
            notes="Dell Precision 3660 High-Performance Workstation",
        )
        pc4 = PC(
            lab_id=lab_ai.id,
            pc_code="AML-PC-001",
            computer_name="AI-WS-01",
            processor="Dell Precision 7920 - Intel Xeon Gold 6248R @ 3.00GHz",
            ram="64 GB DDR5",
            storage="4 TB NVMe SSD",
            operating_system="Ubuntu 22.04 LTS",
            status=PCStatus.AVAILABLE,
            purchase_date=date(2024, 1, 10),
            notes="Dell Precision 7920 Dual RTX GPU Workstation",
        )
        db.add_all([pc1, pc2, pc3, pc4])
        db.commit()
        db.refresh(pc1)
        db.refresh(pc2)
        db.refresh(pc3)
        db.refresh(pc4)
        print("  -> Created 4 Dell PCs: CLA-PC-001, CLB-PC-001, RES-PC-001, AML-PC-001")

        # 7. Inventory Items (if empty)
        if db.query(InventoryItem).count() == 0:
            seed_inventory = [
                {"item_name": "Dell 24\" UltraSharp Monitor", "category": "Peripherals", "quantity": 8, "condition": ItemCondition.GOOD, "location": "Lab A Storage", "status": InventoryStatus.AVAILABLE},
                {"item_name": "Cisco Gigabit 24-Port Switch", "category": "Networking", "quantity": 4, "condition": ItemCondition.GOOD, "location": "Server Room", "status": InventoryStatus.IN_USE},
                {"item_name": "Dell Premier Wireless Keyboard & Mouse", "category": "Peripherals", "quantity": 10, "condition": ItemCondition.NEW, "location": "Storage Room", "status": InventoryStatus.AVAILABLE},
                {"item_name": "APC Smart-UPS 1500VA", "category": "Power", "quantity": 2, "condition": ItemCondition.GOOD, "location": "Server Room", "status": InventoryStatus.IN_USE},
            ]
            for item in seed_inventory:
                db.add(InventoryItem(**item))
            db.commit()

        # 8. Clean Complaints & Maintenance
        c1 = Complaint(
            complaint_code="CMP-2026-0001",
            submitted_by=student.id,
            pc_id=pc1.id,
            lab_id=lab_a.id,
            complaint_type="Software Installation",
            severity=ComplaintSeverity.MEDIUM,
            description="VS Code Python extension and GCC compiler require latest update.",
            status=ComplaintStatus.IN_PROGRESS,
            priority=ComplaintPriority.MEDIUM,
            assigned_to=assistant.id,
        )
        db.add(c1)
        db.commit()
        db.refresh(c1)

        m1 = Maintenance(
            pc_id=pc1.id,
            complaint_id=c1.id,
            issue_description="Update C++ Compiler and Python Toolchain for CLA-PC-001",
            maintenance_type="Software Installation",
            assigned_to=assistant.id,
            status=MaintenanceStatus.IN_PROGRESS,
            start_date=date.today(),
            notes="Configuring latest toolchain and environment variables.",
        )
        db.add(m1)
        db.commit()

        # 9. Clean Lab Bookings
        b1 = LabBooking(
            booking_code="BK-2026-0001",
            lab_id=lab_a.id,
            faculty_id=faculty.id,
            purpose="CS301 Data Structures Practical Lab Exam",
            booking_date=date.today(),
            start_time=time(9, 0),
            end_time=time(11, 0),
            number_of_students=30,
            status=BookingStatus.APPROVED,
        )
        b2 = LabBooking(
            booking_code="BK-2026-0002",
            lab_id=lab_b.id,
            faculty_id=faculty.id,
            purpose="Network Security Lab Session",
            booking_date=date.today(),
            start_time=time(14, 0),
            end_time=time(16, 0),
            number_of_students=25,
            status=BookingStatus.APPROVED,
        )
        db.add_all([b1, b2])
        db.commit()

        # 10. Lab Usage
        for lab in [lab_a, lab_b, lab_r, lab_ai]:
            db.add(LabUsage(
                lab_id=lab.id,
                number_of_students=20,
                pcs_used=1,
                session_duration_minutes=90,
                session_date=date.today(),
            ))
        db.commit()

        print("[OK] PRODUCTION DATABASE SUCCESSFULLY RESET AND DEDUPLICATED!")
        print(f"Total Users: {db.query(User).count()} (Expected: 4)")
        print(f"Total Labs:  {db.query(Lab).count()} (Expected: 4)")
        print(f"Total PCs:   {db.query(PC).count()} (Expected: 4)")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
