-- ==========================================
-- Supabase Schema for Apex Employee Portal
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Drop existing tables if they exist (clean setup)
DROP TABLE IF EXISTS public.credentials CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;

-- 2. Create Employees Table
CREATE TABLE public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    email TEXT,
    "baseSalary" TEXT,
    phone TEXT,
    "profileColor" TEXT,
    status TEXT DEFAULT 'Active',
    "joinDate" TEXT,
    rating TEXT,
    "photoUrl" TEXT,
    skills TEXT,
    certifications TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "reportingManagerId" TEXT,
    "birthDate" TEXT,
    "workMode" TEXT DEFAULT 'Office',
    "roleLevel" TEXT DEFAULT 'Employee'
);

-- 3. Create Credentials Table for Auth
CREATE TABLE public.credentials (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
);

-- 4. Create Leaves Table
CREATE TABLE public.leaves (
    id TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "employeeName" TEXT,
    type TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    "requestDate" TEXT
);

-- 5. Create Attendance Table
CREATE TABLE public.attendance (
    id TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    "clockIn" TEXT,
    "clockOut" TEXT,
    "totalHours" TEXT,
    "workMode" TEXT DEFAULT 'Office',
    "lateStatus" TEXT DEFAULT 'Ontime',
    "overtimeHours" TEXT DEFAULT '0.00'
);

-- 5a. Create Documents Table
CREATE TABLE public.documents (
    id TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    "fileData" TEXT,
    "uploadDate" TEXT
);

-- 5b. Create Performance Reviews Table
CREATE TABLE public.performance_reviews (
    id TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT,
    period TEXT,
    rating TEXT,
    comments TEXT,
    "reviewDate" TEXT
);

