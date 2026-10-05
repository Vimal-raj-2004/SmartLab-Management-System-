# AI-Based Smart Computer Laboratory Management and Asset Monitoring System
## Phase 3 — Complaints and Maintenance

Modular full-stack web application for college computer laboratory management, asset tracking, support ticketing, maintenance job scheduling, AI PC health diagnostics, lab utilization analysis, and complaint prioritization.

---

## 📁 1. Project Folder Structure

```
AI-Based Smart Computer Laboratory Management and Asset Monitoring System/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py              # User entity (id, name, email, password_hash, role, status, created_at)
│   │   │   ├── lab.py               # Lab entity (id, lab_name, lab_code, location, capacity, description, status, is_active)
│   │   │   ├── pc.py                # PC entity (id, lab_id, pc_code, computer_name, processor, ram, storage, os, status, purchase_date)
│   │   │   ├── inventory.py         # Inventory entity (id, item_name, category, quantity, condition, location, status, purchase_date)
│   │   │   ├── complaint.py         # Complaint entity (id, complaint_code, submitted_by, pc_id, lab_id, type, severity, status, priority, assigned_to)
│   │   │   └── maintenance.py       # Maintenance entity (id, pc_id, complaint_id, issue_description, type, assigned_to, status, dates, notes)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # /api/auth (login, register, me)
│   │   │   ├── health.py            # /api/health
│   │   │   ├── dashboard.py         # /api/dashboard/stats (real-time live facility, PC, complaint & maintenance counts)
│   │   │   ├── labs.py              # /api/labs (Full CRUD, search, filter, pagination)
│   │   │   ├── pcs.py               # /api/pcs (Full CRUD, lab & status filter, search, pagination)
│   │   │   ├── inventory.py         # /api/inventory (Full CRUD, category & condition & status filter)
│   │   │   ├── users.py             # /api/users (Admin user management, role & status filter)
│   │   │   ├── complaints.py        # /api/complaints (Submit, track, assign, update status, stats, types)
│   │   │   └── maintenance.py       # /api/maintenance (Schedule, complete, restore PC status, PC history)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Auth request & response schemas
│   │   │   ├── user.py              # User schemas & pagination
│   │   │   ├── lab.py               # Lab schemas & pagination
│   │   │   ├── pc.py                # PC schemas & pagination
│   │   │   ├── inventory.py         # Inventory schemas & pagination
│   │   │   ├── complaint.py         # Complaint schemas, stats & pagination
│   │   │   └── maintenance.py       # Maintenance schemas & pagination
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   └── security.py          # Direct bcrypt hashing & JWT token generator
│   │   ├── config.py                # BaseSettings (.env reader)
│   │   ├── database.py              # SQLAlchemy engine, FlexibleEnum & session factory
│   │   ├── dependencies.py          # JWT authentication & RBAC route guards
│   │   ├── main.py                  # FastAPI app entry point & CORS
│   │   └── seed.py                  # Seed script (4 Users, 4 Labs, 7 PCs, 10 Inventory items, Complaints, Maintenance)
│   ├── requirements.txt             # Python dependencies
│   ├── test_phase1.py               # Phase 1 test suite
│   ├── test_phase2.py               # Phase 2 test suite (17 automated tests)
│   └── test_phase3.py               # Phase 3 test suite (20 automated tests)
├── database/
│   ├── schema.sql                   # PostgreSQL / Supabase table definitions (all 6 tables + enums)
│   └── seed.sql                     # PostgreSQL baseline SQL seed (all 6 tables populated)
├── docs/
│   ├── API_DOCUMENTATION.md         # API specs
│   └── ARCHITECTURE.md              # System design & role access hierarchy
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation bar
│   │   │   ├── Sidebar.jsx          # Role-aware sidebar navigation (Phase 3 complaints & maintenance active)
│   │   │   ├── ProtectedRoute.jsx   # Role-based route guard
│   │   │   ├── RoleBadge.jsx        # Colored role badge
│   │   │   ├── StatusBadge.jsx      # Reusable badge for Labs, PCs, Inventory, Complaints & Maintenance
│   │   │   ├── PageHeader.jsx       # Standardized page title & action button
│   │   │   ├── SearchBar.jsx        # Search input with icon
│   │   │   ├── Pagination.jsx       # Page navigator with ellipsis
│   │   │   ├── Modal.jsx            # Animated responsive modal dialog
│   │   │   ├── ConfirmDialog.jsx    # Action confirmation dialog
│   │   │   ├── FormField.jsx        # Reusable form field wrapper
│   │   │   ├── LoadingState.jsx     # Centered loading spinner
│   │   │   └── ErrorState.jsx       # Error display with retry button
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT Auth state & role redirect logic
│   │   ├── pages/
│   │   │   ├── dashboards/
│   │   │   │   ├── AdminDashboard.jsx     # Overview with Complaints & Maintenance cards
│   │   │   │   ├── FacultyDashboard.jsx   # Overview with Quick Submit & Tracking links
│   │   │   │   ├── AssistantDashboard.jsx # Quick links to PC, Inventory, Complaints, Maintenance
│   │   │   │   └── StudentDashboard.jsx   # Report PC Issue & View My Complaints
│   │   │   ├── admin/
│   │   │   │   ├── LabsPage.jsx           # Lab management
│   │   │   │   ├── PCsPage.jsx            # PC management with embedded Maintenance History
│   │   │   │   ├── InventoryPage.jsx      # Inventory management
│   │   │   │   └── UsersPage.jsx          # User management
│   │   │   ├── complaints/
│   │   │   │   ├── SubmitComplaintPage.jsx       # Submit complaint form
│   │   │   │   ├── MyComplaintsPage.jsx          # My complaints tracking
│   │   │   │   └── ComplaintManagementPage.jsx   # Triage, assign, update & convert to maintenance
│   │   │   ├── maintenance/
│   │   │   │   └── MaintenanceManagementPage.jsx # Schedule, view, and complete maintenance jobs
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Unauthorized.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/
│   │   │   └── api.js               # Centralized Axios client & services
│   │   ├── App.jsx                  # Complete client router with all Phase 3 routes
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## ⚡ 2. How to Run

### Step 1: Start the Backend (FastAPI)
```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### Step 2: Start the Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 3. Running Automated Tests

Run the full automated integration test suites:
```powershell
# Phase 1: Authentication & RBAC Foundation (5 tests)
python backend/test_phase1.py

# Phase 2: Core Lab Management (17 tests)
python backend/test_phase2.py

# Phase 3: Complaints & Maintenance (20 tests)
python backend/test_phase3.py
```

---

## 👥 4. Role Permissions Matrix (Phase 3)

| Feature | Admin | Lab Assistant | Faculty | Student |
|---|:---:|:---:|:---:|:---:|
| **Submit Complaint** | Yes | Yes | Yes | Yes |
| **View My Complaints** | Yes | Yes | Yes | Yes |
| **Manage All Complaints** | Full | Full (Assign/Status/Resolve) | No | No |
| **Schedule Maintenance** | Full | Full (Auto PC status) | No | No |
| **Complete Maintenance** | Full | Full (Auto-restores PC to Working) | No | No |
| **View PC Maintenance History** | Full | Full | Read-only | Read-only |
| **Dashboard Statistics** | Full | Operational stats | Role summary | Role summary |
