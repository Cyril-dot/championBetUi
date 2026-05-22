import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { auth } from '../utils/api';
import type { AuthResponse } from '../utils/api';
import LoginIcon from '@mui/icons-material/Login';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CircularProgress from '@mui/icons-material/Loop';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export const TOKEN_KEY = 'accessToken';
export const USER_KEY  = 'currentUser';

export function saveSession(data: AuthResponse, remember: boolean): void {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, data.accessToken);
  storage.setItem(USER_KEY, JSON.stringify(data.user));
  if (!remember) {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function mapRole(apiRole: string): 'user' | 'admin' {
  if (apiRole === 'ADMIN' || apiRole === 'admin') return 'admin';
  if (apiRole === 'SUPER_ADMIN' || apiRole === 'super_admin') return 'admin';
  return 'user';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, showToast } = useAppStore();

  const [form, setForm]                 = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email.trim() || !form.password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.login({ email: form.email.trim(), password: form.password });

      if (!res.success || !res.data?.accessToken) {
        throw new Error(res.message ?? 'Login failed. Please try again.');
      }

      const { user: apiUser } = res.data;
      saveSession(res.data, remember);

      login({
        id:           apiUser.id,
        fullName:     [apiUser.firstName, apiUser.lastName].filter(Boolean).join(' ') || apiUser.email,
        phone:        apiUser.phone ?? '',
        email:        apiUser.email,
        role:         mapRole(apiUser.role),
        kycStatus:    'verified',
        referralCode: '',
      });

      showToast('Login successful!', 'success');

      if (res.data.mustSetup2fa) {
        navigate('/setup-2fa');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      {/* ── Left decorative panel — hidden on mobile ── */}
      <div
        className="hidden md:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #b91c1c 100%)' }}
      >
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute -bottom-24 -right-12 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full opacity-5" style={{ backgroundColor: '#fff' }} />

        <div className="relative text-white text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
            <SportsSoccerIcon sx={{ fontSize: 44 }} />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">NxtBet</h1>
          <p className="text-sm font-semibold tracking-[3px] uppercase opacity-60 mb-6">Sports Betting</p>
          <p className="text-base opacity-85 leading-relaxed">
            Log in to your account and continue betting on your favourite sports.
          </p>

          <div className="flex flex-wrap gap-2 justify-center mt-8">
            {['Live Odds', 'Instant Pay', 'MoMo Supported'].map(f => (
              <span
                key={f}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile top banner ── */}
      <div
        className="md:hidden px-5 py-5 text-white flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #b91c1c 100%)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <SportsSoccerIcon fontSize="small" />
        </div>
        <div>
          <p className="font-black text-lg tracking-tight leading-none">NxtBet</p>
          <p className="text-xs opacity-70 mt-0.5">Sports Betting</p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">

          {/* Desktop heading */}
          <div className="hidden md:block mb-7">
            <h2
              className="text-2xl font-black tracking-tight mb-1"
              style={{ color: 'var(--text-main)' }}
            >
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter your credentials to access your account.
            </p>
          </div>

          {/* Mobile heading */}
          <div className="md:hidden mb-6 pt-2">
            <h2
              className="text-xl font-black tracking-tight mb-1"
              style={{ color: 'var(--text-main)' }}
            >
              Log In
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter your credentials below.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-2xl text-sm flex items-start gap-2"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
              }}
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                autoComplete="email"
                inputMode="email"
                disabled={loading}
                required
                className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
                style={{
                  backgroundColor: 'var(--card-alt)',
                  border: '1.5px solid var(--border-light)',
                  color: 'var(--text-main)',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-sm font-medium outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    border: '1.5px solid var(--border-light)',
                    color: 'var(--text-main)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors touch-manipulation"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-main)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                className="relative w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: remember ? 'var(--primary)' : 'var(--card-alt)',
                  border: `1.5px solid ${remember ? 'var(--primary)' : 'var(--border-light)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  disabled={loading}
                />
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Remember me
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--nxtbet-secondary-text)', }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              {loading ? (
                <>
                  <CircularProgress fontSize="small" className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LoginIcon fontSize="small" />
                  Log In
                </>
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
          </div>

          <p className="text-center text-sm pb-4" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Create one
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}