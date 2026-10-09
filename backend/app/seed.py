from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.lab import Lab, LabStatus
from app.models.pc import PC, PCStatus
from app.models.inventory import InventoryItem, ItemCondition, InventoryStatus
from app.models.complaint import Complaint, ComplaintSeverity, ComplaintStatus, ComplaintPriority
from app.models.maintenance import Maintenance, MaintenanceStatus
from app.models.booking import LabBooking, BookingStatus
from app.models.lab_usage import LabUsage
from app.utils.security import get_password_hash
from datetime import date, datetime, time

def seed_database():
    db: Session = SessionLocal()
    try:
        # ── Users ──────────────────────────────────────────────────────────
        seed_users = [
            {"name": "System Admin", "email": "admin@lab.edu", "password": "admin123", "role": UserRole.ADMIN},
            {"name": "Dr. Priya Sharma", "email": "faculty@lab.edu", "password": "faculty123", "role": UserRole.FACULTY},
            {"name": "Ravi Kumar", "email": "assistant@lab.edu", "password": "assistant123", "role": UserRole.LAB_ASSISTANT},
            {"name": "Anjali Singh", "email": "student@lab.edu", "password": "student123", "role": UserRole.STUDENT},
            {"name": "Tech Support Sam", "email": "support@lab.edu", "password": "assistant123", "role": UserRole.LAB_ASSISTANT},
        ]
        for u in seed_users:
            if not db.query(User).filter(User.email == u["email"]).first():
                db.add(User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    status="active",
                ))

        # ── Labs ───────────────────────────────────────────────────────────
        seed_labs = [
            {"lab_name": "Computer Lab A", "lab_code": "CLA-01", "location": "Block A, Ground Floor", "capacity": 40, "description": "Primary undergraduate programming lab", "status": LabStatus.ACTIVE},
            {"lab_name": "Computer Lab B", "lab_code": "CLB-02", "location": "Block A, First Floor",  "capacity": 35, "description": "Networking and hardware lab",           "status": LabStatus.ACTIVE},
            {"lab_name": "Research Lab",   "lab_code": "RES-03", "location": "Block B, Second Floor", "capacity": 20, "description": "Postgraduate research computing lab",   "status": LabStatus.ACTIVE},
            {"lab_name": "AI / ML Lab",    "lab_code": "AML-04", "location": "Block C, First Floor",  "capacity": 25, "description": "GPU workstations for AI/ML projects",   "status": LabStatus.ACTIVE},
        ]
        for l in seed_labs:
            if not db.query(Lab).filter(Lab.lab_code == l["lab_code"]).first():
                db.add(Lab(**l))

        db.commit()

        # ── PCs (need lab IDs) ─────────────────────────────────────────────
        lab_a = db.query(Lab).filter(Lab.lab_code == "CLA-01").first()
        lab_b = db.query(Lab).filter(Lab.lab_code == "CLB-02").first()
        lab_r = db.query(Lab).filter(Lab.lab_code == "RES-03").first()
        lab_ai = db.query(Lab).filter(Lab.lab_code == "AML-04").first()

        seed_pcs = [
            {"lab_id": lab_a.id if lab_a else None, "pc_code": "CLA-PC-001", "computer_name": "DESKTOP-F6GT1GS", "processor": "Intel(R) Core(TM) i5-7300U CPU @ 2.60GHz 2.71 GHz", "ram": "8.00 GB (7.84 GB usable)", "storage": "512 GB NVMe SSD", "operating_system": "Windows 11 Pro 64-bit", "status": PCStatus.AVAILABLE, "purchase_date": date(2023, 6, 1), "notes": "Lenovo Workstation (DESKTOP-F6GT1GS)"},
            {"lab_id": lab_b.id if lab_b else None, "pc_code": "CLB-PC-001", "computer_name": "LAB-B-01", "processor": "Dell OptiPlex 7000 - Intel Core i7-12700 @ 2.10GHz", "ram": "16 GB DDR4", "storage": "1 TB SSD", "operating_system": "Ubuntu 22.04 LTS", "status": PCStatus.WORKING, "purchase_date": date(2023, 8, 15), "notes": "Dell OptiPlex 7000 Tower"},
            {"lab_id": lab_r.id if lab_r else None, "pc_code": "RES-PC-001", "computer_name": "RESEARCH-01", "processor": "Dell Precision 3660 - Intel Core i9-12900 @ 2.40GHz", "ram": "32 GB DDR5", "storage": "2 TB NVMe SSD", "operating_system": "Ubuntu 22.04 LTS", "status": PCStatus.AVAILABLE, "purchase_date": date(2022, 12, 1), "notes": "Dell Precision 3660 High-Performance Workstation"},
            {"lab_id": lab_ai.id if lab_ai else None, "pc_code": "AML-PC-001", "computer_name": "DESKTOP-I693LR6", "processor": "Dell 15 DC15255 - AMD Ryzen 3 7320U with Radeon Graphics (2.40 GHz)", "ram": "8.00 GB (7.21 GB usable)", "storage": "238 GB SSD", "operating_system": "Windows 11 64-bit", "status": PCStatus.WORKING, "purchase_date": date(2024, 1, 10), "notes": "Dell 15 DC15255 Workstation (DESKTOP-I693LR6)"},
        ]
        for p in seed_pcs:
            if not db.query(PC).filter(PC.pc_code == p["pc_code"]).first():
                db.add(PC(**p))

        # ── Inventory ──────────────────────────────────────────────────────
        seed_inventory = [
            {"item_name": "Network Switch (24-Port)", "category": "Networking",   "quantity": 5,  "condition": ItemCondition.GOOD,   "location": "Server Room",    "status": InventoryStatus.AVAILABLE},
            {"item_name": "UTP CAT6 Cable (100m)",    "category": "Networking",   "quantity": 10, "condition": ItemCondition.NEW,    "location": "Storage Room",   "status": InventoryStatus.AVAILABLE},
            {"item_name": "Dell Monitor 24\"",         "category": "Peripherals",  "quantity": 8,  "condition": ItemCondition.GOOD,   "location": "Lab A Storage",  "status": InventoryStatus.AVAILABLE},
            {"item_name": "Mechanical Keyboard",       "category": "Peripherals",  "quantity": 15, "condition": ItemCondition.GOOD,   "location": "Lab A Storage",  "status": InventoryStatus.AVAILABLE},
            {"item_name": "Optical Mouse",             "category": "Peripherals",  "quantity": 20, "condition": ItemCondition.FAIR,   "location": "Lab A Storage",  "status": InventoryStatus.AVAILABLE},
            {"item_name": "UPS 1500VA",                "category": "Power",        "quantity": 3,  "condition": ItemCondition.GOOD,   "location": "Server Room",    "status": InventoryStatus.IN_USE},
            {"item_name": "HDMI Cable 2m",             "category": "Accessories",  "quantity": 12, "condition": ItemCondition.NEW,    "location": "Equipment Shelf","status": InventoryStatus.AVAILABLE},
            {"item_name": "Cisco Router",              "category": "Networking",   "quantity": 2,  "condition": ItemCondition.GOOD,   "location": "Server Room",    "status": InventoryStatus.IN_USE},
            {"item_name": "Projector Screen",          "category": "AV Equipment", "quantity": 2,  "condition": ItemCondition.GOOD,   "location": "Lab B",          "status": InventoryStatus.AVAILABLE},
            {"item_name": "External HDD 1TB",          "category": "Storage",      "quantity": 4,  "condition": ItemCondition.FAIR,   "location": "Equipment Shelf","status": InventoryStatus.AVAILABLE},
        ]
        for inv in seed_inventory:
            if not db.query(InventoryItem).filter(InventoryItem.item_name == inv["item_name"]).first():
                db.add(InventoryItem(**inv))

        db.commit()

        # ── Complaints & Maintenance (Phase 3) ─────────────────────────────
        student = db.query(User).filter(User.email == "student@lab.edu").first()
        faculty = db.query(User).filter(User.email == "faculty@lab.edu").first()
        assistant = db.query(User).filter(User.email == "assistant@lab.edu").first()
        pc_cla_3 = db.query(PC).filter(PC.pc_code == "CLA-PC-003").first()
        pc_clb_2 = db.query(PC).filter(PC.pc_code == "CLB-PC-002").first()

        if student and pc_cla_3:
            if not db.query(Complaint).filter(Complaint.complaint_code == "CMP-2026-0001").first():
                c1 = Complaint(
                    complaint_code="CMP-2026-0001",
                    submitted_by=student.id,
                    pc_id=pc_cla_3.id,
                    lab_id=pc_cla_3.lab_id,
                    complaint_type="Computer not starting",
                    severity=ComplaintSeverity.HIGH,
                    description="PC does not boot after pressing power switch. Power LED blinks amber.",
                    status=ComplaintStatus.IN_PROGRESS,
                    priority=ComplaintPriority.HIGH,
                    assigned_to=assistant.id if assistant else None,
                )
                db.add(c1)
                db.commit()
                db.refresh(c1)

                # Link a maintenance record to this complaint
                if not db.query(Maintenance).filter(Maintenance.complaint_id == c1.id).first():
                    db.add(Maintenance(
                        pc_id=pc_cla_3.id,
                        complaint_id=c1.id,
                        issue_description="PSU diagnosis and replacement for CLA-PC-003",
                        maintenance_type="Hardware Repair",
                        assigned_to=assistant.id if assistant else None,
                        status=MaintenanceStatus.IN_PROGRESS,
                        start_date=date.today(),
                        notes="Tested power supply with multimeter. Replacing 450W PSU.",
                    ))

        if faculty and pc_clb_2:
            if not db.query(Complaint).filter(Complaint.complaint_code == "CMP-2026-0002").first():
                c2 = Complaint(
                    complaint_code="CMP-2026-0002",
                    submitted_by=faculty.id,
                    pc_id=pc_clb_2.id,
                    lab_id=pc_clb_2.lab_id,
                    complaint_type="Network issue",
                    severity=ComplaintSeverity.MEDIUM,
                    description="Ethernet port is loose, network connection drops intermittently.",
                    status=ComplaintStatus.OPEN,
                    priority=ComplaintPriority.MEDIUM,
                )
                db.add(c2)

        # ── Lab Bookings (Phase 4) ──────────────────────────────────────────
        if faculty and lab_a:
            if not db.query(LabBooking).filter(LabBooking.booking_code == "BK-2026-0001").first():
                db.add(LabBooking(
                    booking_code="BK-2026-0001",
                    lab_id=lab_a.id,
                    faculty_id=faculty.id,
                    purpose="CS301 Data Structures Practical Lab Exam",
                    booking_date=date.today(),
                    start_time=time(9, 0),
                    end_time=time(11, 0),
                    number_of_students=30,
                    status=BookingStatus.APPROVED,
                ))

            if not db.query(LabBooking).filter(LabBooking.booking_code == "BK-2026-0002").first():
                db.add(LabBooking(
                    booking_code="BK-2026-0002",
                    lab_id=lab_a.id,
                    faculty_id=faculty.id,
                    purpose="Web Development Hands-on Workshop",
                    booking_date=date.today(),
                    start_time=time(14, 0),
                    end_time=time(16, 0),
                    number_of_students=25,
                    status=BookingStatus.PENDING,
                ))

        if faculty and lab_b:
            if not db.query(LabBooking).filter(LabBooking.booking_code == "BK-2026-0003").first():
                db.add(LabBooking(
                    booking_code="BK-2026-0003",
                    lab_id=lab_b.id,
                    faculty_id=faculty.id,
                    purpose="Network Security Lab Session",
                    booking_date=date.today(),
                    start_time=time(11, 30),
                    end_time=time(13, 0),
                    number_of_students=20,
                    status=BookingStatus.APPROVED,
                ))

        # ── Phase 5B: Lab Usage Data ──────────────────────────────────────
        if db.query(LabUsage).count() == 0:
            import os
            import pandas as pd
            csv_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                'ml', 'data', 'synthetic_lab_usage.csv'
            )
            if os.path.exists(csv_path):
                df_usage = pd.read_csv(csv_path).head(150)
                labs_list = db.query(Lab).all()
                lab_ids_available = [l.id for l in labs_list] if labs_list else [1]
                for _, row in df_usage.iterrows():
                    target_lab_id = int(row['lab_id']) if int(row['lab_id']) in lab_ids_available else lab_ids_available[0]
                    usage = LabUsage(
                        lab_id=target_lab_id,
                        number_of_students=int(row['number_of_students']),
                        pcs_used=int(row['pcs_used']),
                        session_duration_minutes=int(row['session_duration_minutes']),
                        session_date=datetime.strptime(str(row['session_date']), '%Y-%m-%d').date(),
                    )
                    db.add(usage)
                print(f"[OK] Seeded {len(df_usage)} historical lab usage records (Phase 5B).")

        db.commit()
        print("[OK] Database seeded successfully (Phase 4 & 5B).")


    except Exception as e:
        db.rollback()
        print(f"[WARN] Seeding error: {e}")
    finally:
        db.close()
