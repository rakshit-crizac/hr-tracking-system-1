import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/RouteGuards';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/employee/Dashboard';
import { TicketList } from './pages/employee/TicketList';
import { CreateTicket } from './pages/employee/CreateTicket';
import { TicketDetail } from './pages/employee/TicketDetail';
import { AgentDashboard } from './pages/agent/Dashboard';
import { AgentQueue } from './pages/agent/Queue';
import { TicketWorkbench } from './pages/agent/TicketWorkbench';
import { AdminDashboard } from './pages/admin/Dashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { CategoryManagement } from './pages/admin/CategoryManagement';
import { SLAPolicies } from './pages/admin/SLAPolicies';
import { AgentMapping } from './pages/admin/AgentMapping';
import { BusinessHours } from './pages/admin/BusinessHours';
import { Holidays } from './pages/admin/Holidays';
import { AuditLogs } from './pages/admin/AuditLogs';
import { AllTickets } from './pages/admin/AllTickets';
import { Reports } from './pages/admin/Reports';
import { Settings } from './pages/admin/Settings';
import { Departments } from './pages/admin/Departments';
import { EscalationRules } from './pages/admin/EscalationRules';
import { Loader2 } from 'lucide-react';

function DashboardRedirect() {
  const { isAdmin, isHRAgent, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isHRAgent) {
    return <AgentDashboard />;
  }

  return <EmployeeDashboard />;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRedirect />} />

        <Route path="tickets" element={<TicketList />} />
        <Route path="tickets/new" element={<CreateTicket />} />
        <Route path="tickets/:id" element={<TicketDetail />} />

        <Route
          path="agent/queue"
          element={
            <ProtectedRoute requireHR>
              <AgentQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="agent/all-tickets"
          element={
            <ProtectedRoute requireHR>
              <AgentQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="agent/overdue"
          element={
            <ProtectedRoute requireHR>
              <AgentQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="agent/ticket/:id"
          element={
            <ProtectedRoute requireHR>
              <TicketWorkbench />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/tickets"
          element={
            <ProtectedRoute requireAdmin>
              <AllTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/categories"
          element={
            <ProtectedRoute requireAdmin>
              <CategoryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/sla"
          element={
            <ProtectedRoute requireAdmin>
              <SLAPolicies />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/agent-mapping"
          element={
            <ProtectedRoute requireAdmin>
              <AgentMapping />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/business-hours"
          element={
            <ProtectedRoute requireAdmin>
              <BusinessHours />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/holidays"
          element={
            <ProtectedRoute requireAdmin>
              <Holidays />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/departments"
          element={
            <ProtectedRoute requireAdmin>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/escalation"
          element={
            <ProtectedRoute requireAdmin>
              <EscalationRules />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/reports"
          element={
            <ProtectedRoute requireAdmin>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit-logs"
          element={
            <ProtectedRoute requireAdmin>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
