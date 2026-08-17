-- =============================================================
-- Fix RLS + Foreign Keys for PostgREST resource embedding
-- Run FIRST in Supabase SQL Editor (before data-patch.sql)
-- =============================================================

-- 1. Disable RLS on all tables
--    The api.js layer handles auth; RLS with custom JWT claims
--    blocks the anon key that the Supabase JS client uses.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs DISABLE ROW LEVEL SECURITY;

-- 2. Add "Unassigned" placeholder rows (id=0) for FK validity
--    Many employees have branch_id=0, department_id=0, designation_id=0.
--    These must reference real rows for FK constraints to pass.
INSERT INTO public.branches (id, name, created_by)
  OVERRIDING SYSTEM VALUE VALUES (0, 'Unassigned', 0)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, created_by, branch_id)
  OVERRIDING SYSTEM VALUE VALUES (0, 'Unassigned', 0, 0)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.designations (id, name, created_by, department_id, branch_id)
  OVERRIDING SYSTEM VALUE VALUES (0, 'Unassigned', 0, 0, 0)
  ON CONFLICT (id) DO NOTHING;

-- 3. Add FK constraints (constraint names match api.js join syntax)
--    departments -> branches
ALTER TABLE public.departments
  ADD CONSTRAINT departments_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id);

--    designations -> branches, departments
ALTER TABLE public.designations
  ADD CONSTRAINT fk_designations_branch
  FOREIGN KEY (branch_id) REFERENCES public.branches(id);
ALTER TABLE public.designations
  ADD CONSTRAINT fk_designations_department
  FOREIGN KEY (department_id) REFERENCES public.departments(id);

--    employees -> users, branches, departments, designations
ALTER TABLE public.employees
  ADD CONSTRAINT employees_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.employees
  ADD CONSTRAINT employees_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id);
ALTER TABLE public.employees
  ADD CONSTRAINT employees_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments(id);
ALTER TABLE public.employees
  ADD CONSTRAINT employees_designation_id_fkey
  FOREIGN KEY (designation_id) REFERENCES public.designations(id);

--    leaves -> employees, leave_types, employees (handover)
ALTER TABLE public.leaves
  ADD CONSTRAINT leaves_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id);
ALTER TABLE public.leaves
  ADD CONSTRAINT leaves_leave_type_id_fkey
  FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);
ALTER TABLE public.leaves
  ADD CONSTRAINT leaves_handover_to_fkey
  FOREIGN KEY (handover_to) REFERENCES public.employees(id);

--    notifications -> users
ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_user
  FOREIGN KEY (user_id) REFERENCES public.users(id);

--    audit_logs -> users
ALTER TABLE public.audit_logs
  ADD CONSTRAINT fk_audit_logs_user
  FOREIGN KEY (user_id) REFERENCES public.users(id);
