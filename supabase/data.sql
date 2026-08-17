-- =============================================================
-- BlueSPACE HR System — Data Migration
-- Run AFTER schema.sql in the Supabase SQL Editor
-- =============================================================
-- NOTE: We insert with explicit IDs to preserve foreign key references.
-- Use SETVAL on sequences after inserts so new rows don't collide.

-- ===================== BRANCHES =====================
INSERT INTO public.branches (id, name, created_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(1, 'Accra', 1, '2025-10-27 09:00:41+00', '2025-10-27 09:00:41+00');

SELECT setval(pg_get_serial_sequence('public.branches', 'id'), (SELECT MAX(id) FROM public.branches));

-- ===================== DEPARTMENTS =====================
INSERT INTO public.departments (id, branch_id, name, created_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'Dev Team', 1, '2025-10-27 09:01:22+00', '2025-10-27 09:01:22+00'),
(2, 1, 'Marketing', 1, '2025-10-27 09:01:43+00', '2025-10-27 09:01:43+00'),
(3, 1, 'Ops', 1, '2025-11-12 15:00:30+00', '2025-11-12 15:00:30+00'),
(4, 1, 'Revenue Ops', 1, '2026-07-08 11:53:20+00', '2026-07-08 11:53:20+00');

SELECT setval(pg_get_serial_sequence('public.departments', 'id'), (SELECT MAX(id) FROM public.departments));

-- ===================== DESIGNATIONS =====================
INSERT INTO public.designations (id, branch_id, department_id, name, created_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 'Frontend Developer', 1, '2025-10-27 09:04:04+00', '2025-10-27 09:04:04+00'),
(2, 1, 1, 'Software Engineer', 1, '2025-10-27 09:04:34+00', '2025-10-27 09:04:34+00'),
(3, 1, 1, 'Backend Developer', 1, '2025-10-27 09:04:52+00', '2025-10-27 09:04:52+00'),
(4, 1, 1, 'Mobile App Developer', 1, '2025-10-27 09:05:21+00', '2025-10-27 09:05:21+00'),
(5, 1, 1, 'DevOps Engineer', 1, '2025-10-27 09:05:45+00', '2025-10-27 09:05:45+00'),
(6, 1, 1, 'Product Manager', 1, '2025-10-27 09:06:05+00', '2025-10-27 09:06:05+00'),
(7, 1, 2, 'Marketing Manager', 1, '2025-10-27 09:06:40+00', '2025-10-27 09:06:40+00'),
(8, 1, 2, 'Graphic Designer', 1, '2025-10-27 09:07:04+00', '2025-10-27 09:07:04+00'),
(9, 1, 2, 'Brand Manager', 1, '2025-10-27 09:07:22+00', '2025-10-27 09:07:22+00'),
(10, 1, 2, 'Wordpress Developer', 1, '2025-10-27 09:08:15+00', '2025-10-27 09:08:15+00'),
(11, 1, 3, 'TalentFactory', 1, '2025-11-13 15:14:47+00', '2025-11-13 15:14:47+00'),
(12, 1, 3, 'Accelerator Factory', 1, '2025-11-13 15:25:08+00', '2025-11-13 15:25:08+00'),
(13, 1, 3, 'Marketing', 1, '2025-11-13 15:25:25+00', '2025-11-13 15:25:25+00'),
(14, 1, 3, 'Revenue', 1, '2025-11-13 15:25:40+00', '2025-11-13 15:25:40+00'),
(15, 1, 2, 'Social Media Mark', 1, '2025-11-13 16:10:35+00', '2025-11-13 16:11:47+00'),
(16, 1, 3, 'Head of Partnership', 1, '2025-11-13 16:11:03+00', '2025-11-13 16:32:37+00');

SELECT setval(pg_get_serial_sequence('public.designations', 'id'), (SELECT MAX(id) FROM public.designations));

-- ===================== USERS =====================
-- NOTE: Passwords are bcrypt hashes from MySQL. The login function in
-- Supabase Edge Functions will handle $2y$ -> $2a$ conversion.
INSERT INTO public.users (id, name, email, password, type, avatar, phone, address, is_active, force_password_change, last_login_at, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(1, 'BlueSPACE Financial Cloud', 'onyekachi@bluespaceafrica.com', '$2a$10$fkrkcRFRbXaCX5WXRgpGieTdbPFvUALRYLHnT1Apv.rKvHaDNgPdO', 'company', 'BlueSpace-AFRICA-icon_1762356682.png', '', '', 1, 0, '2026-06-16 09:48:03+00', '2025-10-24 15:39:47+00', '2026-06-16 09:48:03+00'),
(6, 'Emmanuel Johnson-Excellent', 'emmanuel@bluespaceafrica.com', '$2a$10$7AySopFb5ivSJ.W11g9CYeOaC3IvftxQ2QtO1ED8ylivRIVJS6VLe', 'Employee', 'IMG_6782_1762479253.jpg', '0242371341', 'Nii Nortey Palm Crescent ', 1, 0, '2026-06-16 09:35:46+00', '2025-10-24 17:55:03+00', '2026-06-16 09:35:46+00'),
(8, 'Emmanuel Johnson-Excellent', 'johnsonsexcellent@gmail.com', '$2y$10$iqRsMGwYT2bhf2EVwAqz0uXBrdEO0Ikh6Y1PHI1zOclJfOTpxf2kC', 'employee', 'avatar.png', NULL, NULL, 1, 0, '2025-11-05 15:52:51+00', '2025-11-04 14:24:54+00', '2025-11-05 20:52:51+00'),
(9, 'Samuel Awuku', 'samuel.awuku@bluespaceafrica.com', '$2y$10$hxPE0BfFVJ3oKjNPJvRH0OMBhzmc.nVuHGYDka5DJBLakIW1FeA8y', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2025-11-17 09:36:31+00', '2025-11-06 15:42:28+00', '2025-11-17 14:36:31+00'),
(10, 'Karikari Adade', 'karikari@bluespaceafrica.com', '$2y$10$zaBJmEx.CqTTrM2rcP1LJ.y8JzUY5tHKylStX98.REkcoLG4UbCMK', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2025-11-10 12:09:31+00', '2025-11-06 15:51:10+00', '2025-11-10 17:09:31+00'),
(11, 'Charles Kobina', 'innovation@bluespaceafrica.com', '$2y$10$.Hmjho0DwKx0j4s.8LBm7O0cWfmZJzR/z7V4myYCJ75BX6yXH1h2.', 'Employee', 'avatar.png', NULL, NULL, 1, 0, NULL, '2025-11-13 14:47:51+00', '2025-11-13 14:47:51+00'),
(12, 'Johnnie Oduro Jnr', 'johnnie@bluespaceafrica.com', '$2y$10$EWSRLa0Y87V78wsrxBjbteq./6BszQchLcNFc90g0Gnq5uQBI/bLa', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2025-12-02 13:41:33+00', '2025-11-13 14:50:18+00', '2025-12-02 18:42:33+00'),
(13, 'Chukwuemeka Ndukwe', 'chukwuemeka@bluespaceafrica.com', '$2a$10$/h9Yht2UvLHFmUUlnNxXn.SRtjZNDnFGp0w2aZXAjPo4fuiky7ECa', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2025-12-02 13:28:05+00', '2025-11-13 14:56:25+00', '2025-12-02 18:28:05+00'),
(14, 'Paul Maen', 'paul@bluespaceafrica.com', '$2a$10$C/4L/1p4AQWCV7wODhxavu0KEfLJ6kmjXdxqGOtkZoy5dEd14/V1i', 'Employee', 'avatar.png', '0546832637', '20 peakcock street\nChristian village, Achimota', 1, 0, NULL, '2025-11-13 14:57:24+00', '2025-11-13 14:57:24+00'),
(15, 'Rita Uyaelumo', 'rita@bluespaceafrica.com', '$2y$10$J8ifqppHRYaodd4FDR4P7eyoJeosGbtCjXB1y/IkQtd80rDev.rBy', 'Employee', 'avatar.png', NULL, NULL, 1, 0, NULL, '2025-11-13 14:58:22+00', '2025-11-13 14:58:22+00'),
(16, 'Kwame Plahar', 'kwame@bluespaceafrica.com', '$2a$10$uI/EyvDinyfX.LmxHGu3PeijTsfViMvknIx76EF8VfG7rK/sR5cd6', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2025-12-02 13:34:32+00', '2025-11-13 14:59:22+00', '2025-12-02 18:34:32+00'),
(17, 'Kelvin Abraham', 'kelvin@bluespaceafrica.com', '$2y$10$a4Q.IIi/WWp4EUs/JlCA9eHTM.v0Ni3TPci.leJyNbdsjeSZpFi2W', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2026-01-16 12:38:50+00', '2025-11-13 15:01:58+00', '2026-01-16 17:38:50+00'),
(18, 'Kenneth Ekow Inkum', 'kenneth@bluespaceafrica.com', '$2y$10$ZdPoPpujw6Hz4zG6SwBoDOKdGUeQ01pC0N.EIrIX/.XpRkHUT7z/O', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2026-03-09 09:51:47+00', '2025-11-13 15:03:21+00', '2026-03-09 09:51:47+00'),
(19, 'Papa Yaw Agyekum Addo', 'papayaw@bluespaceafrica.com', '$2y$10$kdpBw0V56WOvOgeyivOBgugj72wvrJnk9zFsMBYiPx/N63N1dbXBq', 'Employee', 'IMG_0320_1765177154.jpeg', '0209550140', NULL, 1, 0, '2026-02-16 09:39:23+00', '2025-11-13 15:04:39+00', '2026-02-16 09:39:23+00'),
(20, 'Michael Ahwireng', 'michaelkofi@bluespaceafrica.com', '$2y$10$rT3n3Zh3xz82DH5pVXtHpefrJ3O97nVGDdkqb5niIsKO3HACY2XlS', 'Employee', 'avatar.png', NULL, NULL, 1, 0, '2025-12-01 19:52:19+00', '2025-11-13 15:05:55+00', '2025-12-02 00:52:19+00'),
(21, 'Wendy Obeng', 'info@bluespaceafrica.com', '$2y$10$dG5MHUlhm80Dxgi6fwJvn.F3LyhPKPpB/7qpI/iD6qy4KJARLfYjC', 'Employee', 'avatar.png', NULL, NULL, 1, 0, NULL, '2025-11-13 15:54:28+00', '2025-12-16 21:03:06+00'),
(22, 'Samuel Amanor', 'amanor.samuel@bluespaceafrica.com', '$2y$10$/ClaCpvE7yWMKQl13PFpBuRv58Hj3/6vNSSZVN88aa8B1.oI2ZvTe', 'Manager', 'avatar.png', NULL, NULL, 1, 0, NULL, '2025-12-02 18:53:31+00', '2025-12-02 18:53:31+00');

SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT MAX(id) FROM public.users));

-- ===================== EMPLOYEES =====================
INSERT INTO public.employees (id, user_id, name, dob, gender, phone, address, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, email, password, employee_id, branch_id, department_id, designation_id, company_doj, is_active, created_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(3, 6, 'Emmanuel Johnson-Excellent', NULL, NULL, '0242371341', 'Nii Nortey Palm Crescent ', NULL, NULL, NULL, 'emmanuel@bluespaceafrica.com', '$2a$10$.IDkTRsSHyTK104x5oMgD.V5YDu0ZSgHxNTiWiwpSlBid.YYHIU1m', '2', 0, 0, 0, NULL, 1, 1, '2025-10-24 17:55:03+00', '2025-10-24 17:55:03+00'),
(5, 9, 'Samuel Awuku', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'samuel.awuku@bluespaceafrica.com', '$2y$10$TaH2s8mAT266U1p7ph1mruWUU.lQYf9.XChNHsLGz6Gk6qybgugNe', '4', 0, 0, 0, NULL, 1, 1, '2025-11-06 15:42:28+00', '2025-11-06 15:42:28+00'),
(6, 10, 'Karikari Adade', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'karikari@bluespaceafrica.com', '$2y$10$zaBJmEx.CqTTrM2rcP1LJ.y8JzUY5tHKylStX98.REkcoLG4UbCMK', '5', 0, 0, 0, NULL, 1, 1, '2025-11-06 15:51:10+00', '2025-11-06 15:51:10+00'),
(7, 11, 'Charles Kobina', '1996-11-28', 'Male', '+233242545857', '12 Nii Annan Lane', NULL, NULL, NULL, 'innovation@bluespaceafrica.com', '$2y$10$.Hmjho0DwKx0j4s.8LBm7O0cWfmZJzR/z7V4myYCJ75BX6yXH1h2.', '6', 1, 3, 11, '2023-06-12', 1, 1, '2025-11-13 14:47:52+00', '2025-11-13 15:30:28+00'),
(8, 12, 'Johnnie Oduro', '1999-01-06', 'Male', '+233200154779', 'Upsa East Legon', NULL, NULL, NULL, 'johnnie@bluespaceafrica.com', '$2y$10$KSnY9l0.I8z5jFXASvdLfeGcIs8L9LvBm8iH7NRGDpIFkf13idmAm', '7', 1, 1, 5, '2023-07-01', 1, 1, '2025-11-13 14:50:18+00', '2025-11-13 15:28:34+00'),
(9, 13, 'Chukwuemeka Ndukwe', '1992-10-25', 'Male', '+233501693352', 'Silver Lane, old Ashogman Accra', NULL, NULL, NULL, 'chukwuemeka@bluespaceafrica.com', '$2y$10$A4cqylOrEiLq8qthr2HSnu6x1trqkya6gRejv/wFDFRjrm0XbAM2O', '8', 1, 3, 14, '2023-06-01', 1, 1, '2025-11-13 14:56:25+00', '2025-11-13 15:37:37+00'),
(10, 14, 'Paul Maen', '1991-08-11', 'Male', '0546832637', '20 peakcock street\nChristian village, Achimota', NULL, NULL, NULL, 'paul@bluespaceafrica.com', '$2y$10$pYSUPoIJE.JSuX3e7.yvyOsTo4tFfNZPPLYwh32FZBeG4No5oVN.O', '9', 1, 3, 11, '2023-07-01', 1, 1, '2025-11-13 14:57:24+00', '2025-11-13 15:34:31+00'),
(11, 15, 'Rita Uyaelumo', '1989-05-25', 'Female', '+233242329323', 'Nii Ago Jj Lane 24', NULL, NULL, NULL, 'rita@bluespaceafrica.com', '$2y$10$J8ifqppHRYaodd4FDR4P7eyoJeosGbtCjXB1y/IkQtd80rDev.rBy', '10', 1, 1, 6, '2024-08-01', 1, 1, '2025-11-13 14:58:22+00', '2025-11-13 16:04:10+00'),
(12, 16, 'Kwame Plahar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'kwame@bluespaceafrica.com', '$2y$10$QZAlUUKGqRz6RV/3q2d25eVKzEQfqHRohusvYSt10a6xyjyj28m8a', '11', 0, 0, 0, NULL, 1, 1, '2025-11-13 14:59:22+00', '2025-11-13 14:59:22+00'),
(13, 17, 'Kelvin Abraham', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'kelvin@bluespaceafrica.com', '$2y$10$aeQkEi1UWTdqn6plMoKEGOiDE84QlmK9KSmhWlfkw8WjnuEonwdwS', '12', 0, 0, 0, NULL, 1, 1, '2025-11-13 15:01:58+00', '2025-11-13 15:01:58+00'),
(14, 18, 'Kenneth Ekow Inkum', '1992-03-26', 'Male', '+233549584088', 'Hse B240/6 Abbosey Okai Road', NULL, NULL, NULL, 'kenneth@bluespaceafrica.com', '$2y$10$ZdPoPpujw6Hz4zG6SwBoDOKdGUeQ01pC0N.EIrIX/.XpRkHUT7z/O', '13', 1, 1, 2, '2022-08-01', 1, 1, '2025-11-13 15:03:21+00', '2025-11-13 15:44:58+00'),
(15, 19, 'Papa Yaw Agyekum Addo', '1997-04-24', 'Male', '+233209550140', 'Sakumono Estates SSnit Flats A1/4, Comm. 13, Tema, Ghana', NULL, NULL, NULL, 'papayaw@bluespaceafrica.com', '$2y$10$kdpBw0V56WOvOgeyivOBgugj72wvrJnk9zFsMBYiPx/N63N1dbXBq', '14', 1, 3, 14, '2025-02-03', 1, 1, '2025-11-13 15:04:39+00', '2025-11-13 15:48:42+00'),
(16, 20, 'Michael Ahwireng', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'michaelkofi@bluespaceafrica.com', '$2y$10$rT3n3Zh3xz82DH5pVXtHpefrJ3O97nVGDdkqb5niIsKO3HACY2XlS', '15', 0, 0, 0, NULL, 1, 1, '2025-11-13 15:05:55+00', '2025-11-13 15:05:55+00'),
(17, 21, 'Wendy Obeng', '1997-03-19', 'Female', '+233240215671', 'Ashaley Botwe, GD-0861315', NULL, NULL, NULL, 'info@bluespaceafrica.com', '$2y$10$dG5MHUlhm80Dxgi6fwJvn.F3LyhPKPpB/7qpI/iD6qy4KJARLfYjC', '16', 1, 2, 15, '2025-03-03', 1, 1, '2025-11-13 15:54:28+00', '2025-12-16 21:03:06+00'),
(18, 22, 'Samuel Amanor', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'amanor.samuel@bluespaceafrica.com', '$2y$10$/ClaCpvE7yWMKQl13PFpBuRv58Hj3/6vNSSZVN88aa8B1.oI2ZvTe', '17', 0, 0, 0, NULL, 1, 1, '2025-12-02 18:53:31+00', '2025-12-02 18:53:31+00');

SELECT setval(pg_get_serial_sequence('public.employees', 'id'), (SELECT MAX(id) FROM public.employees));

-- ===================== LEAVE TYPES =====================
INSERT INTO public.leave_types (id, title, days, max_consecutive_days, requires_approval, allow_carry_forward, carry_forward_limit, created_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(1, 'Annual Leave', 21, NULL, 1, 0, NULL, 1, '2025-10-27 09:09:51+00', '2025-11-06 15:35:06+00'),
(2, 'Sick Leave', 10, NULL, 1, 0, NULL, 1, '2025-10-27 09:10:29+00', '2026-07-08 11:53:41+00'),
(4, 'Maternity Leave', 90, NULL, 1, 0, NULL, 1, '2025-10-27 09:12:26+00', '2025-10-27 09:12:26+00'),
(5, 'Marriage Leave', 10, NULL, 1, 0, NULL, 1, '2025-10-27 09:13:13+00', '2025-10-27 09:13:13+00'),
(6, 'Bereavement / Compassionate Leave', 7, NULL, 1, 0, NULL, 1, '2025-10-27 09:13:43+00', '2025-10-27 09:13:43+00');

SELECT setval(pg_get_serial_sequence('public.leave_types', 'id'), (SELECT MAX(id) FROM public.leave_types));

-- ===================== LEAVES =====================
INSERT INTO public.leaves (id, employee_id, leave_type_id, applied_on, start_date, end_date, total_leave_days, leave_reason, remark, status, half_day_type, attachment, created_by, handover_to, handover_notes, contact_during_leave, leave_address, is_half_day, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(3, 6, 1, '2025-11-06', '2025-12-01', '2025-12-19', '19', 'I''ve been working continuously throughout the year and would like to take some time off to rest and recharge.', 'Please let me know if the proposed timing works for operations planning or if any adjustments are needed.', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2025-11-06 16:03:29+00', '2025-11-06 16:13:03+00'),
(4, 5, 1, '2025-11-06', '2025-11-10', '2025-11-14', '5', 'I would like to request a one-week leave to rest and recharge.', 'N/A', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2025-11-06 18:04:39+00', '2025-11-06 18:40:10+00'),
(5, 16, 1, '2025-12-01', '2025-12-02', '2025-12-12', '11', 'I am requesting leave in order to attend to and oversee the funeral and burial arrangements for my late mother.', 'N/a', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2025-12-02 01:00:28+00', '2025-12-02 18:51:12+00'),
(6, 15, 1, '2026-02-16', '2026-02-20', '2026-02-20', '1', 'Travel to Kumasi for Family Event', 'Request for 1 day leave of absence', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2026-02-16 09:41:40+00', '2026-02-16 12:13:05+00'),
(8, 14, 1, '2026-02-27', '2026-03-09', '2026-03-23', '15', 'I''d like to recoupe and reenergize after working tirelessly without break for a long time.', 'Looking forward to your kind consideration.', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2026-02-27 11:57:05+00', '2026-03-09 10:13:11+00'),
(9, 13, 1, '2026-03-08', '2026-03-09', '2026-03-27', '19', 'The Marriage ceremony will be held in Kumasi.', 'Emergent', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2026-03-08 14:38:19+00', '2026-03-09 10:12:17+00'),
(12, 9, 1, '2026-07-06', '2026-07-13', '2026-07-24', '9', 'Annual Leave', '', 'Approved', NULL, NULL, 13, 11, '', '', '', 0, '2026-07-06 19:44:34+00', '2026-07-08 11:45:55+00'),
(15, 10, 5, '2026-07-21', '2026-08-10', '2026-08-21', '10', 'Marriage Ceremony ', 'Approved', 'Approved', NULL, NULL, 14, 7, 'Please contact Charles for all startup and talent related matters', '0546832637', '', 0, '2026-07-21 13:40:39+00', '2026-07-21 14:09:01+00'),
(16, 10, 1, '2026-07-21', '2026-08-24', '2026-08-28', '5', 'Honeymoon ', 'Congratulations on your Marital Bliss', 'Approved', NULL, NULL, 14, 7, '', '', '', 0, '2026-07-21 13:43:05+00', '2026-07-21 14:09:40+00');

SELECT setval(pg_get_serial_sequence('public.leaves', 'id'), (SELECT MAX(id) FROM public.leaves));

-- ===================== NOTIFICATIONS =====================
INSERT INTO public.notifications (id, user_id, type, data, is_read, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
(1, 22, 'leave_submitted', '{"leaveId":10,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Marriage Leave"}', 0, '2026-07-06 19:29:15+00', '2026-07-06 19:29:15+00'),
(2, 13, 'leave_handover', '{"leaveId":10,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Marriage Leave","startDate":"2026-07-08","endDate":"2026-07-16"}', 0, '2026-07-06 19:29:16+00', '2026-07-06 19:29:16+00'),
(3, 6, 'leave_approved', '{"leaveId":"10","leaveType":"Marriage Leave","status":"Approved","reviewer":"BlueSPACE Africa"}', 0, '2026-07-06 19:29:51+00', '2026-07-06 19:29:51+00'),
(4, 22, 'leave_submitted', '{"leaveId":11,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Marriage Leave"}', 0, '2026-07-06 19:31:53+00', '2026-07-06 19:31:53+00'),
(5, 6, 'leave_handover', '{"leaveId":11,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Marriage Leave","startDate":"2026-07-08","endDate":"2026-07-16"}', 0, '2026-07-06 19:31:54+00', '2026-07-06 19:31:54+00'),
(6, 6, 'leave_approved', '{"leaveId":"11","leaveType":"Marriage Leave","status":"Approved","reviewer":"BlueSPACE Africa"}', 0, '2026-07-06 19:32:12+00', '2026-07-06 19:32:12+00'),
(7, 22, 'leave_submitted', '{"leaveId":12,"employeeName":"Chukwuemeka Ndukwe","leaveType":"Annual Leave"}', 0, '2026-07-06 19:44:34+00', '2026-07-06 19:44:34+00'),
(8, 15, 'leave_handover', '{"leaveId":12,"employeeName":"Chukwuemeka Ndukwe","leaveType":"Annual Leave","startDate":"2026-07-13","endDate":"2026-07-24"}', 0, '2026-07-06 19:44:35+00', '2026-07-06 19:44:35+00'),
(9, 22, 'leave_submitted', '{"leaveId":13,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Bereavement / Compassionate Leave"}', 0, '2026-07-07 00:17:04+00', '2026-07-07 00:17:04+00'),
(10, 6, 'leave_handover', '{"leaveId":13,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Bereavement / Compassionate Leave","startDate":"2026-07-08","endDate":"2026-07-11"}', 0, '2026-07-07 00:17:05+00', '2026-07-07 00:17:05+00'),
(11, 6, 'leave_rejected', '{"leaveId":"13","leaveType":"Bereavement / Compassionate Leave","status":"Rejected","reviewer":"BlueSPACE Africa"}', 1, '2026-07-07 00:18:34+00', '2026-07-07 00:18:34+00'),
(12, 13, 'leave_approved', '{"leaveId":"12","leaveType":"Annual Leave","status":"Approved","reviewer":"BlueSPACE Africa"}', 0, '2026-07-08 11:45:55+00', '2026-07-08 11:45:55+00'),
(13, 1, 'leave_submitted', '{"leaveId":14,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Annual Leave"}', 1, '2026-07-21 13:22:22+00', '2026-07-21 13:22:22+00'),
(14, 22, 'leave_submitted', '{"leaveId":14,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Annual Leave"}', 0, '2026-07-21 13:22:25+00', '2026-07-21 13:22:25+00'),
(15, 6, 'leave_handover', '{"leaveId":14,"employeeName":"Emmanuel Johnson-Excellent","leaveType":"Annual Leave","startDate":"2026-07-22","endDate":"2026-07-30"}', 0, '2026-07-21 13:22:29+00', '2026-07-21 13:22:29+00'),
(16, 1, 'leave_submitted', '{"leaveId":15,"employeeName":"Paul Maen","leaveType":"Marriage Leave"}', 1, '2026-07-21 13:40:39+00', '2026-07-21 13:40:39+00'),
(17, 22, 'leave_submitted', '{"leaveId":15,"employeeName":"Paul Maen","leaveType":"Marriage Leave"}', 0, '2026-07-21 13:40:42+00', '2026-07-21 13:40:42+00'),
(18, 11, 'leave_handover', '{"leaveId":15,"employeeName":"Paul Maen","leaveType":"Marriage Leave","startDate":"2026-08-10","endDate":"2026-08-21"}', 0, '2026-07-21 13:40:45+00', '2026-07-21 13:40:45+00'),
(19, 1, 'leave_submitted', '{"leaveId":16,"employeeName":"Paul Maen","leaveType":"Annual Leave"}', 1, '2026-07-21 13:43:05+00', '2026-07-21 13:43:05+00'),
(20, 22, 'leave_submitted', '{"leaveId":16,"employeeName":"Paul Maen","leaveType":"Annual Leave"}', 0, '2026-07-21 13:43:08+00', '2026-07-21 13:43:08+00'),
(21, 11, 'leave_handover', '{"leaveId":16,"employeeName":"Paul Maen","leaveType":"Annual Leave","startDate":"2026-08-24","endDate":"2026-08-28"}', 0, '2026-07-21 13:43:10+00', '2026-07-21 13:43:10+00'),
(22, 14, 'leave_approved', '{"leaveId":"15","leaveType":"Marriage Leave","status":"Approved","reviewer":"BlueSPACE Financial Cloud"}', 1, '2026-07-21 14:09:01+00', '2026-07-21 14:09:01+00'),
(23, 14, 'leave_approved', '{"leaveId":"16","leaveType":"Annual Leave","status":"Approved","reviewer":"BlueSPACE Financial Cloud"}', 1, '2026-07-21 14:09:40+00', '2026-07-21 14:09:40+00');

SELECT setval(pg_get_serial_sequence('public.notifications', 'id'), (SELECT MAX(id) FROM public.notifications));
