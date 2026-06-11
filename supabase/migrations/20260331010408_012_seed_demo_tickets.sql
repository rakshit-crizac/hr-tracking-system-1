/*
  # Seed Demo Tickets
  
  Adds realistic demo tickets with various statuses:
  - Open, Assigned, Acknowledged, In Progress
  - Waiting for Employee, Resolved, Closed
  - Reopened, Escalated tickets
  - SLA breaches on some tickets
  - Comments and realistic timelines
  
  Uses existing users, departments, and categories.
*/

DO $$
DECLARE
  dept_engineering uuid;
  dept_sales uuid;
  dept_marketing uuid;
  dept_finance uuid;
  dept_hr uuid;
  
  cat_leave uuid;
  cat_payroll uuid;
  cat_benefits uuid;
  cat_onboarding uuid;
  cat_training uuid;
  cat_policy uuid;
  cat_posh uuid;
  
  emp_john uuid;
  emp_jane uuid;
  emp_mike uuid;
  emp_sarah uuid;
  emp_david uuid;
  
  agent_priya uuid;
  agent_rahul uuid;
  agent_anjali uuid;
  agent_vikram uuid;
  
  admin_user uuid;
  
  ticket_id uuid;
  
BEGIN
  SELECT id INTO dept_engineering FROM departments WHERE code = 'ENG';
  SELECT id INTO dept_sales FROM departments WHERE code = 'SALES';
  SELECT id INTO dept_marketing FROM departments WHERE code = 'MKT';
  SELECT id INTO dept_finance FROM departments WHERE code = 'FIN';
  SELECT id INTO dept_hr FROM departments WHERE code = 'HR';
  
  SELECT id INTO cat_leave FROM ticket_categories WHERE code = 'LEAVE';
  SELECT id INTO cat_payroll FROM ticket_categories WHERE code = 'PAYROLL';
  SELECT id INTO cat_benefits FROM ticket_categories WHERE code = 'BENEFITS';
  SELECT id INTO cat_onboarding FROM ticket_categories WHERE code = 'ONBOARD';
  SELECT id INTO cat_training FROM ticket_categories WHERE code = 'TRAINING';
  SELECT id INTO cat_policy FROM ticket_categories WHERE code = 'POLICY';
  SELECT id INTO cat_posh FROM ticket_categories WHERE code = 'POSH';
  
  SELECT id INTO emp_john FROM users WHERE employee_code = 'EMP001';
  SELECT id INTO emp_jane FROM users WHERE employee_code = 'EMP002';
  SELECT id INTO emp_mike FROM users WHERE employee_code = 'EMP003';
  SELECT id INTO emp_sarah FROM users WHERE employee_code = 'EMP004';
  SELECT id INTO emp_david FROM users WHERE employee_code = 'EMP005';
  
  SELECT id INTO agent_priya FROM users WHERE employee_code = 'HR001';
  SELECT id INTO agent_rahul FROM users WHERE employee_code = 'HR002';
  SELECT id INTO agent_anjali FROM users WHERE employee_code = 'HR003';
  SELECT id INTO agent_vikram FROM users WHERE employee_code = 'HR004';
  
  SELECT id INTO admin_user FROM users WHERE employee_code = 'ADMIN001';
  
  IF agent_anjali IS NOT NULL THEN
    UPDATE users SET is_posh_handler = true WHERE id = agent_anjali;
  END IF;
  
  DELETE FROM ticket_comments WHERE true;
  DELETE FROM ticket_assignment_history WHERE true;
  DELETE FROM tickets WHERE true;
  
  IF cat_leave IS NOT NULL AND emp_john IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id, 
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, created_by, source, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Annual leave request for December holidays', 
      'I would like to apply for annual leave from December 23rd to January 2nd for the holiday season. I have already coordinated with my team lead and ensured my projects will be covered during my absence. Please process this request at your earliest convenience.',
      cat_leave, emp_john, 'John Doe', dept_engineering, 'medium', 'open', NULL,
      now() - interval '2 hours', now() - interval '2 hours', 'hr_agent', 'Ticket needs to be assigned to an agent',
      now() + interval '22 hours', now() + interval '70 hours', emp_john, 'portal', emp_john, 'John Doe');
  END IF;
  
  IF cat_leave IS NOT NULL AND emp_mike IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Sick leave balance inquiry for medical procedure', 
      'Could you please confirm my current sick leave balance? I need to plan for an upcoming medical procedure next month and want to ensure I have sufficient leave days.',
      cat_leave, emp_mike, 'Mike Johnson', dept_sales, 'low', 'acknowledged', agent_priya,
      now() - interval '1 day', now() - interval '6 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '22 hours', now() + interval '48 hours', now() - interval '18 hours', now() - interval '18 hours', emp_mike, 'portal',
      agent_priya, 'Priya Sharma', now() - interval '18 hours', 'Priya Sharma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES (ticket_id, agent_priya, 'Priya Sharma', 'Hello Mike, I have received your request and will check your leave balance in our HRMS system. I will get back to you within 24 hours with the complete breakdown.', false, now() - interval '18 hours');
    INSERT INTO ticket_assignment_history (ticket_id, ticket_number, from_agent_id, from_agent_name, to_agent_id, to_agent_name, assignment_reason, assigned_by, assigned_by_name)
    SELECT ticket_id, ticket_number, NULL, NULL, agent_priya, 'Priya Sharma', 'Auto-assigned based on category mapping', emp_mike, 'Mike Johnson' FROM tickets WHERE id = ticket_id;
  END IF;
  
  IF cat_leave IS NOT NULL AND emp_sarah IS NOT NULL AND agent_rahul IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, sla_paused_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Leave encashment query for accumulated days', 
      'I have accumulated 15 leave days that I would like to encash. Please advise on the process, eligibility criteria, and timeline for processing.',
      cat_leave, emp_sarah, 'Sarah Wilson', dept_marketing, 'medium', 'waiting_for_employee', agent_rahul,
      now() - interval '3 days', now() - interval '1 day', 'employee', 'Awaiting response from employee',
      now() - interval '2 days' - interval '20 hours', now() - interval '1 day', now() - interval '2 days' - interval '16 hours', now() - interval '2 days' - interval '16 hours', now() - interval '1 day', emp_sarah, 'portal',
      agent_rahul, 'Rahul Verma', now() - interval '1 day', 'Rahul Verma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_rahul, 'Rahul Verma', 'Thank you for your inquiry. To process your leave encashment request, I need to verify a few details. Could you please confirm: 1) The number of days you wish to encash, and 2) Whether you want this processed in the current payroll cycle?', false, now() - interval '1 day');
    INSERT INTO ticket_assignment_history (ticket_id, ticket_number, from_agent_id, from_agent_name, to_agent_id, to_agent_name, assignment_reason, assigned_by, assigned_by_name)
    SELECT ticket_id, ticket_number, NULL, NULL, agent_rahul, 'Rahul Verma', 'Auto-assigned based on workload balancing', emp_sarah, 'Sarah Wilson' FROM tickets WHERE id = ticket_id;
  END IF;
  
  IF cat_payroll IS NOT NULL AND emp_david IS NOT NULL AND agent_vikram IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      is_acknowledgement_breached, is_resolution_breached, breach_reason,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Salary slip discrepancy for November - Urgent', 
      'I noticed a significant discrepancy in my November salary slip. The bonus amount shown is Rs. 15,000 less than what was communicated during the annual review meeting. This needs urgent attention as it affects my financial planning.',
      cat_payroll, emp_david, 'David Brown', dept_finance, 'high', 'in_progress', agent_vikram,
      now() - interval '5 days', now() - interval '2 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '4 days' - interval '20 hours', now() - interval '2 days', now() - interval '4 days' - interval '18 hours', now() - interval '4 days' - interval '18 hours', emp_david, 'portal',
      false, true, 'Resolution SLA breached at ' || (now() - interval '2 days')::text || ' - Complex payroll investigation required coordination with Finance team',
      agent_vikram, 'Vikram Singh', now() - interval '1 day', 'Vikram Singh');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_vikram, 'Vikram Singh', 'I understand your concern and apologize for the discrepancy. I am looking into this matter with priority and have escalated it to our payroll team for verification.', false, now() - interval '4 days' - interval '18 hours'),
      (ticket_id, agent_vikram, 'Vikram Singh', 'Internal note: Payroll team confirmed there was a calculation error in the bonus formula. Processing correction now - should reflect in December salary.', true, now() - interval '1 day'),
      (ticket_id, agent_vikram, 'Vikram Singh', 'Update: The payroll team has identified the calculation error. The difference of Rs. 15,000 will be credited along with your December salary. I apologize for any inconvenience caused.', false, now() - interval '1 day');
    INSERT INTO ticket_assignment_history (ticket_id, ticket_number, from_agent_id, from_agent_name, to_agent_id, to_agent_name, assignment_reason, assigned_by, assigned_by_name)
    SELECT ticket_id, ticket_number, NULL, NULL, agent_vikram, 'Vikram Singh', 'Auto-assigned - High priority payroll issue', emp_david, 'David Brown' FROM tickets WHERE id = ticket_id;
  END IF;
  
  IF cat_payroll IS NOT NULL AND emp_jane IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closure_notes, created_by, source,
      employee_rating, rating_comment, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Tax declaration submission assistance needed', 
      'I need assistance with submitting my tax declaration documents for the current financial year. The employee portal seems to be showing an error when I try to upload documents.',
      cat_payroll, emp_jane, 'Jane Smith', dept_engineering, 'medium', 'resolved', agent_priya,
      now() - interval '7 days', now() - interval '4 days', 'employee', 'Employee should confirm resolution or reopen if issue persists',
      now() - interval '6 days' - interval '20 hours', now() - interval '4 days', now() - interval '6 days' - interval '12 hours', now() - interval '6 days' - interval '12 hours', 
      now() - interval '4 days', 'Resolved the portal error by clearing browser cache and resetting the user session. Employee was able to successfully submit all tax declaration documents. Verified the submission is reflecting correctly in the system.', emp_jane, 'portal',
      5, 'Excellent support! Priya was very helpful and resolved my issue quickly. The step-by-step guidance was really appreciated.',
      agent_priya, 'Priya Sharma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_priya, 'Priya Sharma', 'Hello Jane, I understand you are facing issues with the tax declaration portal. Could you please try the following: 1) Clear your browser cache, 2) Try using Chrome or Firefox, 3) Ensure file size is under 2MB. Let me know if this helps.', false, now() - interval '6 days' - interval '12 hours'),
      (ticket_id, emp_jane, 'Jane Smith', 'Thank you! Clearing the cache worked. I was able to upload all my documents successfully.', false, now() - interval '4 days' - interval '2 hours');
    INSERT INTO ticket_assignment_history (ticket_id, ticket_number, from_agent_id, from_agent_name, to_agent_id, to_agent_name, assignment_reason, assigned_by, assigned_by_name)
    SELECT ticket_id, ticket_number, NULL, NULL, agent_priya, 'Priya Sharma', 'Auto-assigned based on category mapping', emp_jane, 'Jane Smith' FROM tickets WHERE id = ticket_id;
  END IF;
  
  IF cat_payroll IS NOT NULL AND emp_mike IS NOT NULL AND agent_vikram IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closed_at, closure_notes, is_read_only, created_by, source,
      employee_rating, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Travel reimbursement processing delay', 
      'My travel reimbursement for the client visit to Mumbai submitted 2 weeks ago (Rs. 25,000) is still pending. Could you please expedite the process? I have the approved expense report.',
      cat_payroll, emp_mike, 'Mike Johnson', dept_sales, 'high', 'closed', agent_vikram,
      now() - interval '14 days', now() - interval '10 days', 'none', 'Ticket is closed - no action required',
      now() - interval '13 days' - interval '16 hours', now() - interval '11 days', now() - interval '13 days' - interval '10 hours', now() - interval '13 days' - interval '10 hours',
      now() - interval '11 days', now() - interval '10 days', 'Expedited the reimbursement processing after coordinating with the Finance department. The amount of Rs. 25,000 has been credited to the employee bank account. Reference number: TRV-2024-1847.', true, emp_mike, 'email',
      4, agent_vikram, 'Vikram Singh');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_vikram, 'Vikram Singh', 'I have located your reimbursement request and will fast-track it with the Finance team.', false, now() - interval '13 days' - interval '10 hours'),
      (ticket_id, agent_vikram, 'Vikram Singh', 'Good news! Your reimbursement has been processed. You should see the credit in your account within 2 business days.', false, now() - interval '11 days');
  END IF;
  
  IF cat_benefits IS NOT NULL AND emp_sarah IS NOT NULL AND agent_rahul IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      escalation_status, escalation_level, last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Health insurance claim rejection - Appeal needed', 
      'My health insurance claim for Rs. 45,000 for a hospital visit last month was rejected. The insurance provider says the procedure (appendix surgery) is not covered, but I believe it should be under our corporate policy as it was an emergency procedure.',
      cat_benefits, emp_sarah, 'Sarah Wilson', dept_marketing, 'critical', 'escalated', agent_rahul,
      now() - interval '4 days', now() - interval '6 hours', 'internal', 'Escalation team needs to review and take action',
      now() - interval '3 days' - interval '20 hours', now() - interval '2 days', now() - interval '3 days' - interval '18 hours', now() - interval '3 days' - interval '18 hours', emp_sarah, 'portal',
      'escalated', 1, agent_rahul, 'Rahul Verma', now() - interval '6 hours', 'Rahul Verma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_rahul, 'Rahul Verma', 'I have reviewed your claim details and completely understand your concern. Emergency surgical procedures should indeed be covered under our policy. Let me coordinate with our insurance liaison to file an appeal.', false, now() - interval '3 days' - interval '18 hours'),
      (ticket_id, agent_rahul, 'Rahul Verma', 'Internal: Escalating to HR Manager for policy clarification. Insurance company citing exclusion clause but this appears to be an emergency case.', true, now() - interval '1 day'),
      (ticket_id, agent_rahul, 'Rahul Verma', 'Update: I have escalated this to our HR Manager and the insurance liaison team. We are preparing a formal appeal. I will keep you posted on the progress.', false, now() - interval '6 hours');
  END IF;
  
  IF cat_benefits IS NOT NULL AND emp_john IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, created_by, source, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Add spouse as dependent to health insurance', 
      'I recently got married (marriage date: November 15th) and would like to add my spouse as a dependent to my health insurance coverage. Please guide me on the documentation required and the process timeline.',
      cat_benefits, emp_john, 'John Doe', dept_engineering, 'medium', 'assigned', agent_priya,
      now() - interval '8 hours', now() - interval '8 hours', 'hr_agent', 'Agent needs to acknowledge the ticket',
      now() + interval '16 hours', now() + interval '64 hours', emp_john, 'portal', emp_john, 'John Doe');
    INSERT INTO ticket_assignment_history (ticket_id, ticket_number, from_agent_id, from_agent_name, to_agent_id, to_agent_name, assignment_reason, assigned_by, assigned_by_name)
    SELECT ticket_id, ticket_number, NULL, NULL, agent_priya, 'Priya Sharma', 'Auto-assigned based on category mapping', emp_john, 'John Doe' FROM tickets WHERE id = ticket_id;
  END IF;
  
  IF cat_benefits IS NOT NULL AND emp_david IS NOT NULL AND agent_anjali IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closure_notes, 
      reopened_count, reopen_reason, created_by, source, last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Gym membership benefit activation issue', 
      'I am trying to activate the gym membership benefit mentioned in my offer letter but the HR portal does not show this option under my benefits section.',
      cat_benefits, emp_david, 'David Brown', dept_finance, 'low', 'reopened', agent_anjali,
      now() - interval '10 days', now() - interval '1 day', 'hr_agent', 'Agent needs to review and address reopened concerns',
      now() - interval '9 days' - interval '20 hours', now() - interval '7 days', now() - interval '9 days' - interval '16 hours', now() - interval '9 days' - interval '16 hours',
      now() - interval '8 days', 'Enabled gym membership module in HR portal for the employee. Benefit should now be visible.',
      1, 'The portal still shows the benefit as inactive after logging out and back in. The activation link is still not appearing. Need further assistance.', emp_david, 'portal',
      emp_david, 'David Brown', now() - interval '1 day', 'David Brown');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_anjali, 'Anjali Gupta', 'I have enabled the gym membership benefit in your profile. Please log out and log back into the portal to see the changes reflected.', false, now() - interval '8 days'),
      (ticket_id, emp_david, 'David Brown', 'Thank you for the update.', false, now() - interval '7 days' - interval '20 hours'),
      (ticket_id, emp_david, 'David Brown', 'I tried logging out and back in multiple times but the benefit still shows as inactive. The activation link is not appearing. Could you please check again?', false, now() - interval '1 day');
  END IF;
  
  IF cat_onboarding IS NOT NULL AND emp_jane IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Laptop and access card still not received after 1 week', 
      'I joined Crizac last Monday but still have not received my laptop and office access card. This is significantly affecting my ability to work effectively and attend meetings. My manager has also raised this concern.',
      cat_onboarding, emp_jane, 'Jane Smith', dept_engineering, 'critical', 'in_progress', agent_priya,
      now() - interval '3 days', now() - interval '4 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '2 days' - interval '16 hours', now() - interval '1 day', now() - interval '2 days' - interval '12 hours', now() - interval '2 days' - interval '12 hours', emp_jane, 'portal',
      agent_priya, 'Priya Sharma', now() - interval '4 hours', 'Priya Sharma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_priya, 'Priya Sharma', 'I sincerely apologize for this delay. I am immediately coordinating with IT and Admin teams to expedite your laptop and access card. This should have been processed before your joining date.', false, now() - interval '2 days' - interval '12 hours'),
      (ticket_id, agent_priya, 'Priya Sharma', 'Internal: IT confirmed laptop (Dell Latitude 5540) will be ready by EOD. Admin is processing access card - expected by tomorrow morning.', true, now() - interval '4 hours'),
      (ticket_id, agent_priya, 'Priya Sharma', 'Good news! IT has confirmed your laptop is ready for collection. The access card is being processed and should be ready by tomorrow morning. Please collect your laptop from the IT helpdesk on the 3rd floor.', false, now() - interval '4 hours');
  END IF;
  
  IF cat_onboarding IS NOT NULL AND emp_mike IS NOT NULL AND agent_vikram IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closed_at, closure_notes, is_read_only, created_by, source,
      employee_rating, rating_comment, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Bank account details update for salary credit', 
      'I need to update my bank account details for salary credit. My previous HDFC account is now closed and I want to add my new ICICI account.',
      cat_onboarding, emp_mike, 'Mike Johnson', dept_sales, 'high', 'closed', agent_vikram,
      now() - interval '12 days', now() - interval '9 days', 'none', 'Ticket is closed - no action required',
      now() - interval '11 days' - interval '16 hours', now() - interval '9 days', now() - interval '11 days' - interval '10 hours', now() - interval '11 days' - interval '10 hours',
      now() - interval '10 days', now() - interval '9 days', 'Bank account details updated successfully in the payroll system. New ICICI account ending in 4521 has been verified and set as primary for salary credit. Change will be effective from the next payroll cycle.', true, emp_mike, 'portal',
      5, 'Excellent and prompt support! The update was done within 24 hours. Very impressed with the efficiency.', agent_vikram, 'Vikram Singh');
  END IF;
  
  IF cat_training IS NOT NULL AND emp_john IS NOT NULL AND agent_rahul IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'AWS Solutions Architect certification reimbursement', 
      'I completed an AWS Solutions Architect Professional certification last month (Certificate ID: AWS-SAP-2024-87291). I would like to claim the reimbursement of Rs. 18,000 as per our learning and development policy. Please guide me on the process.',
      cat_training, emp_john, 'John Doe', dept_engineering, 'medium', 'in_progress', agent_rahul,
      now() - interval '2 days', now() - interval '6 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '1 day' - interval '20 hours', now() + interval '24 hours', now() - interval '1 day' - interval '16 hours', now() - interval '1 day' - interval '16 hours', emp_john, 'portal',
      agent_rahul, 'Rahul Verma', now() - interval '1 day' - interval '16 hours', 'Rahul Verma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES (ticket_id, agent_rahul, 'Rahul Verma', 'Congratulations on your AWS certification! This is a valuable achievement. I have received your request and am verifying the certification details with our L&D team. Please upload a copy of your certificate and the payment receipt to the L&D portal.', false, now() - interval '1 day' - interval '16 hours');
  END IF;
  
  IF cat_training IS NOT NULL AND emp_sarah IS NOT NULL AND agent_anjali IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closure_notes, created_by, source,
      last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Leadership Development Program nomination request', 
      'I would like to nominate myself for the upcoming Leadership Development Program in January. My manager (Arun Nair) has already given verbal approval. I have 4 years of experience and am ready to take on more leadership responsibilities.',
      cat_training, emp_sarah, 'Sarah Wilson', dept_marketing, 'low', 'resolved', agent_anjali,
      now() - interval '6 days', now() - interval '4 days', 'employee', 'Employee should confirm resolution or reopen if issue persists',
      now() - interval '5 days' - interval '20 hours', now() - interval '3 days', now() - interval '5 days' - interval '16 hours', now() - interval '5 days' - interval '16 hours',
      now() - interval '4 days', 'Nomination confirmed after receiving manager approval via email. Sarah has been enrolled in the January 2025 batch of Leadership Development Program (LDP-JAN-2025). Calendar invites for all 6 sessions have been sent to the employee email.', emp_sarah, 'portal',
      agent_anjali, 'Anjali Gupta');
  END IF;
  
  IF cat_policy IS NOT NULL AND emp_david IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, created_by, source,
      is_acknowledgement_breached, breach_reason, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Work from home policy clarification needed', 
      'Could you please clarify the current work from home policy? Specifically, I need to understand: 1) The approval process for occasional WFH days, 2) Whether we need to request WFH in advance, and 3) The maximum WFH days allowed per month.',
      cat_policy, emp_david, 'David Brown', dept_finance, 'low', 'open', NULL,
      now() - interval '26 hours', now() - interval '26 hours', 'hr_agent', 'Ticket needs to be assigned to an agent',
      now() - interval '2 hours', now() + interval '46 hours', emp_david, 'portal',
      true, 'Acknowledgement SLA breached at ' || (now() - interval '2 hours')::text || ' - High ticket volume during this period',
      emp_david, 'David Brown');
  END IF;
  
  IF cat_policy IS NOT NULL AND emp_jane IS NOT NULL AND agent_vikram IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Dress code policy for client meetings', 
      'We have an important client visit from Accenture next week. Could you please share the dress code guidelines for client-facing meetings? Our team wants to ensure we present professionally.',
      cat_policy, emp_jane, 'Jane Smith', dept_engineering, 'medium', 'acknowledged', agent_vikram,
      now() - interval '18 hours', now() - interval '10 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '14 hours', now() + interval '54 hours', now() - interval '10 hours', now() - interval '10 hours', emp_jane, 'email',
      agent_vikram, 'Vikram Singh', now() - interval '10 hours', 'Vikram Singh');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES (ticket_id, agent_vikram, 'Vikram Singh', 'Thank you for reaching out. I will share the comprehensive dress code guidelines document shortly. For client meetings with enterprise clients like Accenture, business formals are recommended.', false, now() - interval '10 hours');
  END IF;
  
  IF cat_policy IS NOT NULL AND emp_mike IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closed_at, closure_notes, is_read_only, created_by, source,
      last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Overtime compensation and TOIL policy inquiry', 
      'I worked extended hours (12 extra hours) on a critical project deadline last week. How do I claim overtime compensation or time-off-in-lieu (TOIL)? What is the approval process?',
      cat_policy, emp_mike, 'Mike Johnson', dept_sales, 'medium', 'closed', agent_priya,
      now() - interval '8 days', now() - interval '5 days', 'none', 'Ticket is closed - no action required',
      now() - interval '7 days' - interval '20 hours', now() - interval '5 days', now() - interval '7 days' - interval '14 hours', now() - interval '7 days' - interval '14 hours',
      now() - interval '6 days', now() - interval '5 days', 'Provided detailed explanation of overtime compensation policy and TOIL process. For Sales team, TOIL is the standard approach. Employee has successfully submitted TOIL application through the HR portal for 1.5 days (12 hours) with manager approval.', true, emp_mike, 'portal',
      agent_priya, 'Priya Sharma');
  END IF;
  
  IF cat_posh IS NOT NULL AND emp_sarah IS NOT NULL AND agent_anjali IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source, is_sensitive,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Confidential: Workplace conduct concern', 
      'I would like to report a concern regarding inappropriate workplace behavior. This is confidential and I would prefer to discuss the details in person.',
      cat_posh, emp_sarah, 'Sarah Wilson', dept_marketing, 'critical', 'in_progress', agent_anjali,
      now() - interval '2 days', now() - interval '3 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '1 day' - interval '16 hours', now() + interval '2 days', now() - interval '1 day' - interval '14 hours', now() - interval '1 day' - interval '14 hours', emp_sarah, 'portal', true,
      agent_anjali, 'Anjali Gupta', now() - interval '1 day' - interval '14 hours', 'Anjali Gupta');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_anjali, 'Anjali Gupta', 'Thank you for bringing this to our attention. I want to assure you that your complaint is being handled with strict confidentiality. I would like to schedule a private meeting at your convenience to discuss this further. Please suggest a suitable time and preferred meeting location (my office, a meeting room, or off-site).', false, now() - interval '1 day' - interval '14 hours'),
      (ticket_id, agent_anjali, 'Anjali Gupta', 'CONFIDENTIAL - ICC committee has been notified. Preliminary fact-finding to be initiated after meeting with complainant. Case ID: POSH-2024-007.', true, now() - interval '3 hours');
  END IF;
  
  IF cat_leave IS NOT NULL AND emp_sarah IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Maternity leave application and documentation', 
      'I would like to apply for maternity leave starting from January 15th, 2025. My expected due date is January 25th. Please guide me on the documentation required, the total leave entitlement, and any other formalities.',
      cat_leave, emp_sarah, 'Sarah Wilson', dept_marketing, 'high', 'in_progress', agent_priya,
      now() - interval '1 day', now() - interval '4 hours', 'hr_agent', 'Agent is working on resolution',
      now() - interval '20 hours', now() + interval '48 hours', now() - interval '16 hours', now() - interval '16 hours', emp_sarah, 'portal',
      agent_priya, 'Priya Sharma', now() - interval '16 hours', 'Priya Sharma');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES (ticket_id, agent_priya, 'Priya Sharma', 'Congratulations Sarah! I am delighted to assist you with your maternity leave application. Under our policy, you are entitled to 26 weeks of paid maternity leave. The required documents are: 1) Medical certificate from your gynecologist, 2) Expected due date confirmation, 3) Maternity leave application form (attached). I will also share information about our return-to-work program.', false, now() - interval '16 hours');
  END IF;
  
  IF cat_payroll IS NOT NULL AND emp_john IS NOT NULL AND agent_vikram IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, sla_paused_at, created_by, source,
      last_updated_by, last_updated_by_name, last_visible_reply_at, last_visible_reply_by)
    VALUES (ticket_id, 'Increment letter request for home loan application', 
      'I have not received my increment letter for the April 2024 cycle. I urgently need it for my home loan documentation as the bank has set a deadline of next week.',
      cat_payroll, emp_john, 'John Doe', dept_engineering, 'high', 'waiting_for_employee', agent_vikram,
      now() - interval '2 days', now() - interval '10 hours', 'employee', 'Awaiting response from employee',
      now() - interval '1 day' - interval '16 hours', now() + interval '24 hours', now() - interval '1 day' - interval '12 hours', now() - interval '1 day' - interval '12 hours', now() - interval '10 hours', emp_john, 'portal',
      agent_vikram, 'Vikram Singh', now() - interval '10 hours', 'Vikram Singh');
    INSERT INTO ticket_comments (ticket_id, user_id, user_name, content, is_internal, created_at)
    VALUES 
      (ticket_id, agent_vikram, 'Vikram Singh', 'I can generate your increment letter today. However, I need to confirm which address you would like mentioned on the letter - your current address on file (HSR Layout, Bangalore) or a different one? Also, do you need any specific salary breakup details mentioned for the bank?', false, now() - interval '10 hours');
  END IF;
  
  IF cat_benefits IS NOT NULL AND emp_mike IS NOT NULL AND agent_rahul IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closure_notes, created_by, source, employee_rating, rating_comment,
      last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Parking spot allocation request', 
      'I recently purchased a car and would like to request a parking spot allocation in the office premises. My vehicle number is KA-05-MN-1234.',
      cat_benefits, emp_mike, 'Mike Johnson', dept_sales, 'low', 'resolved', agent_rahul,
      now() - interval '5 days', now() - interval '3 days', 'employee', 'Employee should confirm resolution or reopen if issue persists',
      now() - interval '4 days' - interval '20 hours', now() - interval '2 days', now() - interval '4 days' - interval '16 hours', now() - interval '4 days' - interval '16 hours',
      now() - interval '3 days', 'Parking spot B-42 (Basement Level 2) has been allocated to the employee. Vehicle number KA-05-MN-1234 has been registered. Access card has been updated with parking gate access. Parking sticker will be provided at the security desk.', emp_mike, 'portal', 4, 'Good service. Parking allocation was done within 2 days.',
      agent_rahul, 'Rahul Verma');
  END IF;
  
  IF cat_leave IS NOT NULL AND emp_jane IS NOT NULL AND agent_rahul IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, created_by, source, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Emergency leave for family medical situation', 
      'I need to take emergency leave starting today due to a sudden medical emergency in my family. My father has been hospitalized and I may need to be away for about a week. Requesting approval for 5 days of emergency leave.',
      cat_leave, emp_jane, 'Jane Smith', dept_engineering, 'critical', 'assigned', agent_rahul,
      now() - interval '3 hours', now() - interval '3 hours', 'hr_agent', 'Agent needs to acknowledge the ticket',
      now() + interval '5 hours', now() + interval '21 hours', emp_jane, 'phone', emp_jane, 'Jane Smith');
    INSERT INTO ticket_assignment_history (ticket_id, ticket_number, from_agent_id, from_agent_name, to_agent_id, to_agent_name, assignment_reason, assigned_by, assigned_by_name)
    SELECT ticket_id, ticket_number, NULL, NULL, agent_rahul, 'Rahul Verma', 'Auto-assigned - Critical priority emergency leave', emp_jane, 'Jane Smith' FROM tickets WHERE id = ticket_id;
  END IF;
  
  IF cat_policy IS NOT NULL AND emp_david IS NOT NULL AND agent_priya IS NOT NULL THEN
    ticket_id := gen_random_uuid();
    INSERT INTO tickets (id, title, description, category_id, requester_id, requester_name, department_id,
      priority, status, assigned_agent_id, created_at, updated_at, pending_with, next_action_expected,
      acknowledgement_due_at, resolution_due_at, acknowledged_at, first_response_at, resolved_at, closed_at, closure_notes, is_read_only, created_by, source,
      employee_rating, rating_comment, last_updated_by, last_updated_by_name)
    VALUES (ticket_id, 'Referral bonus policy and process inquiry', 
      'I recently referred a candidate (Ananya Mehta) who joined as a Senior Developer last month. Could you please clarify the referral bonus amount and when it will be processed?',
      cat_policy, emp_david, 'David Brown', dept_finance, 'low', 'closed', agent_priya,
      now() - interval '15 days', now() - interval '12 days', 'none', 'Ticket is closed - no action required',
      now() - interval '14 days' - interval '20 hours', now() - interval '12 days', now() - interval '14 days' - interval '16 hours', now() - interval '14 days' - interval '16 hours',
      now() - interval '13 days', now() - interval '12 days', 'Confirmed referral for Ananya Mehta (Employee ID: EMP089). Referral bonus of Rs. 50,000 will be processed in two installments: 50% after 3 months of candidate joining (February 2025) and remaining 50% after 6 months (May 2025). Employee notified of the timeline.', true, emp_david, 'portal',
      5, 'Clear explanation of the policy and timeline. Very helpful!', agent_priya, 'Priya Sharma');
  END IF;
  
  UPDATE users SET current_ticket_count = (
    SELECT COUNT(*) FROM tickets 
    WHERE assigned_agent_id = users.id 
    AND status NOT IN ('closed', 'resolved')
  ) WHERE is_hr_agent = true;
  
END $$;