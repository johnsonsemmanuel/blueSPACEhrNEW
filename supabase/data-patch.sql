-- =============================================================
-- Data Patch — Insert missing leaves, notifications, holidays
-- Run AFTER fix-rls-and-fk.sql in Supabase SQL Editor
-- Uses ON CONFLICT DO NOTHING so it's safe to re-run.
-- =============================================================

-- ===================== LEAVES =====================
INSERT INTO public.leaves (id, employee_id, leave_type_id, applied_on, start_date, end_date, total_leave_days, leave_reason, remark, status, half_day_type, attachment, created_by, handover_to, handover_notes, contact_during_leave, leave_address, is_half_day, created_at, updated_at)
  OVERRIDING SYSTEM VALUE VALUES
(3, 6, 1, '2025-11-06', '2025-12-01', '2025-12-19', '19', 'I''ve been working continuously throughout the year and would like to take some time off to rest and recharge.', 'Please let me know if the proposed timing works for operations planning or if any adjustments are needed.', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2025-11-06 16:03:29+00', '2025-11-06 16:13:03+00'),
(4, 5, 1, '2025-11-06', '2025-11-10', '2025-11-14', '5', 'I would like to request a one-week leave to rest and recharge.', 'N/A', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2025-11-06 18:04:39+00', '2025-11-06 18:40:10+00'),
(5, 16, 1, '2025-12-01', '2025-12-02', '2025-12-12', '11', 'I am requesting leave in order to attend to and oversee the funeral and burial arrangements for my late mother.', 'N/a', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2025-12-02 01:00:28+00', '2025-12-02 18:51:12+00'),
(6, 15, 1, '2026-02-16', '2026-02-20', '2026-02-20', '1', 'Travel to Kumasi for Family Event', 'Request for 1 day leave of absence', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2026-02-16 09:41:40+00', '2026-02-16 12:13:05+00'),
(8, 14, 1, '2026-02-27', '2026-03-09', '2026-03-23', '15', 'I''d like to recoupe and reenergize after working tirelessly without break for a long time.', 'Looking forward to your kind consideration.', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2026-02-27 11:57:05+00', '2026-03-09 10:13:11+00'),
(9, 13, 1, '2026-03-08', '2026-03-09', '2026-03-27', '19', 'The Marriage ceremony will be held in Kumasi.', 'Emergent', 'Approved', NULL, NULL, 1, NULL, NULL, NULL, NULL, 0, '2026-03-08 14:38:19+00', '2026-03-09 10:12:17+00'),
(12, 9, 1, '2026-07-06', '2026-07-13', '2026-07-24', '9', 'Annual Leave', '', 'Approved', NULL, NULL, 13, 11, '', '', '', 0, '2026-07-06 19:44:34+00', '2026-07-08 11:45:55+00'),
(15, 10, 5, '2026-07-21', '2026-08-10', '2026-08-21', '10', 'Marriage Ceremony ', 'Approved', 'Approved', NULL, NULL, 14, 7, 'Please contact Charles for all startup and talent related matters', '0546832637', '', 0, '2026-07-21 13:40:39+00', '2026-07-21 14:09:01+00'),
(16, 10, 1, '2026-07-21', '2026-08-24', '2026-08-28', '5', 'Honeymoon ', 'Congratulations on your Marital Bliss', 'Approved', NULL, NULL, 14, 7, '', '', '', 0, '2026-07-21 13:43:05+00', '2026-07-21 14:09:40+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.leaves', 'id'), (SELECT COALESCE(MAX(id), 0) FROM public.leaves));

-- ===================== NOTIFICATIONS =====================
INSERT INTO public.notifications (id, user_id, type, data, is_read, created_at, updated_at)
  OVERRIDING SYSTEM VALUE VALUES
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
(23, 14, 'leave_approved', '{"leaveId":"16","leaveType":"Annual Leave","status":"Approved","reviewer":"BlueSPACE Financial Cloud"}', 1, '2026-07-21 14:09:40+00', '2026-07-21 14:09:40+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.notifications', 'id'), (SELECT COALESCE(MAX(id), 0) FROM public.notifications));
