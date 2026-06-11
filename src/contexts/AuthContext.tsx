import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthSession, UserPermission, AuthError } from '../types';
import {
  authenticateUser,
  logout as authLogout,
  getSession,
  isSessionValid,
  getUserPermissions,
  hasPermission as checkPermission,
  refreshUserData,
  updateSessionActivity,
  getErrorMessage
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  error: AuthError | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isHRAgent: boolean;
  isEmployee: boolean;
  permissions: UserPermission[];
  hasPermission: (permission: UserPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const activityHandler = () => updateSessionActivity();
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, activityHandler, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      if (!isSessionValid()) {
        handleLogout();
      }
    };

    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const initializeAuth = () => {
    try {
      if (!isSessionValid()) {
        setLoading(false);
        return;
      }

      const storedSession = getSession();
      if (storedSession?.user) {
        setSession(storedSession);
        setUser(storedSession.user);
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setError(null);

    try {
      const response = await authenticateUser(username, password);

      if (response.success && response.user) {
        const newSession: AuthSession = {
          user: response.user,
          token: response.token || null,
          permissions: response.permissions || [],
          authenticated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        };

        setSession(newSession);
        setUser(response.user);
        return { success: true };
      }

      if (response.error) {
        setError(response.error);
      }

      return {
        success: false,
        error: response.error ? getErrorMessage(response.error) : 'Login failed'
      };
    } catch (err) {
      console.error('Login error:', err);
      const authError: AuthError = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred'
      };
      setError(authError);
      return { success: false, error: getErrorMessage(authError) };
    }
  };

  const handleLogout = useCallback(() => {
    authLogout();
    setUser(null);
    setSession(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const updatedUser = await refreshUserData();
    if (updatedUser) {
      setUser(updatedUser);
      const currentSession = getSession();
      if (currentSession) {
        setSession(currentSession);
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = !!user && isSessionValid();
  const isAdmin = user?.is_admin ?? false;
  const isHRAgent = user?.is_hr_agent ?? false;
  const isEmployee = !!user && !isAdmin && !isHRAgent;
  const permissions = session?.permissions || getUserPermissions();

  const hasPermissionCheck = useCallback((permission: UserPermission): boolean => {
    if (isAdmin) return true;
    return checkPermission(permission);
  }, [isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        login,
        logout: handleLogout,
        refreshUser,
        clearError,
        isAuthenticated,
        isAdmin,
        isHRAgent,
        isEmployee,
        permissions,
        hasPermission: hasPermissionCheck
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
