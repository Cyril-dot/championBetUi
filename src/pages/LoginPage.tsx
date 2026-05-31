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

// ─── Bet360 Shield Logo ───────────────────────────────────────────────────────
function ShieldLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 1L2 9v13c0 12 7.5 21 18 24C31.5 43 38 34 38 22V9L20 1z" fill="#CC0000"/>
      <path d="M20 1L2 9v13c0 12 7.5 21 18 24C31.5 43 38 34 38 22V9L20 1z" stroke="#ff2200" strokeWidth="0.5" strokeOpacity="0.4"/>
      <text x="20" y="28" textAnchor="middle" fontFamily="'Georgia', serif" fontWeight="900" fontSize="11" fill="#fff" letterSpacing="-0.5">360</text>
    </svg>
  );
}

function Bet360Wordmark({ variant = 'light' }: { variant?: 'light' | 'dark' | 'red' }) {
  const betColor  = variant === 'light' ? '#ffffff' : variant === 'red' ? '#CC0000' : '#111';
  const numColor  = variant === 'light' ? '#ff9999' : '#CC0000';
  return (
    <span style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1 }}>
      <span style={{ color: betColor, fontSize: 'inherit' }}>BET</span>
      <span style={{ color: numColor, fontSize: 'inherit' }}>360</span>
    </span>
  );
}

// ─── Decorative left panel ────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div style={{
      position: 'relative',
      width: '42%',
      minHeight: '100%',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '3rem 2.5rem',
    }}>
      {/* Grid texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(204,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(204,0,0,0.06) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Red glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,0,0,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Corner accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'linear-gradient(225deg, rgba(204,0,0,0.15) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 200, height: 200, background: 'linear-gradient(45deg, rgba(204,0,0,0.08) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 300 }}>
        {/* Logo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <ShieldLogo size={64} />
        </div>
        <div style={{ fontSize: '2.4rem', marginBottom: '0.75rem' }}>
          <Bet360Wordmark variant="light" />
        </div>

        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '3rem', fontFamily: 'Georgia, serif' }}>
          Sports · Betting · Live Odds
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '⚡', label: 'Live In-Play Betting', sub: 'Real-time odds on every match' },
            { icon: '💳', label: 'MoMo & Instant Pay', sub: 'Withdraw in minutes' },
            { icon: '🏆', label: 'Best Odds Guaranteed', sub: 'Across 30+ sports' },
          ].map(({ icon, label, sub }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '0.85rem 1rem',
              textAlign: 'left',
            }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem', margin: 0, fontFamily: 'Georgia, serif' }}>{label}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.71rem', margin: 0 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider quote */}
        <p style={{ marginTop: '2.5rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>
          "Your game. Your odds. Your winnings."
        </p>
      </div>
    </div>
  );
}

// ─── Styled input ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.9rem 1rem',
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
      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
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

  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPw, setShowPw]         = useState(false);
  const [remember, setRemember]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const focusStyle  = { borderColor: '#CC0000', boxShadow: '0 0 0 3px rgba(204,0,0,0.1)' };
  const blurStyle   = { borderColor: '#e8e4df', boxShadow: 'none' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password.trim()) { setError('Enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await auth.login({ email: form.email.trim(), password: form.password });
      if (!res.success || !res.data?.accessToken) throw new Error(res.message ?? 'Login failed.');
      const { user: u } = res.data;
      saveSession(res.data, remember);
      login({ id: u.id, fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, phone: u.phone ?? '', email: u.email, role: mapRole(u.role), kycStatus: 'verified', referralCode: '' });
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
        @import url('https://fonts.googleapis.com/css2?family=Georgia&display=swap');
        .bet360-login-input:focus { border-color: #CC0000 !important; box-shadow: 0 0 0 3px rgba(204,0,0,0.1) !important; }
        .bet360-eye-btn:hover { color: #CC0000 !important; }
        .bet360-submit:hover:not(:disabled) { background: #aa0000 !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(204,0,0,0.3) !important; }
        .bet360-submit:active:not(:disabled) { transform: translateY(0); }
        .bet360-link:hover { text-decoration: underline; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
        @media (max-width: 768px) { .bet360-left { display: none !important; } .bet360-mobile-bar { display: flex !important; } }
      `}</style>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 4rem)', background: '#fff' }}>

        {/* Left panel — desktop */}
        <div className="bet360-left" style={{ display: 'flex' }}>
          <LeftPanel />
        </div>

        {/* Mobile top bar */}
        <div className="bet360-mobile-bar" style={{
          display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: '#0a0a0a', padding: '0.75rem 1.25rem',
          alignItems: 'center', gap: '0.75rem',
          borderBottom: '1px solid rgba(204,0,0,0.3)',
        }}>
          <ShieldLogo size={28} />
          <span style={{ fontSize: '1.1rem' }}><Bet360Wordmark variant="light" /></span>
        </div>

        {/* Right — form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', background: '#fafaf8' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Heading */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <div style={{ width: 28, height: 3, background: '#CC0000', borderRadius: 2 }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#CC0000' }}>Member Login</span>
              </div>
              <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 900, color: '#0a0a0a', margin: 0, lineHeight: 1.15 }}>
                Welcome back
              </h1>
              <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.4rem' }}>
                Sign in to access your account and bets.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#fff0f0', border: '1px solid rgba(204,0,0,0.25)', borderRadius: 10, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#CC0000', fontSize: '0.9rem', marginTop: 1 }}>⚠</span>
                <span style={{ color: '#CC0000', fontSize: '0.85rem', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Email */}
              <Field label="Email Address">
                <input
                  className="bet360-login-input"
                  type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoComplete="email" inputMode="email" disabled={loading} required
                  style={inputStyle}
                />
              </Field>

              {/* Password */}
              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    className="bet360-login-input"
                    type={showPw ? 'text' : 'password'} placeholder="••••••••"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password" disabled={loading} required
                    style={{ ...inputStyle, paddingRight: '2.8rem' }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    className="bet360-eye-btn"
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4, lineHeight: 1 }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </Field>

              {/* Remember + Forgot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ position: 'relative', width: 18, height: 18 }}>
                    <input
                      type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={loading}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: remember ? '#CC0000' : '#f0ede8',
                      border: `1.5px solid ${remember ? '#CC0000' : '#d0ccc6'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      {remember && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#666' }}>Remember me</span>
                </label>
                <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: '#CC0000', textDecoration: 'none', fontWeight: 600 }} className="bet360-link">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                className="bet360-submit"
                style={{
                  width: '100%', padding: '0.95rem',
                  background: '#CC0000', color: '#fff',
                  border: 'none', borderRadius: 10,
                  fontSize: '0.9rem', fontWeight: 700,
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '0.04em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <><span className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />Signing in…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
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

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
              New to Bet360?{' '}
              <Link to="/register" style={{ color: '#CC0000', fontWeight: 700, textDecoration: 'none' }} className="bet360-link">
                Create an account →
              </Link>
            </p>

            {/* Trust badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f0ede8' }}>
              {['🔒 Secure', '✓ Licensed', '⚡ Instant Pay'].map(b => (
                <span key={b} style={{ fontSize: '0.7rem', color: '#aaa', letterSpacing: '0.04em' }}>{b}</span>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}