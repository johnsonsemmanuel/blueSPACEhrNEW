-- Fix: make branch_id, department_id, designation_id nullable in employees
-- These fields are optional — employees may not be assigned to a branch/department/designation yet

ALTER TABLE public.employees ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE public.employees ALTER COLUMN department_id DROP NOT NULL;
ALTER TABLE public.employees ALTER COLUMN designation_id DROP NOT NULL;
