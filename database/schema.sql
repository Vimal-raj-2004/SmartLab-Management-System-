-- PostgreSQL / Supabase PostgreSQL Schema for Phase 3 (Complaints & Maintenance)

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'lab_assistant', 'student');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lab_status AS ENUM ('active', 'inactive', 'maintenance', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pc_status AS ENUM ('working', 'available', 'in_use', 'maintenance', 'not_working');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_condition AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inventory_status AS ENUM ('available', 'in_use', 'maintenance', 'disposed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Labs Table
CREATE TABLE IF NOT EXISTS labs (
    id SERIAL PRIMARY KEY,
    lab_name VARCHAR(120) UNIQUE NOT NULL,
    lab_code VARCHAR(30) UNIQUE NOT NULL,
    location VARCHAR(200) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_labs_code ON labs(lab_code);
CREATE INDEX IF NOT EXISTS idx_labs_status ON labs(status);

-- 4. PCs Table
CREATE TABLE IF NOT EXISTS pcs (
    id SERIAL PRIMARY KEY,
    lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
    pc_code VARCHAR(50) UNIQUE NOT NULL,
    computer_name VARCHAR(100) NOT NULL,
    processor VARCHAR(150),
    ram VARCHAR(50),
    storage VARCHAR(100),
    operating_system VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pcs_code ON pcs(pc_code);
CREATE INDEX IF NOT EXISTS idx_pcs_status ON pcs(status);
CREATE INDEX IF NOT EXISTS idx_pcs_lab_id ON pcs(lab_id);

-- 5. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition VARCHAR(50) NOT NULL DEFAULT 'good',
    location VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

-- 6. Complaints Table (Phase 3)
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    complaint_code VARCHAR(50) UNIQUE NOT NULL,
    submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pc_id INTEGER REFERENCES pcs(id) ON DELETE SET NULL,
    lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
    complaint_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    ai_predicted_priority VARCHAR(50),
    final_priority VARCHAR(50),
    ai_prediction_reason TEXT,
    ai_confidence DOUBLE PRECISION,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP WITHOUT TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_complaints_code ON complaints(complaint_code);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_submitted_by ON complaints(submitted_by);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_pc_id ON complaints(pc_id);
CREATE INDEX IF NOT EXISTS idx_complaints_lab_id ON complaints(lab_id);

-- 7. Maintenance Table (Phase 3)
CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    pc_id INTEGER NOT NULL REFERENCES pcs(id) ON DELETE CASCADE,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE SET NULL,
    issue_description TEXT NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maintenance_pc_id ON maintenance(pc_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON maintenance(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_complaint_id ON maintenance(complaint_id);

-- ============================================================
-- 7. LAB BOOKINGS TABLE (Phase 4)
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_bookings (
    id SERIAL PRIMARY KEY,
    booking_code VARCHAR(50) UNIQUE NOT NULL,
    lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    number_of_students INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_lab_id ON lab_bookings(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_faculty_id ON lab_bookings(faculty_id);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_date ON lab_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_status ON lab_bookings(status);

-- ============================================================
-- 8. PC HEALTH LOGS TABLE (Phase 5A)
-- ============================================================
CREATE TABLE IF NOT EXISTS pc_health_logs (
    id SERIAL PRIMARY KEY,
    pc_id VARCHAR(50) NOT NULL,
    cpu_usage FLOAT NOT NULL,
    ram_usage FLOAT NOT NULL,
    disk_usage FLOAT NOT NULL,
    error_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pc_health_logs_pc_id ON pc_health_logs(pc_id);
CREATE INDEX IF NOT EXISTS idx_pc_health_logs_recorded_at ON pc_health_logs(recorded_at);

