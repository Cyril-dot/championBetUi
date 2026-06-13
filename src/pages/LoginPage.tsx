import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { auth } from '../utils/api';
import type { AuthResponse } from '../utils/api';

// ─── Session helpers ──────────────────────────────────────────────────────────
export const TOKEN_KEY = 'accessToken';
export const USER_KEY  = 'currentUser';

export function saveSession(data: AuthResponse, remember: boolean): void {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, data.accessToken);
  storage.setItem(USER_KEY, JSON.stringify(data.user));
  if (!remember) localStorage.setItem(TOKEN_KEY, data.accessToken);
}

export function clearSession(): void {
  [localStorage, sessionStorage].forEach(s => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(USER_KEY);
  });
}

function mapRole(apiRole: string): 'user' | 'admin' {
  return ['ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin'].includes(apiRole) ? 'admin' : 'user';
}

// ─── CB Monogram SVG ─────────────────────────────────────────────────────────
function CBMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 6.5C12.2 6.5 8.5 9.2 8.5 14C8.5 18.8 12.2 21.5 16 21.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <line x1="16" y1="6.5" x2="16" y2="21.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
      <path
        d="M16 6.5H19.5C21.4 6.5 22.8 7.8 22.8 9.6C22.8 11.4 21.4 13 19.5 13H16"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 13H20C22.2 13 23.5 14.5 23.5 16.5C23.5 18.6 22.2 21.5 20 21.5H16"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// ─── ChampionBet Logo ─────────────────────────────────────────────────────────
function ChampionBetLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }} aria-label="CHAMPIONBET">
      <div style={{
        width: 42, height: 42,
        background: '#E8000D',
        border: '2px solid rgba(232,0,13,0.30)',
        borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(232,0,13,0.25)',
      }}>
        <CBMark size={24} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 0 }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800, fontStyle: 'italic',
          fontSize: '0.72rem', letterSpacing: '0.26em',
          color: '#E8000D', textTransform: 'uppercase', lineHeight: 1,
        }}>
          Champion
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900, fontStyle: 'italic',
          fontSize: '1.72rem', letterSpacing: '-0.01em',
          color: '#E8000D', textTransform: 'uppercase',
          lineHeight: 1, display: 'inline-block',
          transform: 'skewX(-10deg)',
        }}>
          Bet
        </span>
        <div style={{
          width: '100%', height: 2.5,
          background: '#E8000D', borderRadius: 2,
          opacity: 0.45, marginTop: 2,
        }} />
      </div>
    </div>
  );
}

// ─── Styled input ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.9rem 1rem',
  background: '#f7f5f2',
  border: '1.5px solid #e8e4df',
  borderRadius: 10,
  fontSize: '0.9rem',
  color: '#111',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#888',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, showToast } = useAppStore();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password.trim()) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.login({ email: form.email.trim(), password: form.password });
      if (!res.success || !res.data?.accessToken) throw new Error(res.message ?? 'Login failed.');
      const { user: u } = res.data;
      saveSession(res.data, remember);
      login({
        id: u.id,
        fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        phone: u.phone ?? '',
        email: u.email,
        role: mapRole(u.role),
        kycStatus: 'verified',
        referralCode: '',
      });
      showToast('Welcome back!', 'success');
      navigate(res.data.mustSetup2fa ? '/setup-2fa' : '/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .wb-login-input:focus {
          border-color: #E8000D !important;
          box-shadow: 0 0 0 3px rgba(232,0,13,0.1) !important;
        }
        .wb-eye-btn:hover { color: #E8000D !important; }
        .wb-submit:hover:not(:disabled) {
          background: #c20009 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(232,0,13,0.3) !important;
        }
        .wb-submit:active:not(:disabled) { transform: translateY(0); }
        .wb-link:hover { text-decoration: underline; }
        @keyframes wbSpin { to { transform: rotate(360deg); } }
        .wb-spin {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: wbSpin 0.8s linear infinite;
        }
      `}</style>

      <div style={{
        minHeight: 'calc(100vh - 4rem)',
        background: '#fafaf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <ChampionBetLogo />
          </div>

          {/* Card */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 32px rgba(0,0,0,0.09)',
            padding: '2rem 2rem 1.75rem',
          }}>

            {/* Heading */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <div style={{ width: 24, height: 3, background: '#E8000D', borderRadius: 2 }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E8000D' }}>
                  Member Login
                </span>
              </div>
              <h1 style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#0a0a0a',
                margin: 0,
                lineHeight: 1.15,
                fontFamily: "'Inter', sans-serif",
              }}>
                Welcome back
              </h1>
              <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.35rem', margin: '0.35rem 0 0' }}>
                Sign in to access your account and bets.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                background: '#fff0f0',
                border: '1px solid rgba(232,0,13,0.25)',
                borderRadius: 10,
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-start',
              }}>
                <span style={{ color: '#E8000D', fontSize: '0.9rem', marginTop: 1 }}>⚠</span>
                <span style={{ color: '#E8000D', fontSize: '0.85rem', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Email */}
              <Field label="Email Address">
                <input
                  className="wb-login-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                  required
                  style={inputStyle}
                />
              </Field>

              {/* Password */}
              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    className="wb-login-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                    style={{ ...inputStyle, paddingRight: '2.8rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    className="wb-eye-btn"
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: '#aaa', padding: 4, lineHeight: 1,
                    }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </Field>

              {/* Remember + Forgot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ position: 'relative', width: 18, height: 18 }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      disabled={loading}
                      style={{
                        position: 'absolute', inset: 0, opacity: 0,
                        cursor: 'pointer', width: '100%', height: '100%',
                      }}
                    />
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: remember ? '#E8000D' : '#f0ede8',
                      border: `1.5px solid ${remember ? '#E8000D' : '#d0ccc6'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      {remember && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#666' }}>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="wb-link"
                  style={{ fontSize: '0.82rem', color: '#E8000D', textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="wb-submit"
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  background: '#E8000D',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.04em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  minHeight: 50,
                }}
              >
                {loading ? (
                  <><span className="wb-spin" />Signing in…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Log In
                  </>
                )}
              </button>

            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e8e4df' }} />
              <span style={{ fontSize: '0.72rem', color: '#bbb', letterSpacing: '0.08em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#e8e4df' }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888', margin: 0 }}>
              New to ChampionBet?{' '}
              <Link to="/register" className="wb-link" style={{ color: '#E8000D', fontWeight: 700, textDecoration: 'none' }}>
                Create an account →
              </Link>
            </p>

          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
            {['🔒 Secure', '✓ Licensed', '⚡ Instant Pay'].map(b => (
              <span key={b} style={{ fontSize: '0.7rem', color: '#aaa', letterSpacing: '0.04em' }}>{b}</span>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}