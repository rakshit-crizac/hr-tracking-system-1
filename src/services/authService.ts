/*
 * ============================================================================
 * AUTHENTICATION SERVICE
 * ============================================================================
 *
 * This service handles all authentication operations. It currently uses a
 * mock API for development/demo purposes but is designed for easy integration
 * with a real company authentication API (SSO, LDAP, Active Directory, etc.)
 *
 * TO INTEGRATE WITH REAL COMPANY API:
 * ------------------------------------
 * 1. Replace the `callAuthAPI` function implementation
 * 2. Update the API endpoint URL
 * 3. Adjust request/response mapping if needed
 * 4. The rest of the authentication flow will work automatically
 *
 * See the type definitions in types/index.ts for the expected API contract.
 * ============================================================================
 */

import {
  User,
  AuthResponse,
  AuthCredentials,
  AuthToken,
  AuthSession,
  AuthError,
  AuthErrorCode,
  UserPermission,
  Category
} from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
  SESSION: 'hr_ticketing_session',
  USER: 'hr_ticketing_user',
  TOKEN: 'hr_ticketing_token'
} as const;

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Admin@123'
} as const;

const MOCK_USERS: Record<string, { password: string; user: Omit<User, 'id' | 'created_at' | 'updated_at'> }> = {
  'priya.sharma': {
    password: 'Hr@123',
    user: {
      employee_code: 'HR001',
      email: 'priya.sharma@company.com',
      full_name: 'Priya Sharma',
      role: 'hr_agent',
      department_id: null,
      is_hr_agent: true,
      is_admin: false,
      is_active: true,
      is_posh_handler: true,
      last_assigned_at: null,
      current_ticket_count: 0,
    }
  },
  'rahul.verma': {
    password: 'Hr@123',
    user: {
      employee_code: 'HR002',
      email: 'rahul.verma@company.com',
      full_name: 'Rahul Verma',
      role: 'hr_agent',
      department_id: null,
      is_hr_agent: true,
      is_admin: false,
      is_active: true,
      is_posh_handler: false,
      last_assigned_at: null,
      current_ticket_count: 0,
    }
  },
  'john.doe': {
    password: 'Emp@123',
    user: {
      employee_code: 'EMP001',
      email: 'john.doe@company.com',
      full_name: 'John Doe',
      role: 'employee',
      department_id: null,
      is_hr_agent: false,
      is_admin: false,
      is_active: true,
      is_posh_handler: false,
      last_assigned_at: null,
      current_ticket_count: 0,
    }
  },
  'jane.smith': {
    password: 'Emp@123',
    user: {
      employee_code: 'EMP002',
      email: 'jane.smith@company.com',
      full_name: 'Jane Smith',
      role: 'employee',
      department_id: null,
      is_hr_agent: false,
      is_admin: false,
      is_active: true,
      is_posh_handler: false,
      last_assigned_at: null,
      current_ticket_count: 0,
    }
  }
};

function getDefaultPermissions(user: User): UserPermission[] {
  if (user.is_admin) {
    return [
      'view_own_tickets',
      'create_tickets',
      'view_all_tickets',
      'manage_tickets',
      'view_reports',
      'manage_users',
      'manage_categories',
      'manage_sla',
      'manage_settings',
      'view_audit_logs'
    ];
  }

  if (user.is_hr_agent) {
    return [
      'view_own_tickets',
      'create_tickets',
      'view_all_tickets',
      'manage_tickets',
      'view_reports'
    ];
  }

  return ['view_own_tickets', 'create_tickets'];
}

function generateMockToken(): AuthToken {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    token: `mock_jwt_${crypto.randomUUID()}`,
    refresh_token: `mock_refresh_${crypto.randomUUID()}`,
    expires_at: expiresAt.toISOString()
  };
}

function createAuthError(code: AuthErrorCode, message: string): AuthError {
  return { code, message };
}

/*
 * ============================================================================
 * MOCK API CALL - REPLACE THIS FUNCTION FOR REAL API INTEGRATION
 * ============================================================================
 *
 * This function simulates calling a company authentication API.
 *
 * TO REPLACE WITH REAL API:
 * 1. Change the fetch URL to your company's auth endpoint
 * 2. Adjust headers (add API keys, content type, etc.)
 * 3. Map the response to AuthResponse format
 *
 * Example real implementation:
 *
 * async function callAuthAPI(credentials: AuthCredentials): Promise<AuthResponse> {
 *   const response = await fetch('https://your-company-api.com/auth/login', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'X-API-Key': import.meta.env.VITE_AUTH_API_KEY
 *     },
 *     body: JSON.stringify({
 *       username: credentials.username,
 *       password: credentials.password,
 *       domain: credentials.domain || 'default'
 *     })
 *   });
 *
 *   const data = await response.json();
 *
 *   return {
 *     success: data.success,
 *     token: data.token ? {
 *       token: data.token,
 *       refresh_token: data.refresh_token,
 *       expires_at: data.expires_at
 *     } : null,
 *     user: data.user ? mapApiUserToLocalUser(data.user) : null,
 *     permissions: data.permissions,
 *     error: data.error ? { code: data.error.code, message: data.error.message } : undefined
 *   };
 * }
 * ============================================================================
 */
