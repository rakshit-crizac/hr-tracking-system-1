import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthErrorCode } from '../types';
import { Loader2, AlertCircle, Eye, EyeOff, WifiOff, Lock, UserX, ShieldAlert } from 'lucide-react';

const ERROR_ICONS: Record<AuthErrorCode, typeof AlertCircle> = {
  INVALID_CREDENTIALS: AlertCircle,
  USER_DISABLED: UserX,
  ACCOUNT_LOCKED: Lock,
  SESSION_EXPIRED: ShieldAlert,
  NETWORK_ERROR: WifiOff,
  SERVER_ERROR: AlertCircle,
  UNKNOWN_ERROR: AlertCircle
};

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user, error: authError, clearError, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/dashboard';

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (authError) {
      setLocalError(authError.message);
    }
  }, [authError]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!username.trim()) {
      setLocalError('Please enter your username');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        navigate(from, { replace: true });
      } else if (result.error) {
        setLocalError(result.error);
      }
    } catch {
      setLocalError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError?.message;
  const errorCode = authError?.code || 'UNKNOWN_ERROR';
  const ErrorIcon = ERROR_ICONS[errorCode] || AlertCircle;

  const getErrorStyle = () => {
    switch (errorCode) {
      case 'NETWORK_ERROR':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'USER_DISABLED':
      case 'ACCOUNT_LOCKED':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img
              src="/Crizac_Logo_-_Transpaarent_-_Copy.png"
              alt="Crizac"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">HR Ticketing System</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {displayError && (
              <div className={`flex items-start gap-3 p-4 border rounded-lg text-sm ${getErrorStyle()}`}>
                <ErrorIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{displayError}</p>
                  {errorCode === 'NETWORK_ERROR' && (
                    <p className="text-xs mt-1 opacity-80">Check your internet connection and try again.</p>
                  )}
                  {errorCode === 'ACCOUNT_LOCKED' && (
                    <p className="text-xs mt-1 opacity-80">Please wait a few minutes before trying again.</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setLocalError('');
                }}
                placeholder="Enter your username"
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  displayError ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLocalError('');
                  }}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10 ${
                    displayError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Test Credentials</p>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('Admin@123'); setLocalError(''); }}
                className="w-full flex justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-gray-600">Admin:</span>
                <code className="text-gray-900">admin / Admin@123</code>
              </button>
              <button
                type="button"
                onClick={() => { setUsername('priya.sharma'); setPassword('Hr@123'); setLocalError(''); }}
                className="w-full flex justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-gray-600">HR Agent:</span>
                <code className="text-gray-900">priya.sharma / Hr@123</code>
              </button>
              <button
                type="button"
                onClick={() => { setUsername('john.doe'); setPassword('Emp@123'); setLocalError(''); }}
                className="w-full flex justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-gray-600">Employee:</span>
                <code className="text-gray-900">john.doe / Emp@123</code>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Crizac HR Ticketing System v1.0
        </p>
      </div>
    </div>
  );
}
