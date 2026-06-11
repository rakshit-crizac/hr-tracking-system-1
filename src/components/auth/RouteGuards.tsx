import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPermission } from '../../types';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireHR?: boolean;
  requiredPermission?: UserPermission;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireHR = false,
  requiredPermission,
  fallbackPath = '/dashboard'
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isHRAgent, hasPermission, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requireHR && !isHRAgent && !isAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicRoute({ children, redirectTo = '/dashboard' }: PublicRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || redirectTo;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'hr_agent' | 'employee')[];
  fallbackPath?: string;
}

export function RoleBasedRoute({
  children,
  allowedRoles,
  fallbackPath = '/dashboard'
}: RoleBasedRouteProps) {
  const { user, loading, isAdmin, isHRAgent, isEmployee, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const hasAccess =
    (allowedRoles.includes('admin') && isAdmin) ||
    (allowedRoles.includes('hr_agent') && isHRAgent) ||
    (allowedRoles.includes('employee') && isEmployee);

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