async function callAuthAPI(credentials: AuthCredentials): Promise<AuthResponse> {
  await new Promise(resolve => setTimeout(resolve, 800));

  const username = credentials.username.toLowerCase().trim();

  if (username === ADMIN_CREDENTIALS.username && credentials.password === ADMIN_CREDENTIALS.password) {
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('*, department:departments(*)')
      .eq('employee_code', 'ADMIN001')
      .maybeSingle();

    if (error || !adminUser) {
      const fallbackAdmin: User = {
        id: crypto.randomUUID(),
        employee_code: 'ADMIN001',
        email: 'admin@company.com',
        full_name: 'System Administrator',
        role: 'admin',
        department_id: null,
        is_hr_agent: true,
        is_admin: true,
        is_active: true,
        is_posh_handler: true,
        last_assigned_at: null,
        current_ticket_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        token: generateMockToken(),
        user: fallbackAdmin,
        permissions: getDefaultPermissions(fallbackAdmin)
      };
    }

    return {
      success: true,
      token: generateMockToken(),
      user: adminUser as User,
      permissions: getDefaultPermissions(adminUser as User)
    };
  }

  const mockUser = MOCK_USERS[username];
  if (!mockUser) {
    return {
      success: false,
      user: null,
      error: createAuthError('INVALID_CREDENTIALS', 'Invalid username or password')
    };
  }

  if (mockUser.password !== credentials.password) {
    return {
      success: false,
      user: null,
      error: createAuthError('INVALID_CREDENTIALS', 'Invalid username or password')
    };
  }

  if (!mockUser.user.is_active) {
    return {
      success: false,
      user: null,
      error: createAuthError('USER_DISABLED', 'This account has been disabled. Contact your administrator.')
    };
  }

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*, department:departments(*)')
    .eq('employee_code', mockUser.user.employee_code)
    .maybeSingle();

  let finalUser: User;

  if (dbError || !dbUser) {
    finalUser = {
      id: crypto.randomUUID(),
      ...mockUser.user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else {
    finalUser = dbUser as User;

    if (finalUser.is_hr_agent) {
      const { data: mappings } = await supabase
        .from('agent_category_mappings')
        .select('category:ticket_categories(*)')
        .eq('agent_id', finalUser.id)
        .eq('is_active', true);

      finalUser.mapped_categories = mappings?.map((m: { category: Category }) => m.category) || [];
    }
  }

  return {
    success: true,
    token: generateMockToken(),
    user: finalUser,
    permissions: getDefaultPermissions(finalUser)
  };
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResponse> {
  try {
    const credentials: AuthCredentials = {
      username,
      password
    };

    const response = await callAuthAPI(credentials);

    if (response.success && response.user) {
      const session: AuthSession = {
        user: response.user,
        token: response.token || null,
        permissions: response.permissions || getDefaultPermissions(response.user),
        authenticated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      };

      saveSession(session);
    }

    return response;
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      user: null,
      error: createAuthError(
        'NETWORK_ERROR',
        'Unable to connect to authentication server. Please check your network connection.'
      )
    };
  }
}

export async function refreshUserData(): Promise<User | null> {
  const session = getSession();
  if (!session?.user?.id) return null;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, department:departments(*)')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !user) return session.user;

    if (user.is_hr_agent) {
      const { data: mappings } = await supabase
        .from('agent_category_mappings')
        .select('category:ticket_categories(*)')
        .eq('agent_id', user.id)
        .eq('is_active', true);

      user.mapped_categories = mappings?.map((m: { category: Category }) => m.category) || [];
    }

    const updatedSession: AuthSession = {
      ...session,
      user: user as User,
      last_activity_at: new Date().toISOString()
    };
    saveSession(updatedSession);

    return user as User;
  } catch {
    return session.user;
  }
}

export async function fetchUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, department:departments(*)')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    if (data.is_hr_agent) {
      const { data: mappings } = await supabase
        .from('agent_category_mappings')
        .select('category:ticket_categories(*)')
        .eq('agent_id', data.id)
        .eq('is_active', true);

      data.mapped_categories = mappings?.map((m: { category: Category }) => m.category) || [];
    }

    return data as User;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

export function getSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!stored) return null;

    const session = JSON.parse(stored) as AuthSession;

    if (session.token?.expires_at) {
      const expiresAt = new Date(session.token.expires_at);
      if (expiresAt < new Date()) {
        logout();
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export function updateSessionActivity(): void {
  const session = getSession();
  if (session) {
    session.last_activity_at = new Date().toISOString();
    saveSession(session);
  }
}

export function getCurrentUser(): User | null {
  const session = getSession();
  return session?.user || null;
}

export function getAuthToken(): AuthToken | null {
  const session = getSession();
  return session?.token || null;
}

export function getUserPermissions(): UserPermission[] {
  const session = getSession();
  return session?.permissions || [];
}

export function hasPermission(permission: UserPermission): boolean {
  const permissions = getUserPermissions();
  return permissions.includes(permission);
}

export function isSessionValid(): boolean {
  const session = getSession();
  if (!session) return false;

  if (session.token?.expires_at) {
    const expiresAt = new Date(session.token.expires_at);
    if (expiresAt < new Date()) {
      logout();
      return false;
    }
  }

  return true;
}

export function getErrorMessage(error: AuthError | undefined): string {
  if (!error) return 'An unknown error occurred';

  const errorMessages: Record<AuthErrorCode, string> = {
    INVALID_CREDENTIALS: 'Invalid username or password. Please try again.',
    USER_DISABLED: 'This account has been disabled. Please contact your administrator.',
    ACCOUNT_LOCKED: 'This account has been locked due to too many failed attempts. Please try again later.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  };

  return errorMessages[error.code] || error.message || errorMessages.UNKNOWN_ERROR;
}
