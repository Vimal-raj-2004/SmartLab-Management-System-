# AI-Based Smart Computer Laboratory Management and Asset Monitoring System
## Comprehensive Final Project Documentation & Technical Architecture Guide

---

## 📌 Executive Summary

Modern higher education and technical institutions face substantial logistical friction in managing computer laboratories:
- **Uncoordinated Scheduling**: Double-bookings, manual paper registers, and slot booking conflicts.
- **Untracked Hardware Health**: Workstations fail silently during practical exams or classes; staff are unaware until students complain.
- **Manual Maintenance & Disconnected Support**: Complaints are reported informally without diagnostic telemetry or SLA tracking.
- **Inefficient Lab Utilization**: Laboratories sit idle or are overcrowded without analytics on seat-to-PC efficiency.

The **AI-Based Smart Computer Laboratory Management and Asset Monitoring System** is an enterprise-grade, full-stack, modular solution engineered with **FastAPI**, **React 18**, **PostgreSQL (Supabase)**, and embedded **Scikit-Learn Machine Learning models**. The system unifies asset tracking, laboratory reservations, support ticketing, preventive maintenance scheduling, real-time hardware telemetry streaming, and automated AI diagnostics into a single dashboard.

---

## 🏗️ 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Client Layer
        Browser[Modern Web Browser\nReact 18 + Vite SPA\nTailwind CSS + Lucide Icons]
        Mobile[Mobile Devices\nResponsive Viewports]
        AgentPC[Physical Laboratory PCs\npsutil Hardware Telemetry Agent]
    end

    subgraph Edge & Hosting Layer
        Netlify[Netlify Edge CDN\nSPA Routing & /api/* Proxy]
        Render[Render Cloud Service\nFastAPI + Uvicorn Async Server]
    end

    subgraph Data & Storage Layer
        Supabase[(Supabase PostgreSQL 15\nCloud Database & Pooler)]
        MLModels[Machine Learning Models\npc_health_model.joblib\npriority_model.joblib]
    end

    Browser -->|HTTPS / WSS| Netlify
    Mobile -->|HTTPS| Netlify
    Netlify -->|Encrypted Reverse Proxy| Render
    AgentPC -->|POST /api/pc-health every 30s| Render
    Render -->|SQLAlchemy 2.0 Pool| Supabase
    Render -->|In-Memory Inference| MLModels
```

### Hosting Architecture & Live Endpoints

| Component | Technology | Live URL / Environment |
|---|---|---|
| **Frontend Application** | React 18, Vite, Tailwind CSS | [https://smartlab-management-system.netlify.app](https://smartlab-management-system.netlify.app) |
| **Backend REST API** | FastAPI, Python 3.11+, Uvicorn | [https://smartlab-management-system.onrender.com](https://smartlab-management-system.onrender.com) |
| **Database** | PostgreSQL 15 via Supabase | Hosted on Supabase Cloud (Southeast Asia / Singapore) |
| **PC Telemetry Agent** | Python `psutil`, `requests` | Background service on physical workstations |
| **Interactive API Docs** | OpenAPI (Swagger UI) | `https://smartlab-management-system.onrender.com/docs` |

---

## 🔄 2. Core End-to-End Workflows

### 2.1 Laboratory Reservation Workflow with Past-Slot Validation

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Faculty Member
    participant UI as React Frontend (Netlify)
    participant API as FastAPI Backend (Render)
    participant DB as PostgreSQL (Supabase)

    Faculty->>UI: Selects Lab, Date, and Time Window (e.g. 09:00 AM – 11:00 AM)
    UI->>UI: Live Form Validation (isSlotInPast comparing against browser local time)
    alt Slot is in the past for today's date
        UI-->>Faculty: Trigger Modal Dialog: "Time Slot Already Passed" (Blocks Submission)
    else Slot is valid upcoming future time
        Faculty->>UI: Clicks "Reserve Laboratory"
        UI->>API: POST /api/bookings (payload with start_time, end_time, students)
        API->>API: Calculate Indian Standard Time (IST UTC+5:30)
        API->>API: Check start_time > current_time_ist
        API->>DB: Check overlapping approved/pending slots for lab
        alt Conflict or Past Slot detected
            API-->>UI: HTTP 422 Unprocessable Entity
            UI-->>Faculty: Display error alert with 12-hour AM/PM formatting
        else No conflict
            API->>DB: Insert Booking (status: pending)
            DB-->>API: Booking ID generated (e.g. BK-2026-0005)
            API-->>UI: HTTP 201 Created
            UI-->>Faculty: Success Toast & Redirect to My Bookings
        end
    end
```

### 2.2 Live Hardware Telemetry & Random Forest AI Health Workflow

```mermaid
sequenceDiagram
    autonumber
    participant HW as Hardware (CPU/RAM/Disk)
    participant Agent as pc_monitor.py (Local PC)
    participant API as FastAPI /pc-health (Render)
    participant ML as Random Forest Model
    participant DB as PostgreSQL (Supabase)
    actor Admin as Admin Dashboard (Netlify)

    loop Every 30 Seconds
        Agent->>HW: Sample CPU%, RAM%, Disk%, Network I/O, Event Log errors
        Agent->>API: POST /api/pc-health {pc_id, cpu_usage, ram_usage, disk_usage, error_count}
        API->>ML: model.predict([cpu, ram, disk, errors])
        ML-->>API: Prediction: Healthy | Warning | Critical + Confidence Score
        API->>DB: Insert record into pc_health_logs
        API-->>Agent: HTTP 200 {health_prediction, confidence, possible_issue}
        opt Critical issue detected
            Agent->>Agent: Trigger OS Desktop Notification (plyer)
        end
    end

    loop Every 30 Seconds (Auto-Refresh)
        Admin->>API: GET /api/pc-health/latest
        API->>DB: Query latest log per PC joined with pc table
        DB-->>API: Latest telemetry array
        API-->>Admin: HTTP 200 OK
        Admin-->>Admin: Update UI gauges, status badges & "Just now" timestamps
    end
```

### 2.3 Complaint Resolution & Preventive Maintenance Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student / Faculty
    participant API as FastAPI Backend
    participant ML as NLP TF-IDF + Decision Tree
    participant DB as PostgreSQL
    actor Tech as Lab Assistant / Admin

    Student->>API: POST /api/complaints (PC, category, severity, description)
    API->>ML: Vectorize text (TF-IDF) & Predict Priority (Low/Medium/High/Urgent)
    API->>DB: Save complaint with ai_predicted_priority & confidence
    DB-->>API: Created (e.g. CMP-2026-0001)

    Tech->>API: GET /api/complaints
    API-->>Tech: Complaint List with AI Priority suggestions

    alt Quick Mark as Fixed
        Tech->>API: PATCH /api/complaints/{id} (status: resolved, notes, set_pc_working: true)
        API->>DB: Update complaint status & PC status back to "working"
    else Hardware Repair Needed
        Tech->>API: POST /api/maintenance (from complaint)
        API->>DB: Create Maintenance Job & set PC status to "maintenance"
        Tech->>API: PATCH /api/maintenance/{id} (status: completed)
        API->>DB: Restore PC to "working" & resolve complaint
    end
    API-->>Student: Complaint marked resolved with Technician name & notes
```

---

## 🤖 3. Machine Learning Architectures

### 3.1 Workstation Predictive Health (Random Forest Classifier)
- **Objective**: Continuously classify workstation operational state into `Healthy`, `Warning`, or `Critical` before total hardware crash.
- **Model Architecture**:
  - Algorithm: **Random Forest Classifier** (`n_estimators=100`, `max_depth=10`, `random_state=42`).
  - Input Features:
    1. `cpu_usage`: Continuous float (0.0% – 100.0%)
    2. `ram_usage`: Continuous float (0.0% – 100.0%)
    3. `disk_usage`: Continuous float (0.0% – 100.0%)
    4. `error_count`: Discrete integer (Windows Event Log error records)
  - Diagnostic Output: Predicted health label, prediction confidence score, and root-cause breakdown (e.g., *"High memory usage; High disk utilization"*).

### 3.2 Complaint Priority & Triage AI (TF-IDF + Decision Tree)
- **Objective**: Prevent critical lab equipment breakdown from getting lost in backlog by automatically analyzing natural language issue descriptions.
- **Pipeline Architecture**:
  1. **Preprocessing & Vectorization**: `TfidfVectorizer` (N-grams 1-2, sublinear TF scaling, English stopwords removal).
  2. **Feature Fusion**: Sparse TF-IDF matrix concatenated with one-hot encoded issue category and numeric severity.
  3. **Classification**: `DecisionTreeClassifier` trained on laboratory incident logs.
  4. **Explainability**: Outputs the decision path and top split features so lab staff understand why a priority was suggested. Staff retain full override capability.

### 3.3 Lab Utilization Clustering
- **Objective**: Evaluate lab efficiency by comparing booked hours, actual student count, PC usage, and laboratory seating capacity.
- **Metrics Tracked**:
  - Capacity Utilization Rate: $\text{Students} / \text{Lab Capacity} \times 100$
  - Workstation Occupancy: $\text{PCs Used} / \text{Students} \times 100$
  - Classification: `Under-utilized` (< 40%), `Optimal` (40%–85%), `Over-utilized` (> 85%).

---

## 👥 4. Role-Based Access Control (RBAC) Matrix

| Feature / Action | Admin | Lab Assistant | Faculty | Student |
|---|:---:|:---:|:---:|:---:|
| **Lab Management (CRUD)** | Full | Read-only | Read-only | Read-only |
| **PC Asset Tracking (CRUD)** | Full | Full | Read-only | Read-only |
| **Inventory & Peripherals** | Full | Full | Read-only | Read-only |
| **User Directory Management** | Full | Read-only | No access | No access |
| **Reserve Laboratory (Booking)** | Full | Full | Full | Read-only |
| **Approve / Reject Bookings** | Full | Full | No access | No access |
| **Submit Complaint Ticket** | Full | Full | Full | Full |
| **Triage & Assign Complaints** | Full | Full | No access | No access |
| **Resolve & Fix Complaints** | Full | Full (Assigned) | No access | No access |
| **Schedule PC Maintenance** | Full | Full | No access | No access |
| **AI Workstation Health Monitoring**| Full | Full | Read-only | No access |
| **AI Lab Utilization Analytics** | Full | Full | Read-only | No access |
| **Reports & Audit Export** | Full | Full | Summary | No access |

---

## 🗄️ 5. Database Schema & Data Dictionary

The production database is hosted on **PostgreSQL 15** via Supabase.

```mermaid
erDiagram
    users ||--o{ complaints : "submits"
    users ||--o{ complaints : "assigned_to"
    users ||--o{ bookings : "reserves"
    users ||--o{ maintenance_logs : "performs"
    labs ||--o{ pcs : "contains"
    labs ||--o{ bookings : "scheduled_in"
    labs ||--o{ complaints : "pertains_to"
    pcs ||--o{ complaints : "targets"
    pcs ||--o{ maintenance_logs : "undergoes"
    pcs ||--o{ pc_health_logs : "streams_to"
    complaints ||--o| maintenance_logs : "triggers"

    users {
        int id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role "admin | faculty | lab_assistant | student"
        varchar status "active | inactive"
        timestamp created_at
    }

    labs {
        int id PK
        varchar lab_name
        varchar lab_code UK
        varchar location
        int capacity
        varchar status "active | maintenance | closed"
    }

    pcs {
        int id PK
        int lab_id FK
        varchar pc_code UK
        varchar computer_name
        varchar processor
        varchar ram
        varchar storage
        varchar os
        varchar status "working | maintenance | faulty | offline"
    }

    complaints {
        int id PK
        varchar complaint_code UK
        int submitted_by FK
        int pc_id FK
        int lab_id FK
        varchar complaint_type
        varchar severity "low | medium | high"
        varchar priority "low | medium | high | urgent"
        varchar ai_predicted_priority
        float ai_confidence
        varchar status "open | assigned | in_progress | resolved | closed"
        int assigned_to FK
        text description
        text notes
        timestamp resolved_at
    }

    maintenance_logs {
        int id PK
        int pc_id FK
        int complaint_id FK
        varchar maintenance_type
        text issue_description
        int assigned_to FK
        varchar status "scheduled | in_progress | completed"
        timestamp start_date
        timestamp end_date
    }

    pc_health_logs {
        int id PK
        varchar pc_id
        float cpu_usage
        float ram_usage
        float disk_usage
        int error_count
        timestamp recorded_at
    }

    bookings {
        int id PK
        varchar booking_code UK
        int lab_id FK
        int faculty_id FK
        date booking_date
        time start_time
        time end_time
        int number_of_students
        varchar status "pending | approved | rejected | cancelled"
        text purpose
        text rejection_reason
    }
```

---

## 🚀 6. Step-by-Step Run & Deployment Guide

### 6.1 Running in Cloud Production (Zero Local Setup)
The application is pre-deployed and live 24/7 on high-availability cloud infrastructure:
1. Open the Web Application: **[https://smartlab-management-system.netlify.app](https://smartlab-management-system.netlify.app)**
2. Log in using any role credentials below:
   - **Admin**: `admin@lab.edu` / `admin123`
   - **Faculty**: `faculty@lab.edu` / `faculty123`
   - **Lab Assistant**: `assistant@lab.edu` / `assistant123`
   - **Student**: `student@lab.edu` / `student123`
3. Backend API Documentation: **[https://smartlab-management-system.onrender.com/docs](https://smartlab-management-system.onrender.com/docs)**

---

### 6.2 Running Locally for Development

#### Prerequisites
- Python 3.10+ (ensure `python` is added to PATH)
- Node.js 18+ and `npm`

#### Step 1: Clone and Set Up Backend
```powershell
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
python -m uvicorn app.main:app --reload --port 8000
```
- Local API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

#### Step 2: Start Frontend
```powershell
# In a separate terminal, navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```
- Open browser at: `http://localhost:5173`

#### Quick 1-Click Batch Launchers (Windows)
The root workspace includes convenience batch scripts:
- `start_all.bat`: Launches both Backend and Frontend in separate windows.
- `run_backend.bat`: Launches FastAPI backend.
- `run_frontend.bat`: Launches Vite frontend.
- `run_tests.bat`: Runs the automated Python test suite.

---

### 6.3 Deploying Telemetry Agent on Laboratory PCs

Each physical laboratory workstation runs the standalone Python telemetry agent:

```powershell
# 1. Install lightweight dependencies
pip install psutil requests

# 2. Start the telemetry agent for the PC
python monitoring\pc_monitor.py --pc-id CLA-PC-001 --server https://smartlab-management-system.onrender.com --interval 30
```

#### Creating 1-Click Agent Launchers for PCs
Create a `.bat` file (e.g. `run_pc_monitor.bat`) on the target machine:
```bat
@echo off
title SmartLab Workstation Telemetry Agent
cd /d "%~dp0"
python monitoring\pc_monitor.py --pc-id CLA-PC-001 --server https://smartlab-management-system.onrender.com --interval 30
pause
```
*Tip: Place a shortcut to this `.bat` in Windows Startup (`shell:startup`) to run telemetry automatically when the PC powers on!*

---

## 🧪 7. Quality Assurance & Automated Testing

### 7.1 Backend Integration Test Suites
```powershell
# Phase 1: Authentication & RBAC Foundation (5 tests)
python backend/test_phase1.py

# Phase 2: Labs, PCs, Inventory, Users (17 tests)
python backend/test_phase2.py

# Phase 3: Complaints, AI Triage, Maintenance (20 tests)
python backend/test_phase3.py
```

### 7.2 Playwright Automated End-to-End (E2E) Browser Tests
The frontend includes comprehensive Playwright tests supporting desktop, laptop, tablet, and mobile viewports:

```powershell
cd frontend

# Run responsive modal & close button verification suite
npx playwright test e2e/responsive.spec.js --project=chrome-desktop

# Run across all viewports
npx playwright test e2e/responsive.spec.js
```

**Verified Test Scenarios**:
- ✅ Modal bounds enforcement: Header with `✕` close button strictly bounded inside viewport (`y >= 0 and y <= viewportHeight`).
- ✅ Sticky footer: Bottom `Close` button strictly visible inside viewport.
- ✅ Multi-modal dismissal: Closes via `✕` click, footer `Close` click, backdrop overlay click, and `Escape` keypress.
- ✅ Mobile responsiveness: Clean stacking on 375×667 mobile screens without horizontal document overflow.
- ✅ Past-slot booking protection: Live UI modal triggers when selecting past times for today.

---

## 🛡️ 8. Security & Reliability Highlights

1. **Password Security**: Strong cryptographic hashing via `bcrypt` (12 rounds) with individual salts.
2. **Stateless JWT Authentication**: HMAC-SHA256 tokens with role claims verified at FastAPI dependency level.
3. **Database Concurrency Protection**: Lab reservations employ `with db.begin_nested()` transactional isolation and overlapping time window range checks to prevent race condition double-bookings.
4. **Timezone Awareness**: Strict Indian Standard Time (`IST = timezone(timedelta(hours=5, minutes=30))`) evaluation prevents UTC cloud server drift from allowing expired slot bookings.
5. **CORS & Environment Isolation**: Configured CORS origins with environment variable abstraction via `pydantic-settings`.

---

## 📜 9. Team & Maintenance

- **Developer**: Vimal Raj M V
- **Repository**: [GitHub Repository](https://github.com/Vimal-raj-2004/SmartLab-Management-System-)
- **Live Deployment**: [SmartLab Management System](https://smartlab-management-system.netlify.app)
- **License**: MIT Academic License
