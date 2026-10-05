-- PostgreSQL / Supabase PostgreSQL Seed Data for Phase 3

-- ============================================================
-- 0. Schema Repair: Ensure all timestamps have DEFAULT CURRENT_TIMESTAMP
--    and enums are compatible with FlexibleEnum VARCHAR storage
-- ============================================================
DO $$ BEGIN
    ALTER TABLE inventory ALTER COLUMN condition TYPE VARCHAR(50) USING condition::text;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE inventory ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE pcs ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE labs ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
    ALTER TABLE labs ALTER COLUMN is_active SET DEFAULT TRUE;
    ALTER TABLE labs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE labs ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE pcs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE pcs ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE inventory ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE inventory ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE complaints ALTER COLUMN severity TYPE VARCHAR(50) USING severity::text;
    ALTER TABLE complaints ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
    ALTER TABLE complaints ALTER COLUMN priority TYPE VARCHAR(50) USING priority::text;
    ALTER TABLE complaints ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE complaints ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE maintenance ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
    ALTER TABLE maintenance ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;
    ALTER TABLE maintenance ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE maintenance ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN others THEN null; END $$;

-- ============================================================
-- 1. Default Users (Pass: admin123, faculty123, assistant123, student123)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, status, created_at)
VALUES
    ('System Admin',    'admin@lab.edu',     '$2b$12$e8YxYgV8W6m6Wc7c4bAEvOcNkVc2oU9yT8h.3F5rWwYhIq8hZgXj6', 'admin',         'active', CURRENT_TIMESTAMP),
    ('Dr. Priya Sharma','faculty@lab.edu',   '$2b$12$k2Q5Wc1iF4qN9wS4eB2FwOSqL8k7zG4vJ1m.2X9vYtUbIo6kZhWp.', 'faculty',       'active', CURRENT_TIMESTAMP),
    ('Ravi Kumar',      'assistant@lab.edu', '$2b$12$y1W8Vb2oE5rM0vT5fC3GxPTrM9l8aH5wK2n.3Y0wZuVcKp7lAiXq.', 'lab_assistant', 'active', CURRENT_TIMESTAMP),
    ('Anjali Singh',    'student@lab.edu',   '$2b$12$z2X9Wc3pF6sN1wU6gD4HyQUsN0m9bI6xL3o.4Z1xAvWdLq8mBjYr.', 'student',       'active', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. Labs
-- ============================================================
INSERT INTO labs (lab_name, lab_code, location, capacity, description, status, is_active, created_at, updated_at)
VALUES
    ('Computer Lab A', 'CLA-01', 'Block A, Ground Floor', 40, 'Primary undergraduate programming lab', 'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Computer Lab B', 'CLB-02', 'Block A, First Floor',  35, 'Networking and hardware lab',           'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Research Lab',   'RES-03', 'Block B, Second Floor', 20, 'Postgraduate research computing lab',   'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('AI / ML Lab',    'AML-04', 'Block C, First Floor',  25, 'GPU workstations for AI/ML projects',  'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (lab_code) DO NOTHING;

-- ============================================================
-- 3. PCs
-- ============================================================
INSERT INTO pcs (lab_id, pc_code, computer_name, processor, ram, storage, operating_system, status, purchase_date, created_at, updated_at)
VALUES
    (1, 'CLA-PC-001', 'LAB-A-01',    'Intel Core i5-11400', '8 GB',  '512 GB SSD', 'Windows 11',   'available',   '2023-06-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 'CLA-PC-002', 'LAB-A-02',    'Intel Core i5-11400', '8 GB',  '512 GB SSD', 'Windows 11',   'available',   '2023-06-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 'CLA-PC-003', 'LAB-A-03',    'Intel Core i5-11400', '8 GB',  '512 GB SSD', 'Windows 11',   'maintenance', '2023-06-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'CLB-PC-001', 'LAB-B-01',    'Intel Core i7-12700', '16 GB', '1 TB SSD',   'Ubuntu 22.04', 'working',     '2023-08-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'CLB-PC-002', 'LAB-B-02',    'Intel Core i7-12700', '16 GB', '1 TB SSD',   'Ubuntu 22.04', 'not_working', '2023-08-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'RES-PC-001', 'RESEARCH-01', 'AMD Ryzen 9 5900X',   '32 GB', '2 TB NVMe',  'Ubuntu 22.04', 'in_use',      '2022-12-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'AML-PC-001', 'AI-WS-01',    'AMD Ryzen 9 7900X',   '64 GB', '4 TB NVMe',  'Ubuntu 22.04', 'available',   '2024-01-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (pc_code) DO NOTHING;

-- ============================================================
-- 4. Inventory
-- ============================================================
INSERT INTO inventory (item_name, category, quantity, condition, location, status, created_at, updated_at)
VALUES
    ('Network Switch (24-Port)', 'Networking',  5,  'good', 'Server Room',    'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('UTP CAT6 Cable (100m)',    'Networking',  10, 'new',  'Storage Room',   'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dell Monitor 24"',         'Peripherals', 8,  'good', 'Lab A Storage',  'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Mechanical Keyboard',      'Peripherals', 15, 'good', 'Lab A Storage',  'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Optical Mouse',            'Peripherals', 20, 'fair', 'Lab A Storage',  'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('UPS 1500VA',               'Power',       3,  'good', 'Server Room',    'in_use',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('HDMI Cable 2m',            'Accessories', 12, 'new',  'Equipment Shelf','available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Cisco Router',             'Networking',  2,  'good', 'Server Room',    'in_use',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Projector Screen',         'AV Equipment',2,  'good', 'Lab B',          'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('External HDD 1TB',         'Storage',     4,  'fair', 'Equipment Shelf','available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Complaints (Phase 3)
-- ============================================================
INSERT INTO complaints (complaint_code, submitted_by, pc_id, lab_id, complaint_type, severity, description, status, priority, assigned_to, created_at, updated_at)
VALUES
    ('CMP-2026-0001', 4, 3, 1, 'Computer not starting', 'high',   'PC does not boot after pressing power switch. Power LED blinks amber.',   'in_progress', 'high',   3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('CMP-2026-0002', 2, 5, 2, 'Network issue',          'medium', 'Ethernet port is loose, network connection drops intermittently.',        'open',        'medium', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (complaint_code) DO NOTHING;

-- ============================================================
-- 6. Maintenance (Phase 3)
-- ============================================================
INSERT INTO maintenance (pc_id, complaint_id, issue_description, maintenance_type, assigned_to, status, start_date, notes, created_at, updated_at)
VALUES
    (3, 1, 'PSU diagnosis and replacement for CLA-PC-003', 'Hardware Repair', 3, 'in_progress', CURRENT_DATE, 'Tested power supply with multimeter. Replacing 450W PSU.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Lab Bookings (Phase 4)
-- ============================================================
INSERT INTO lab_bookings (booking_code, lab_id, faculty_id, purpose, booking_date, start_time, end_time, number_of_students, status, created_at, updated_at)
VALUES
    ('BK-2026-0001', 1, 2, 'CS301 Data Structures Practical Lab Exam', CURRENT_DATE, '09:00:00', '11:00:00', 30, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('BK-2026-0002', 1, 2, 'Web Development Hands-on Workshop', CURRENT_DATE, '14:00:00', '16:00:00', 25, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('BK-2026-0003', 2, 2, 'Network Security Lab Session', CURRENT_DATE, '11:30:00', '13:00:00', 20, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (booking_code) DO NOTHING;

