/*
  # Comprehensive Demo Data for All Functionalities

  1. New Tickets - 19 additional tickets across all categories
  2. Comments - Conversation threads
  3. Audit Logs - Activity history
  4. Notifications - For all users
  5. Agent Category Mappings
  6. Escalation Rules
  7. Holidays
*/

DO $$
DECLARE
  emp_john UUID := '8df4c2f3-833b-4072-817e-75fd815264e2';
  emp_jane UUID := 'f1cac81c-0d91-455f-bac0-697aa0d011cf';
  emp_mike UUID := '54029694-25fc-4948-a3d0-6e6780b24da9';
  emp_sarah UUID := 'b6f9049b-1f37-47ef-9554-1070ebb3a10b';
  emp_david UUID := '6b3880a6-95b5-4994-969c-8a7d596c61c6';
  
  hr_priya UUID := '8c4cdc0d-08c7-4bb9-a3d4-03338c1fb586';
  hr_rahul UUID := '6067a8e8-f6cd-4faf-afe7-58674580d0b9';
  hr_anjali UUID := 'ad28487f-1b34-4331-bd5e-04a27ae025b1';
  hr_vikram UUID := '7243e890-1232-40bf-b6f8-c25f423b62fe';
  
  admin_user UUID := 'b98ee841-4c83-4ca5-a4ac-56e1e5460166';
  
  cat_attendance UUID := 'f97ca02f-4645-46b1-bb3e-0e1114ce545d';
  cat_payroll UUID := '8aa65292-9cda-4a33-abe5-f3106986239e';
  cat_recruit UUID := 'b2a44b74-35cd-4891-a857-21eeb1bbdcab';
  cat_emprel UUID := '66b8d7cc-0b33-4d8c-bafd-da2695f8bbae';
  cat_posh UUID := '2853993b-a56b-4492-aacd-d9bf7c015734';
  cat_perf UUID := '6f2c8898-f3e5-4a88-a41c-e48acb4ed588';
  cat_policy UUID := '5c286d79-4fe4-4421-88f3-1591935ece2f';
  cat_general UUID := 'eb647d0c-fe5f-442f-a720-1490f064f672';
  
  dept_eng UUID := 'bdc63b03-d062-4d9a-b391-2c48cbf4010a';
  dept_sales UUID := 'a6eac2fe-35ea-4ef7-9973-85513b065fe4';
  dept_marketing UUID := '3e241039-81b4-4678-8e29-0a993273895e';
  dept_finance UUID := 'a19aab89-f9d6-4a67-981a-3956cc4b50ce';
  
  ticket_id UUID;
  base_time TIMESTAMPTZ := NOW();
