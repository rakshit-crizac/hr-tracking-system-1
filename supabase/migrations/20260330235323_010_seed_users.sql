/*
  # Seed Sample Users
  
  1. Initial Data
    - 5 Departments
    - 1 Admin user
    - 5 Employee users
    - 4 HR Agent users (1 is also POSH handler)
    - Agent category mappings
  
  2. Users:
    Admin: admin / Admin@123
    Employees: EMP001-EMP005
    HR Agents: HR001-HR004
*/

-- Insert departments
INSERT INTO departments (name, code) VALUES
  ('Engineering', 'ENG'),
  ('Sales', 'SALES'),
  ('Marketing', 'MKT'),
  ('Finance', 'FIN'),
  ('Human Resources', 'HR')
ON CONFLICT (code) DO NOTHING;

-- Insert admin user
INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent, is_posh_handler)
SELECT 'ADMIN001', 'admin@crizac.com', 'System Administrator', 'admin', d.id, true, true, true
FROM departments d WHERE d.code = 'HR'
ON CONFLICT (employee_code) DO NOTHING;

-- Insert HR agents
INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent, is_posh_handler)
SELECT 'HR001', 'priya.sharma@crizac.com', 'Priya Sharma', 'hr_agent', d.id, false, true, true
FROM departments d WHERE d.code = 'HR'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent, is_posh_handler)
SELECT 'HR002', 'rahul.verma@crizac.com', 'Rahul Verma', 'hr_agent', d.id, false, true, false
FROM departments d WHERE d.code = 'HR'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent, is_posh_handler)
SELECT 'HR003', 'anjali.gupta@crizac.com', 'Anjali Gupta', 'hr_agent', d.id, false, true, false
FROM departments d WHERE d.code = 'HR'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent, is_posh_handler)
SELECT 'HR004', 'vikram.singh@crizac.com', 'Vikram Singh', 'hr_agent', d.id, false, true, false
FROM departments d WHERE d.code = 'HR'
ON CONFLICT (employee_code) DO NOTHING;

-- Insert regular employees
INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent)
SELECT 'EMP001', 'john.doe@crizac.com', 'John Doe', 'employee', d.id, false, false
FROM departments d WHERE d.code = 'ENG'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent)
SELECT 'EMP002', 'jane.smith@crizac.com', 'Jane Smith', 'employee', d.id, false, false
FROM departments d WHERE d.code = 'SALES'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent)
SELECT 'EMP003', 'mike.johnson@crizac.com', 'Mike Johnson', 'employee', d.id, false, false
FROM departments d WHERE d.code = 'MKT'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent)
SELECT 'EMP004', 'sarah.wilson@crizac.com', 'Sarah Wilson', 'employee', d.id, false, false
FROM departments d WHERE d.code = 'FIN'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO users (employee_code, email, full_name, role, department_id, is_admin, is_hr_agent)
SELECT 'EMP005', 'david.brown@crizac.com', 'David Brown', 'employee', d.id, false, false
FROM departments d WHERE d.code = 'ENG'
ON CONFLICT (employee_code) DO NOTHING;

-- Create agent category mappings
-- Priya Sharma (HR001) - Attendance, Payroll, POSH (as POSH handler)
INSERT INTO agent_category_mappings (agent_id, category_id)
SELECT u.id, c.id FROM users u, ticket_categories c 
WHERE u.employee_code = 'HR001' AND c.code IN ('ATT_LEAVE', 'PAYROLL', 'POSH')
ON CONFLICT (agent_id, category_id) DO NOTHING;

-- Rahul Verma (HR002) - Recruitment, General Support
INSERT INTO agent_category_mappings (agent_id, category_id)
SELECT u.id, c.id FROM users u, ticket_categories c 
WHERE u.employee_code = 'HR002' AND c.code IN ('RECRUIT', 'GENERAL')
ON CONFLICT (agent_id, category_id) DO NOTHING;

-- Anjali Gupta (HR003) - Employee Relations, Performance
INSERT INTO agent_category_mappings (agent_id, category_id)
SELECT u.id, c.id FROM users u, ticket_categories c 
WHERE u.employee_code = 'HR003' AND c.code IN ('EMP_REL', 'PERF')
ON CONFLICT (agent_id, category_id) DO NOTHING;

-- Vikram Singh (HR004) - Policy, Payroll, General
INSERT INTO agent_category_mappings (agent_id, category_id)
SELECT u.id, c.id FROM users u, ticket_categories c 
WHERE u.employee_code = 'HR004' AND c.code IN ('POLICY', 'PAYROLL', 'GENERAL')
ON CONFLICT (agent_id, category_id) DO NOTHING;

-- Admin gets all categories
INSERT INTO agent_category_mappings (agent_id, category_id)
SELECT u.id, c.id FROM users u, ticket_categories c 
WHERE u.employee_code = 'ADMIN001'
ON CONFLICT (agent_id, category_id) DO NOTHING;