-- 5c. Create Audit Logs Table
CREATE TABLE public.audit_logs (
    id TEXT PRIMARY KEY,
    "userId" TEXT,
    "userName" TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create Permissive Policies (Public Read/Write for prototyping)
-- For production environments, tighten these using Auth checks.
CREATE POLICY "Allow public read employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Allow public insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update employees" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Allow public delete employees" ON public.employees FOR DELETE USING (true);

CREATE POLICY "Allow public read credentials" ON public.credentials FOR SELECT USING (true);
CREATE POLICY "Allow public insert credentials" ON public.credentials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update credentials" ON public.credentials FOR UPDATE USING (true);
CREATE POLICY "Allow public delete credentials" ON public.credentials FOR DELETE USING (true);

CREATE POLICY "Allow public read leaves" ON public.leaves FOR SELECT USING (true);
CREATE POLICY "Allow public insert leaves" ON public.leaves FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update leaves" ON public.leaves FOR UPDATE USING (true);
CREATE POLICY "Allow public delete leaves" ON public.leaves FOR DELETE USING (true);

CREATE POLICY "Allow public read attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Allow public insert attendance" ON public.attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update attendance" ON public.attendance FOR UPDATE USING (true);
CREATE POLICY "Allow public delete attendance" ON public.attendance FOR DELETE USING (true);

CREATE POLICY "Allow public read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Allow public read performance_reviews" ON public.performance_reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert performance_reviews" ON public.performance_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update performance_reviews" ON public.performance_reviews FOR UPDATE USING (true);
CREATE POLICY "Allow public delete performance_reviews" ON public.performance_reviews FOR DELETE USING (true);

CREATE POLICY "Allow public read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update audit_logs" ON public.audit_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete audit_logs" ON public.audit_logs FOR DELETE USING (true);

-- 8. Seed Initial Employees Data
INSERT INTO public.employees (id, name, role, department, email, "baseSalary", phone, "profileColor", status, "joinDate", rating) VALUES
('E001', 'John Doe', 'Senior Developer', 'Engineering', 'john.doe@company.com', '$8,500/mo', '+1 (555) 019-2834', '#6366f1', 'Active', '2023-03-15', '4.8'),
('E002', 'Sarah Jenkins', 'Lead Designer', 'Design', 'sarah.jenkins@company.com', '$8,200/mo', '+1 (555) 024-9182', '#ec4899', 'Active', '2023-09-01', '4.9'),
('E003', 'Marcus Chen', 'Marketing Manager', 'Marketing', 'marcus.chen@company.com', '$7,000/mo', '+1 (555) 038-7241', '#10b981', 'Active', '2024-01-10', '4.5'),
('E004', 'Emily Watson', 'HR Director', 'HR', 'emily.watson@company.com', '$7,800/mo', '+1 (555) 041-8930', '#f59e0b', 'Active', '2022-11-15', '4.7'),
('E005', 'Alexander Knight', 'Product Lead', 'Product', 'alex.knight@company.com', '$9,100/mo', '+1 (555) 062-1109', '#3b82f6', 'Active', '2021-06-20', '4.6'),
('E006', 'Olivia Thompson', 'Software Engineer', 'Engineering', 'olivia.t@company.com', '$6,200/mo', '+1 (555) 073-2281', '#8b5cf6', 'Active', '2024-03-01', '4.6'),
('E007', 'Liam Peterson', 'Illustrator', 'Design', 'liam.p@company.com', '$5,500/mo', '+1 (555) 089-3342', '#ec4899', 'Active', '2024-05-12', '4.4'),
('E008', 'Sophia Martinez', 'SEO Analyst', 'Marketing', 'sophia.m@company.com', '$5,800/mo', '+1 (555) 091-4453', '#10b981', 'Active', '2024-02-18', '4.7'),
('E009', 'James Wilson', 'UX Researcher', 'Product', 'james.w@company.com', '$6,400/mo', '+1 (555) 098-5564', '#3b82f6', 'Active', '2023-10-05', '4.5'),
('E010', 'Isabella Garcia', 'Recruiter', 'HR', 'isabella.g@company.com', '$5,200/mo', '+1 (555) 054-6675', '#f59e0b', 'Active', '2024-04-22', '4.8'),
('E011', 'Daniel Carter', 'QA Engineer', 'Engineering', 'daniel.carter@company.com', '$5,200/mo', '+1 (555) 011-2345', '#3b82f6', 'Active', '2024-02-10', '4.6'),
('E012', 'Chloe Evans', 'UX Designer', 'Design', 'chloe.evans@company.com', '$6,100/mo', '+1 (555) 012-3456', '#ec4899', 'Active', '2023-11-15', '4.8'),
('E013', 'Ryan Cooper', 'DevOps Engineer', 'Engineering', 'ryan.cooper@company.com', '$7,800/mo', '+1 (555) 013-4567', '#8b5cf6', 'Active', '2023-08-22', '4.7'),
('E014', 'Mia Jenkins', 'Content Strategist', 'Marketing', 'mia.jenkins@company.com', '$5,400/mo', '+1 (555) 014-5678', '#10b981', 'Active', '2024-04-05', '4.4'),
('E015', 'William Davis', 'HR Generalist', 'HR', 'william.davis@company.com', '$5,100/mo', '+1 (555) 015-6789', '#f59e0b', 'Active', '2024-01-20', '4.5'),
('E016', 'Sophia Flores', 'Frontend Developer', 'Engineering', 'sophia.flores@company.com', '$6,500/mo', '+1 (555) 016-7890', '#6366f1', 'Active', '2023-05-18', '4.7'),
('E017', 'Benjamin Howard', 'Product Designer', 'Design', 'ben.howard@company.com', '$6,800/mo', '+1 (555) 017-8901', '#ec4899', 'Active', '2023-04-12', '4.6'),
('E018', 'Natalie Rivera', 'Product Manager', 'Product', 'natalie.rivera@company.com', '$8,000/mo', '+1 (555) 018-9012', '#3b82f6', 'Active', '2022-09-15', '4.9'),
('E019', 'Lucas Ward', 'Social Media Manager', 'Marketing', 'lucas.ward@company.com', '$5,000/mo', '+1 (555) 019-0123', '#10b981', 'Active', '2024-03-10', '4.3'),
('E020', 'Zoe Baker', 'Recruiting Specialist', 'HR', 'zoe.baker@company.com', '$4,900/mo', '+1 (555) 020-1234', '#f59e0b', 'Active', '2024-05-01', '4.6'),
('E021', 'Nathan Bell', 'Backend Developer', 'Engineering', 'nathan.bell@company.com', '$7,200/mo', '+1 (555) 021-2345', '#6366f1', 'Active', '2023-02-28', '4.8'),
('E022', 'Lily Rogers', 'Visual Designer', 'Design', 'lily.rogers@company.com', '$5,800/mo', '+1 (555) 022-3456', '#ec4899', 'Active', '2024-01-15', '4.5'),
('E023', 'Andrew Wood', 'Technical Writer', 'Engineering', 'andrew.wood@company.com', '$5,500/mo', '+1 (555) 023-4567', '#8b5cf6', 'Active', '2023-10-10', '4.4'),
('E024', 'Grace Murphy', 'SEO Specialist', 'Marketing', 'grace.murphy@company.com', '$5,300/mo', '+1 (555) 024-5678', '#10b981', 'Active', '2024-02-20', '4.6'),
('E025', 'Thomas Cook', 'HR Manager', 'HR', 'thomas.cook@company.com', '$6,900/mo', '+1 (555) 025-6789', '#f59e0b', 'Active', '2023-06-01', '4.7'),
('E026', 'Ava Morgan', 'Mobile Developer', 'Engineering', 'ava.morgan@company.com', '$6,800/mo', '+1 (555) 026-7890', '#6366f1', 'Active', '2023-07-15', '4.7'),
('E027', 'Logan Cooper', 'Motion Designer', 'Design', 'logan.cooper@company.com', '$6,200/mo', '+1 (555) 027-8901', '#ec4899', 'Active', '2023-12-01', '4.8'),
('E028', 'Harper Gray', 'Product Owner', 'Product', 'harper.gray@company.com', '$8,500/mo', '+1 (555) 028-9012', '#3b82f6', 'Active', '2022-04-10', '4.9'),
('E029', 'Isaac Bennett', 'Data Analyst', 'Engineering', 'isaac.bennett@company.com', '$6,600/mo', '+1 (555) 029-0123', '#8b5cf6', 'Active', '2024-03-15', '4.5'),
('E030', 'Mia Simmons', 'Public Relations', 'Marketing', 'mia.simmons@company.com', '$5,600/mo', '+1 (555) 030-1234', '#10b981', 'Active', '2024-04-18', '4.6');

-- 9. Seed Initial Credentials (password is 'password123' for everyone)
INSERT INTO public.credentials (email, password) VALUES
('john.doe@company.com', 'password123'),
('sarah.jenkins@company.com', 'password123'),
('marcus.chen@company.com', 'password123'),
('emily.watson@company.com', 'password123'),
('alex.knight@company.com', 'password123'),
('olivia.t@company.com', 'password123'),
('liam.p@company.com', 'password123'),
('sophia.m@company.com', 'password123'),
('james.w@company.com', 'password123'),
('isabella.g@company.com', 'password123'),
('daniel.carter@company.com', 'password123'),
('chloe.evans@company.com', 'password123'),
('ryan.cooper@company.com', 'password123'),
('mia.jenkins@company.com', 'password123'),
('william.davis@company.com', 'password123'),
('sophia.flores@company.com', 'password123'),
('ben.howard@company.com', 'password123'),
('natalie.rivera@company.com', 'password123'),
('lucas.ward@company.com', 'password123'),
('zoe.baker@company.com', 'password123'),
('nathan.bell@company.com', 'password123'),
('lily.rogers@company.com', 'password123'),
('andrew.wood@company.com', 'password123'),
('grace.murphy@company.com', 'password123'),
('thomas.cook@company.com', 'password123'),
('ava.morgan@company.com', 'password123'),
('logan.cooper@company.com', 'password123'),
('harper.gray@company.com', 'password123'),
('isaac.bennett@company.com', 'password123'),
('mia.simmons@company.com', 'password123');

-- 10. Seed Initial Leaves Data
INSERT INTO public.leaves (id, "employeeId", "employeeName", type, "startDate", "endDate", reason, status, "requestDate") VALUES
('L1001', 'E001', 'John Doe', 'Vacation', '2026-07-01', '2026-07-10', 'Summer family trip to Europe', 'Approved', '2026-06-10'),
('L1002', 'E002', 'Sarah Jenkins', 'Sick Leave', '2026-06-14', '2026-06-15', 'Dental appointment and recovery', 'Approved', '2026-06-12'),
('L1003', 'E003', 'Marcus Chen', 'Personal Leave', '2026-06-25', '2026-06-26', 'Moving to a new apartment', 'Pending', '2026-06-15');

-- 11. Seed Initial Attendance Data
INSERT INTO public.attendance (id, "employeeId", date, "clockIn", "clockOut", "totalHours") VALUES
('A2001', 'E001', '2026-06-15', '09:02:14', '17:35:40', '8.5'),
('A2002', 'E002', '2026-06-15', '08:55:00', '17:05:00', '8.1');