BEGIN

  INSERT INTO agent_category_mappings (agent_id, category_id, is_active)
  VALUES
    (hr_priya, cat_attendance, true),
    (hr_priya, cat_payroll, true),
    (hr_priya, cat_general, true),
    (hr_rahul, cat_recruit, true),
    (hr_rahul, cat_perf, true),
    (hr_rahul, cat_general, true),
    (hr_anjali, cat_emprel, true),
    (hr_anjali, cat_policy, true),
    (hr_anjali, cat_general, true),
    (hr_vikram, cat_posh, true),
    (hr_vikram, cat_emprel, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO escalation_rules (category_id, level, trigger_after_hours, notify_user_ids, is_active)
  VALUES
    (cat_attendance, 1, 4, ARRAY[hr_priya], true),
    (cat_attendance, 2, 8, ARRAY[hr_priya, admin_user], true),
    (cat_payroll, 1, 2, ARRAY[hr_priya], true),
    (cat_payroll, 2, 4, ARRAY[hr_priya, admin_user], true),
    (cat_posh, 1, 1, ARRAY[hr_vikram, admin_user], true),
    (cat_posh, 2, 2, ARRAY[admin_user], true),
    (cat_recruit, 1, 8, ARRAY[hr_rahul], true),
    (cat_emprel, 1, 4, ARRAY[hr_anjali], true),
    (cat_emprel, 2, 8, ARRAY[hr_anjali, admin_user], true),
    (cat_perf, 1, 8, ARRAY[hr_rahul], true),
    (cat_policy, 1, 8, ARRAY[hr_anjali], true),
    (cat_general, 1, 8, ARRAY[hr_priya, hr_rahul, hr_anjali], true)
  ON CONFLICT DO NOTHING;

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status, 
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1009', 'Incorrect leave balance showing in portal',
    'My portal shows 8 annual leaves but I should have 12 remaining. The calculation seems wrong after my last leave request.',
    cat_attendance, emp_john, 'John Doe', dept_eng, 'high', 'portal', hr_priya, 'in_progress',
    base_time - INTERVAL '2 hours', base_time + INTERVAL '6 hours',
    base_time - INTERVAL '3 hours', false, false, 'hr_agent', emp_john, base_time - INTERVAL '4 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, emp_john, 'John Doe', 'I noticed this after checking my leave balance today. Can you please verify?', false),
    (ticket_id, hr_priya, 'Priya Sharma', 'Hi John, I am checking the leave records now. Will update shortly.', false),
    (ticket_id, hr_priya, 'Priya Sharma', 'Internal note: Need to check if the sick leave was incorrectly deducted from annual quota.', true);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, first_response_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, escalation_status, escalation_level,
    pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1010', 'Missing bonus in December salary',
    'My performance bonus was approved but not reflected in December payslip. Finance confirmed it was processed.',
    cat_payroll, emp_jane, 'Jane Smith', dept_sales, 'critical', 'email', hr_priya, 'escalated',
    base_time - INTERVAL '10 hours', base_time - INTERVAL '2 hours',
    base_time - INTERVAL '9 hours', base_time - INTERVAL '9 hours',
    false, true, 'escalated', 2, 'hr_agent', emp_jane, base_time - INTERVAL '12 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, emp_jane, 'Jane Smith', 'This is urgent as I have EMI payments due. The bonus was approved on 15th Dec.', false),
    (ticket_id, hr_priya, 'Priya Sharma', 'Escalating to payroll team. Sorry for the delay, Jane.', false),
    (ticket_id, hr_priya, 'Priya Sharma', 'Internal: Escalated to L2, payroll processing error confirmed', true);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at,
    sla_paused_at, sla_pause_duration_minutes,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1011', 'Need experience letter for visa application',
    'I am applying for a visa and need an official experience letter. Please provide it at the earliest.',
    cat_general, emp_mike, 'Mike Johnson', dept_marketing, 'high', 'portal', hr_rahul, 'waiting_for_employee',
    base_time - INTERVAL '1 hour', base_time + INTERVAL '15 hours',
    base_time - INTERVAL '30 minutes', 90,
    false, false, 'employee', emp_mike, base_time - INTERVAL '5 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_rahul, 'Rahul Verma', 'Hi Mike, I have prepared the draft. Please confirm your designation title and joining date.', false),
    (ticket_id, hr_rahul, 'Rahul Verma', 'SLA paused - waiting for employee response', true);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at, resolved_at,
    is_acknowledgement_breached, is_resolution_breached, employee_rating, rating_comment,
    reopened_count, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1012', 'PF withdrawal process and timeline',
    'I need to understand the process for partial PF withdrawal for home loan down payment.',
    cat_payroll, emp_sarah, 'Sarah Wilson', dept_finance, 'medium', 'portal', hr_priya, 'reopened',
    base_time - INTERVAL '20 hours', base_time - INTERVAL '4 hours',
    base_time - INTERVAL '19 hours', base_time - INTERVAL '6 hours',
    false, false, 3, 'Information was incomplete, had to reopen',
    1, 'hr_agent', emp_sarah, base_time - INTERVAL '24 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_priya, 'Priya Sharma', 'You can apply through the EPFO portal. Processing takes 15-20 days.', false),
    (ticket_id, emp_sarah, 'Sarah Wilson', 'But I need the employer approval form. Can you provide that?', false),
    (ticket_id, hr_priya, 'Priya Sharma', 'Reopening ticket to provide the form.', false);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, status,
    acknowledgement_due_at, resolution_due_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1013', 'Interview feedback submission delay',
    'I conducted 3 interviews last week but the feedback portal is showing errors. How do I submit?',
    cat_recruit, emp_david, 'David Brown', dept_eng, 'medium', 'portal', 'open',
    base_time + INTERVAL '3 hours', base_time + INTERVAL '24 hours',
    false, false, 'hr_agent', emp_david, base_time - INTERVAL '1 hour'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1014', 'Performance review cycle clarification',
    'When is the next performance review cycle? I want to prepare my achievements document.',
    cat_perf, emp_john, 'John Doe', dept_eng, 'low', 'portal', hr_rahul, 'acknowledged',
    base_time + INTERVAL '6 hours', base_time + INTERVAL '40 hours',
    base_time - INTERVAL '10 minutes', false, false, 'hr_agent', emp_john, base_time - INTERVAL '2 hours'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at, resolved_at, closed_at,
    is_acknowledgement_breached, is_resolution_breached, employee_rating, rating_comment,
    closure_notes, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1015', 'Maternity leave policy document request',
    'Can you share the detailed maternity leave policy document? Planning ahead.',
    cat_policy, emp_jane, 'Jane Smith', dept_sales, 'low', 'portal', hr_anjali, 'closed',
    base_time - INTERVAL '44 hours', base_time - INTERVAL '20 hours',
    base_time - INTERVAL '43 hours', base_time - INTERVAL '24 hours', base_time - INTERVAL '20 hours',
    false, false, 5, 'Very helpful and quick response!',
    'Policy document shared via email', 'none', emp_jane, base_time - INTERVAL '48 hours'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status, is_sensitive,
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1016', 'Workplace harassment concern - Confidential',
    'I need to report a concern about inappropriate behavior from a colleague. Please handle discreetly.',
    cat_posh, emp_sarah, 'Sarah Wilson', dept_finance, 'critical', 'portal', hr_vikram, 'in_progress', true,
    base_time - INTERVAL '30 minutes', base_time + INTERVAL '4 hours',
    base_time - INTERVAL '20 minutes', false, false, 'hr_agent', emp_sarah, base_time - INTERVAL '1 hour'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_vikram, 'Vikram Singh', 'Thank you for reaching out. Your concern is being treated with utmost confidentiality. Can we schedule a call?', false),
    (ticket_id, hr_vikram, 'Vikram Singh', 'POSH case opened. Need to follow formal investigation protocol.', true);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1017', 'Conflict with team member - need mediation',
    'There is ongoing friction with a team member affecting our project. Request HR mediation.',
    cat_emprel, emp_mike, 'Mike Johnson', dept_marketing, 'high', 'email', hr_anjali, 'in_progress',
    base_time - INTERVAL '5 hours', base_time + INTERVAL '10 hours',
    base_time - INTERVAL '4 hours', false, false, 'hr_agent', emp_mike, base_time - INTERVAL '8 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_anjali, 'Anjali Gupta', 'Hi Mike, I understand this is a difficult situation. Lets set up a joint discussion.', false),
    (ticket_id, hr_anjali, 'Anjali Gupta', 'Internal: Scheduling mediation session for next week', true);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, status,
    acknowledgement_due_at, resolution_due_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1018', 'Reimbursement claim rejection appeal',
    'My medical reimbursement claim was rejected citing invalid bills. I have proper documentation.',
    cat_payroll, emp_david, 'David Brown', dept_eng, 'high', 'portal', 'open',
    base_time + INTERVAL '2 hours', base_time + INTERVAL '8 hours',
    false, false, 'hr_agent', emp_david, base_time - INTERVAL '30 minutes'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1019', 'Training certification reimbursement',
    'I completed AWS certification. How do I claim the certification reimbursement benefit?',
    cat_perf, emp_john, 'John Doe', dept_eng, 'low', 'portal', hr_rahul, 'assigned',
    base_time + INTERVAL '4 hours', base_time + INTERVAL '32 hours',
    false, false, 'hr_agent', emp_john, base_time - INTERVAL '45 minutes'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at, resolved_at, closed_at,
    is_acknowledgement_breached, is_resolution_breached, employee_rating,
    closure_notes, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1020', 'Address change in records',
    'I have moved to a new address. Please update my records for correspondence.',
    cat_general, emp_jane, 'Jane Smith', dept_sales, 'low', 'portal', hr_priya, 'closed',
    base_time - INTERVAL '68 hours', base_time - INTERVAL '44 hours',
    base_time - INTERVAL '67 hours', base_time - INTERVAL '50 hours', base_time - INTERVAL '44 hours',
    false, false, 4, 'Address updated in HRMS and payroll systems',
    'none', emp_jane, base_time - INTERVAL '72 hours'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, 
    sla_paused_at, sla_pause_duration_minutes,
    pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1021', 'Internal job posting application status',
    'I applied for the Senior Developer position internally 2 weeks ago. No update received.',
    cat_recruit, emp_mike, 'Mike Johnson', dept_marketing, 'medium', 'portal', hr_rahul, 'waiting_for_internal_review',
    base_time - INTERVAL '10 hours', base_time + INTERVAL '14 hours',
    base_time - INTERVAL '9 hours', false, false,
    base_time - INTERVAL '2 hours', 60,
    'internal', emp_mike, base_time - INTERVAL '14 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_rahul, 'Rahul Verma', 'Your application is under review by the hiring manager. Will update soon.', false),
    (ticket_id, hr_rahul, 'Rahul Verma', 'Waiting for hiring manager feedback. SLA paused.', true);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, escalation_status, escalation_level,
    pending_with, breach_reason, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1022', 'Gratuity calculation query',
    'I completed 5 years this month. Please clarify my gratuity eligibility and estimated amount.',
    cat_payroll, emp_sarah, 'Sarah Wilson', dept_finance, 'medium', 'email', hr_priya, 'escalated',
    base_time - INTERVAL '14 hours', base_time - INTERVAL '2 hours',
    base_time - INTERVAL '13 hours', true, false, 'escalated', 1,
    'hr_agent', 'Complex calculation requiring actuarial input', emp_sarah, base_time - INTERVAL '18 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_priya, 'Priya Sharma', 'Gratuity calculation needs verification from finance team. Escalating for faster resolution.', false);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, status,
    acknowledgement_due_at, resolution_due_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1023', 'Comp-off request not approved for 3 weeks',
    'I worked on a Saturday (March 15) and requested comp-off but it has not been approved yet.',
    cat_attendance, emp_david, 'David Brown', dept_eng, 'medium', 'portal', 'open',
    base_time + INTERVAL '4 hours', base_time + INTERVAL '16 hours',
    false, false, 'hr_agent', emp_david, base_time - INTERVAL '20 minutes'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at, resolved_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1024', 'ID card replacement request',
    'I lost my employee ID card. Need a replacement for building access.',
    cat_general, emp_john, 'John Doe', dept_eng, 'medium', 'walk_in', hr_priya, 'resolved',
    base_time - INTERVAL '6 hours', base_time + INTERVAL '18 hours',
    base_time - INTERVAL '5 hours', base_time - INTERVAL '1 hour',
    false, false, 'employee', emp_john, base_time - INTERVAL '8 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_priya, 'Priya Sharma', 'Your new ID card is ready. Please collect from HR desk and bring a passport photo.', false);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1025', 'Remote work equipment allowance',
    'Is there any allowance for home office setup? I need to purchase a chair and monitor.',
    cat_policy, emp_jane, 'Jane Smith', dept_sales, 'low', 'phone', hr_anjali, 'in_progress',
    base_time - INTERVAL '3 hours', base_time + INTERVAL '21 hours',
    base_time - INTERVAL '2 hours', false, false, 'hr_agent', emp_jane, base_time - INTERVAL '6 hours'
  );
  INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal)
  VALUES 
    (ticket_id, hr_anjali, 'Anjali Gupta', 'Yes, we have a work from home allowance policy. Let me get you the details.', false);

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at,
    is_acknowledgement_breached, is_resolution_breached, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1026', 'Promotion criteria and timeline',
    'What are the criteria for promotion to Senior level? I have been at current level for 2 years.',
    cat_perf, emp_mike, 'Mike Johnson', dept_marketing, 'medium', 'portal', hr_rahul, 'assigned',
    base_time + INTERVAL '3 hours', base_time + INTERVAL '24 hours',
    false, false, 'hr_agent', emp_mike, base_time - INTERVAL '1 hour'
  );

  ticket_id := gen_random_uuid();
  INSERT INTO tickets (
    id, ticket_number, title, description, category_id, requester_id, requester_name,
    department_id, priority, source, assigned_agent_id, status,
    acknowledgement_due_at, resolution_due_at, acknowledged_at, resolved_at, closed_at,
    is_acknowledgement_breached, is_resolution_breached, employee_rating, rating_comment,
    closure_notes, pending_with, created_by, created_at
  ) VALUES (
    ticket_id, 'HR-1027', 'Exit interview scheduling',
    'I have submitted my resignation. Please schedule my exit interview.',
    cat_emprel, emp_david, 'David Brown', dept_eng, 'medium', 'email', hr_anjali, 'closed',
    base_time - INTERVAL '50 hours', base_time - INTERVAL '26 hours',
    base_time - INTERVAL '49 hours', base_time - INTERVAL '30 hours', base_time - INTERVAL '26 hours',
    false, false, 5, 'Exit interview was thorough and professional',
    'Exit interview completed. Feedback documented.', 'none', emp_david, base_time - INTERVAL '54 hours'
  );

  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT emp_john, 'ticket_update', 'Your ticket has been updated', 
    'HR has responded to your leave balance inquiry', t.id, 'HR-1009', false, base_time - INTERVAL '2 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1009';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT emp_jane, 'escalation', 'Ticket Escalated', 
    'Your bonus query has been escalated for faster resolution', t.id, 'HR-1010', false, base_time - INTERVAL '4 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1010';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT emp_mike, 'ticket_update', 'Action Required', 
    'HR is waiting for your response on the experience letter ticket', t.id, 'HR-1011', false, base_time - INTERVAL '30 minutes'
  FROM tickets t WHERE t.ticket_number = 'HR-1011';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT emp_sarah, 'ticket_update', 'Ticket Reopened', 
    'Your PF withdrawal ticket has been reopened', t.id, 'HR-1012', false, base_time - INTERVAL '3 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1012';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT hr_priya, 'new_ticket', 'New High Priority Ticket', 
    'New high priority ticket: Reimbursement claim rejection appeal', t.id, 'HR-1018', false, base_time - INTERVAL '30 minutes'
  FROM tickets t WHERE t.ticket_number = 'HR-1018';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT hr_priya, 'escalation', 'Ticket Requires Attention', 
    'Ticket HR-1010 has breached SLA and needs immediate attention', t.id, 'HR-1010', false, base_time - INTERVAL '2 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1010';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT hr_rahul, 'new_ticket', 'New Ticket Assigned', 
    'You have been assigned to ticket: Interview feedback submission delay', t.id, 'HR-1013', true, base_time - INTERVAL '50 minutes'
  FROM tickets t WHERE t.ticket_number = 'HR-1013';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT hr_anjali, 'new_ticket', 'New Employee Relations Ticket', 
    'New mediation request from Mike Johnson', t.id, 'HR-1017', false, base_time - INTERVAL '7 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1017';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT hr_vikram, 'new_ticket', 'URGENT: New POSH Ticket', 
    'New confidential complaint requires immediate attention', t.id, 'HR-1016', false, base_time - INTERVAL '55 minutes'
  FROM tickets t WHERE t.ticket_number = 'HR-1016';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT admin_user, 'escalation', 'L2 Escalation Alert', 
    'Ticket HR-1010 has been escalated to Level 2', t.id, 'HR-1010', false, base_time - INTERVAL '3 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1010';
  
  INSERT INTO notifications (user_id, type, title, message, ticket_id, ticket_number, is_read, created_at)
  SELECT emp_john, 'ticket_resolved', 'Ticket Resolved', 
    'Your ID card replacement request has been resolved', t.id, 'HR-1024', false, base_time - INTERVAL '1 hour'
  FROM tickets t WHERE t.ticket_number = 'HR-1024';

  INSERT INTO audit_logs (entity_type, entity_id, ticket_number, action, description, old_values, new_values, performed_by, performed_by_name, created_at)
  SELECT 'ticket', t.id, 'HR-1009', 'status_change', 'Ticket acknowledged and work started',
    '{"status": "open"}'::jsonb, '{"status": "in_progress"}'::jsonb, hr_priya, 'Priya Sharma', base_time - INTERVAL '3 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1009';
  
  INSERT INTO audit_logs (entity_type, entity_id, ticket_number, action, description, old_values, new_values, performed_by, performed_by_name, created_at)
  SELECT 'ticket', t.id, 'HR-1010', 'escalation', 'Ticket escalated to Level 2 due to SLA breach',
    '{"escalation_level": 1}'::jsonb, '{"escalation_level": 2}'::jsonb, admin_user, 'System Administrator', base_time - INTERVAL '3 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1010';
  
  INSERT INTO audit_logs (entity_type, entity_id, ticket_number, action, description, old_values, new_values, performed_by, performed_by_name, created_at)
  SELECT 'ticket', t.id, 'HR-1012', 'reopen', 'Ticket reopened by employee',
    '{"status": "resolved"}'::jsonb, '{"status": "reopened"}'::jsonb, emp_sarah, 'Sarah Wilson', base_time - INTERVAL '3 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1012';
  
  INSERT INTO audit_logs (entity_type, entity_id, ticket_number, action, description, old_values, new_values, performed_by, performed_by_name, created_at)
  SELECT 'ticket', t.id, 'HR-1015', 'resolved', 'Ticket resolved and closed',
    '{"status": "in_progress"}'::jsonb, '{"status": "closed"}'::jsonb, hr_anjali, 'Anjali Gupta', base_time - INTERVAL '20 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1015';
  
  INSERT INTO audit_logs (entity_type, entity_id, ticket_number, action, description, old_values, new_values, performed_by, performed_by_name, created_at)
  SELECT 'ticket', t.id, 'HR-1024', 'resolved', 'ID card replacement completed',
    '{"status": "in_progress"}'::jsonb, '{"status": "resolved"}'::jsonb, hr_priya, 'Priya Sharma', base_time - INTERVAL '1 hour'
  FROM tickets t WHERE t.ticket_number = 'HR-1024';
  
  INSERT INTO audit_logs (entity_type, entity_id, ticket_number, action, description, old_values, new_values, performed_by, performed_by_name, created_at)
  SELECT 'ticket', t.id, 'HR-1027', 'closed', 'Exit interview completed',
    '{"status": "resolved"}'::jsonb, '{"status": "closed"}'::jsonb, hr_anjali, 'Anjali Gupta', base_time - INTERVAL '26 hours'
  FROM tickets t WHERE t.ticket_number = 'HR-1027';

  INSERT INTO audit_logs (entity_type, entity_id, action, description, performed_by, performed_by_name, created_at)
  VALUES 
    ('user', hr_priya, 'login', 'User logged in', hr_priya, 'Priya Sharma', base_time - INTERVAL '4 hours'),
    ('user', hr_rahul, 'login', 'User logged in', hr_rahul, 'Rahul Verma', base_time - INTERVAL '3 hours'),
    ('user', admin_user, 'login', 'User logged in', admin_user, 'System Administrator', base_time - INTERVAL '5 hours'),
    ('settings', NULL, 'update', 'SLA settings updated', admin_user, 'System Administrator', base_time - INTERVAL '24 hours');

  INSERT INTO holidays (name, holiday_date, is_recurring)
  VALUES
    ('New Year Day', '2026-01-01', true),
    ('Republic Day', '2026-01-26', true),
    ('Holi', '2026-03-14', false),
    ('Good Friday', '2026-04-03', false),
    ('Independence Day', '2026-08-15', true),
    ('Gandhi Jayanti', '2026-10-02', true),
    ('Diwali', '2026-11-14', false),
    ('Christmas', '2026-12-25', true)
  ON CONFLICT DO NOTHING;

END $$;