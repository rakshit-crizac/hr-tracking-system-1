/*
  # Optimize RLS Policies and Clean Up Duplicates

  1. Performance Optimizations
    - Replace auth.uid() with (select auth.uid()) for better query planning
    - This prevents re-evaluation of auth.uid() for each row

  2. Policy Cleanup
    - Remove duplicate/redundant policies that overlap in functionality
    - Keep the most specific policies and remove overly permissive ones

  3. Security Improvements
    - Remove overly permissive anon policies that bypass RLS
    - Note: Some anon policies are kept as this app uses custom auth (not Supabase Auth)
*/

-- =============================================
-- USERS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "HR agents can read users for assignment" ON users;
CREATE POLICY "HR agents can read users for assignment"
  ON users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND (u.is_hr_agent = true OR u.is_admin = true)
  ));

DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- TICKET_CATEGORIES TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can manage categories" ON ticket_categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON ticket_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON ticket_categories;

CREATE POLICY "Admins can insert categories"
  ON ticket_categories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update categories"
  ON ticket_categories FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can delete categories"
  ON ticket_categories FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- TICKET_SUBCATEGORIES TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can manage subcategories" ON ticket_subcategories;
DROP POLICY IF EXISTS "Admins can insert subcategories" ON ticket_subcategories;
DROP POLICY IF EXISTS "Admins can update subcategories" ON ticket_subcategories;

CREATE POLICY "Admins can insert subcategories"
  ON ticket_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update subcategories"
  ON ticket_subcategories FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can delete subcategories"
  ON ticket_subcategories FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- SLA_POLICIES TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can manage SLA policies" ON sla_policies;
DROP POLICY IF EXISTS "Admins can insert SLA policies" ON sla_policies;
DROP POLICY IF EXISTS "Admins can update SLA policies" ON sla_policies;

CREATE POLICY "Admins can insert SLA policies"
  ON sla_policies FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update SLA policies"
  ON sla_policies FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can delete SLA policies"
  ON sla_policies FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- HOLIDAYS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can insert holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can update holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can delete holidays" ON holidays;

CREATE POLICY "Admins can insert holidays"
  ON holidays FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update holidays"
  ON holidays FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can delete holidays"
  ON holidays FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- AGENT_CATEGORY_MAPPINGS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can manage agent mappings" ON agent_category_mappings;
DROP POLICY IF EXISTS "HR agents can read own mappings" ON agent_category_mappings;
DROP POLICY IF EXISTS "HR agents can view their own mappings" ON agent_category_mappings;
DROP POLICY IF EXISTS "Admins can insert mappings" ON agent_category_mappings;
DROP POLICY IF EXISTS "Admins can update mappings" ON agent_category_mappings;
DROP POLICY IF EXISTS "Admins can delete mappings" ON agent_category_mappings;

CREATE POLICY "HR agents can view own mappings"
  ON agent_category_mappings FOR SELECT
  TO authenticated
  USING (
    agent_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (select auth.uid()) AND u.is_admin = true
    )
  );

CREATE POLICY "Admins can insert mappings"
  ON agent_category_mappings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update mappings"
  ON agent_category_mappings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can delete mappings"
  ON agent_category_mappings FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- TICKETS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Employees can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Employees can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "HR agents can view eligible tickets" ON tickets;
DROP POLICY IF EXISTS "Employees can create tickets" ON tickets;
DROP POLICY IF EXISTS "HR agents can update tickets" ON tickets;
DROP POLICY IF EXISTS "Employees can update own tickets for rating" ON tickets;
DROP POLICY IF EXISTS "HR agents can update assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;

CREATE POLICY "Employees can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    requester_id = (select auth.uid())
    OR created_by = (select auth.uid())
  );

CREATE POLICY "HR agents can view eligible tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND u.is_hr_agent = true
    AND (
      tickets.assigned_agent_id = (select auth.uid())
      OR (
        tickets.is_sensitive = false
        AND EXISTS (
          SELECT 1 FROM agent_category_mappings acm
          WHERE acm.agent_id = (select auth.uid())
          AND acm.category_id = tickets.category_id
          AND acm.is_active = true
        )
      )
      OR (tickets.is_sensitive = true AND u.is_posh_handler = true)
    )
  ));

CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Employees can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = (select auth.uid())
    OR created_by = (select auth.uid())
  );

CREATE POLICY "HR agents can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND (u.is_hr_agent = true OR u.is_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND (u.is_hr_agent = true OR u.is_admin = true)
  ));

CREATE POLICY "Employees can update own tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    requester_id = (select auth.uid())
    AND status IN ('waiting_for_employee', 'resolved')
  )
  WITH CHECK (
    requester_id = (select auth.uid())
    AND status IN ('waiting_for_employee', 'resolved')
  );

CREATE POLICY "Admins can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- TICKET_COMMENTS TABLE - Optimize
-- =============================================

DROP POLICY IF EXISTS "Ticket owners can view public comments" ON ticket_comments;
DROP POLICY IF EXISTS "HR can view all comments on accessible tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to accessible tickets" ON ticket_comments;

CREATE POLICY "Ticket owners can view public comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_comments.ticket_id
      AND (t.requester_id = (select auth.uid()) OR t.created_by = (select auth.uid()))
    )
  );

CREATE POLICY "HR can view all comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND (u.is_hr_agent = true OR u.is_admin = true)
  ));

CREATE POLICY "Users can add comments"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_comments.ticket_id
      AND (
        t.requester_id = (select auth.uid())
        OR t.created_by = (select auth.uid())
        OR t.assigned_agent_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = (select auth.uid())
          AND (u.is_hr_agent = true OR u.is_admin = true)
        )
      )
    )
  );

-- =============================================
-- AUDIT_LOGS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "HR can view ticket-related audit logs" ON audit_logs;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "HR can view ticket audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    entity_type = 'ticket'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (select auth.uid()) AND u.is_hr_agent = true
    )
  );

-- =============================================
-- NOTIFICATIONS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- SYSTEM_SETTINGS TABLE - Optimize and deduplicate
-- =============================================

DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;

CREATE POLICY "Admins can insert settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- ESCALATION_RULES TABLE - Optimize
-- =============================================

DROP POLICY IF EXISTS "Admins can manage escalation rules" ON escalation_rules;
DROP POLICY IF EXISTS "Admins can update escalation rules" ON escalation_rules;

CREATE POLICY "Admins can insert escalation rules"
  ON escalation_rules FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can update escalation rules"
  ON escalation_rules FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

CREATE POLICY "Admins can delete escalation rules"
  ON escalation_rules FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.is_admin = true
  ));

-- =============================================
-- TICKET_ASSIGNMENT_HISTORY TABLE - Optimize
-- =============================================

DROP POLICY IF EXISTS "HR agents can view assignment history" ON ticket_assignment_history;
DROP POLICY IF EXISTS "HR agents can insert assignment history" ON ticket_assignment_history;

CREATE POLICY "HR agents can view assignment history"
  ON ticket_assignment_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND (u.is_hr_agent = true OR u.is_admin = true)
  ));

CREATE POLICY "HR agents can insert assignment history"
  ON ticket_assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid())
    AND (u.is_hr_agent = true OR u.is_admin = true)
  ));
