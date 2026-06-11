import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { auth } from '../utils/api';
import { saveSession } from './LoginPage';

// ─── Country data ─────────────────────────────────────────────────────────────
interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
  phonePlaceholder: string;
}

const COUNTRIES: Country[] = [
  { name: 'Ethiopia',       code: 'ET', dial: '+251', flag: '🇪🇹', phonePlaceholder: '091 123 4567'   },
  { name: 'France',         code: 'FR', dial: '+33',  flag: '🇫🇷', phonePlaceholder: '06 12 34 56 78' },
  { name: 'Germany',        code: 'DE', dial: '+49',  flag: '🇩🇪', phonePlaceholder: '0151 1234 5678' },
  { name: 'Ghana',          code: 'GH', dial: '+233', flag: '🇬🇭', phonePlaceholder: '024 123 4567'   },
  { name: 'Kenya',          code: 'KE', dial: '+254', flag: '🇰🇪', phonePlaceholder: '0712 345 678'   },
  { name: 'Nigeria',        code: 'NG', dial: '+234', flag: '🇳🇬', phonePlaceholder: '080 1234 5678'  },
  { name: 'Senegal',        code: 'SN', dial: '+221', flag: '🇸🇳', phonePlaceholder: '77 123 45 67'   },
  { name: 'South Africa',   code: 'ZA', dial: '+27',  flag: '🇿🇦', phonePlaceholder: '071 234 5678'   },
  { name: 'Spain',          code: 'ES', dial: '+34',  flag: '🇪🇸', phonePlaceholder: '612 345 678'    },
  { name: 'United Kingdom', code: 'GB', dial: '+44',  flag: '🇬🇧', phonePlaceholder: '07911 123456'   },
  { name: 'United States',  code: 'US', dial: '+1',   flag: '🇺🇸', phonePlaceholder: '201 555 0123'   },
];

const NAME_PLACEHOLDERS: Record<string, [string, string]> = {
  US: ['Jordan', 'Smith'],   NG: ['Chidi',  'Okonkwo'], GH: ['Kwame',  'Mensah'],
  KE: ['Aisha',  'Wambua'],  ZA: ['Thabo',  'Dlamini'], SN: ['Fatou',  'Diallo'],
  ET: ['Biruk',  'Tesfaye'], GB: ['Oliver', 'Williams'], FR: ['Léa',   'Dubois'],
  DE: ['Lukas',  'Müller'],  ES: ['Sofía',  'García'],
};

const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'GH')!;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapRole(r: string): 'user' | 'admin' {
  return ['ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin'].includes(r) ? 'admin' : 'user';
}

function pwStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const m = [
    { score: 1, label: 'Weak',   color: '#ef4444' },
    { score: 2, label: 'Fair',   color: '#f97316' },
    { score: 3, label: 'Good',   color: '#eab308' },
    { score: 4, label: 'Strong', color: '#22c55e' },
  ];
  return m[s - 1] ?? { score: 0, label: '', color: '' };
}

// ─── WinningBet Logo (from Header.tsx) ───────────────────────────────────────
function WinningBetLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }} aria-label="WINNINGBET">
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 900,
        fontSize: '0.55rem',
        color: '#E8000D',
        alignSelf: 'flex-start',
        marginTop: 3,
        marginRight: 1,
        lineHeight: 1,
      }}>°</span>

      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 900,
        fontStyle: 'italic',
        fontSize: '1.35rem',
        letterSpacing: '-0.01em',
        color: '#E8000D',
        textTransform: 'uppercase',
        lineHeight: 1,
        display: 'inline-block',
        transform: 'skewX(-16deg)',
      }}>WINNING</span>

      <span style={{
        display: 'inline-block',
        background: '#E8000D',
        borderRadius: '4px',
        padding: '1px 12px 2px 12px',
        marginLeft: 5,
        transform: 'skewX(-16deg)',
      }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: '1.35rem',
          letterSpacing: '-0.01em',
          color: '#ffffff',
          textTransform: 'uppercase',
          lineHeight: 1,
          display: 'inline-block',
        }}>BET</span>
      </span>
    </div>
  );
}

// ─── Country selector ─────────────────────────────────────────────────────────
function CountrySelector({ value, onChange, disabled }: { value: Country; onChange: (c: Country) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref             = useRef<HTMLDivElement>(null);
  const searchRef       = useRef<HTMLInputElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.dial.includes(q) ||
    c.code.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '0.9rem 1rem',
          background: '#f7f5f2',
          border: `1.5px solid ${open ? '#E8000D' : '#e8e4df'}`,
          borderRadius: 10, fontSize: '0.9rem', color: '#111',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: open ? '0 0 0 3px rgba(232,0,13,0.1)' : 'none',
          transition: 'all 0.15s', boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{value.flag}</span>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.name}</span>
        <span style={{ fontSize: '0.8rem', color: '#999', flexShrink: 0 }}>{value.dial}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 100, left: 0, right: 0, top: 'calc(100% + 6px)',
          background: '#fff', border: '1.5px solid #e8e4df', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          maxHeight: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f0ede8' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={searchRef}
                type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search country…"
                style={{
                  width: '100%', paddingLeft: '2rem', paddingRight: '0.75rem',
                  paddingTop: '0.55rem', paddingBottom: '0.55rem',
                  background: '#f7f5f2', border: '1px solid #e8e4df',
                  borderRadius: 8, fontSize: '0.85rem', outline: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit', color: '#111',
                }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0
              ? <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#aaa', padding: '1rem' }}>No results</p>
              : filtered.map(c => (
                <button
                  key={c.code} type="button"
                  onClick={() => { onChange(c); setOpen(false); setQ(''); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.6rem 0.85rem',
                    background: c.code === value.code ? '#fff0f0' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.875rem', color: '#111',
                    fontFamily: 'inherit', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
                  onMouseLeave={e => (e.currentTarget.style.background = c.code === value.code ? '#fff0f0' : 'transparent')}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{c.flag}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{c.dial}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', padding: '0.9rem 1rem',
  background: '#f7f5f2', border: '1.5px solid #e8e4df',
  borderRadius: 10, fontSize: '0.9rem', color: '#111',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Field({ label, required: req, optional, children }: {
  label: string; required?: boolean; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{
        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#888',
        display: 'flex', alignItems: 'center', gap: '0.35rem',
      }}>
        {label}
        {req     && <span style={{ color: '#E8000D' }}>*</span>}
        {optional && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb', fontSize: '0.7rem' }}>(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement> & { extraStyle?: React.CSSProperties }) {
  const { extraStyle, style, ...rest } = props;
  return (
    <input
      {...rest}
      className="wb-reg-input"
      style={{ ...inputBase, ...extraStyle, ...style }}
    />
  );
}

// ─── Register page ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, showToast } = useAppStore();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phoneLocal: '',
    email: '', password: '', confirmPassword: '',
    referralCode: searchParams.get('ref') ?? '',
  });
  const [showPw,  setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [terms,   setTerms]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setForm(p => ({ ...p, referralCode: ref }));
  }, [searchParams]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const strength  = pwStrength(form.password);
  const pwMatch   = form.confirmPassword && form.password === form.confirmPassword;
  const fullPhone = form.phoneLocal.trim()
    ? `${country.dial}${form.phoneLocal.trim().replace(/^0/, '')}`
    : '';
  const [fp, lp] = NAME_PLACEHOLDERS[country.code] ?? ['Jordan', 'Smith'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Please enter your full name.'); return; }
    if (form.password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (!pwMatch)                   { setError('Passwords do not match.'); return; }
    if (!terms)                     { setError('Please accept the Terms & Conditions to continue.'); return; }

    setLoading(true);
    try {
      const res = await auth.register({
        email: form.email.trim(), password: form.password,
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        phone: fullPhone || undefined, country: country.code,
        ref: form.referralCode.trim() || undefined,
      });
      if (!res.success || !res.data?.accessToken) throw new Error(res.message ?? 'Registration failed.');
      const { user: u } = res.data;
      saveSession(res.data, false);
      login({
        id: u.id,
        fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        phone: u.phone ?? '',
        email: u.email,
        role: mapRole(u.role),
        kycStatus: 'unverified',
        referralCode: '',
      });
      showToast('Welcome to WinningBet! 🎉', 'success');
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

        .wb-reg-input:focus {
          border-color: #E8000D !important;
          box-shadow: 0 0 0 3px rgba(232,0,13,0.1) !important;
        }
        .wb-reg-link:hover { text-decoration: underline; }
        .wb-reg-submit:hover:not(:disabled) {
          background: #c20009 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(232,0,13,0.3) !important;
        }
        .wb-reg-submit:active:not(:disabled) { transform: translateY(0); }

        @keyframes wbRegSpin { to { transform: rotate(360deg); } }
        .wb-reg-spin {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: wbRegSpin 0.8s linear infinite;
        }
      `}</style>

      <div style={{
        minHeight: 'calc(100vh - 4rem)',
        background: '#fafaf8',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem 3rem',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <WinningBetLogo />
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
                  New Account
                </span>
              </div>
              <h1 style={{
                fontSize: '1.75rem', fontWeight: 900, color: '#0a0a0a',
                margin: 0, lineHeight: 1.15, fontFamily: "'Inter', sans-serif",
              }}>
                Create Account
              </h1>
              <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.35rem', margin: '0.35rem 0 0' }}>
                Fill in your details to get started on WinningBet.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: '1.25rem', padding: '0.85rem 1rem',
                background: '#fff0f0', border: '1px solid rgba(232,0,13,0.25)',
                borderRadius: 10, display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
              }}>
                <span style={{ color: '#E8000D', marginTop: 1 }}>⚠</span>
                <span style={{ color: '#E8000D', fontSize: '0.85rem', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Country */}
              <Field label="Country" required>
                <CountrySelector
                  value={country}
                  onChange={c => { setCountry(c); set('phoneLocal', ''); }}
                  disabled={loading}
                />
              </Field>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="First Name" required>
                  <FocusInput
                    placeholder={fp} value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    autoComplete="given-name" disabled={loading} required
                  />
                </Field>
                <Field label="Last Name" required>
                  <FocusInput
                    placeholder={lp} value={form.lastName}
                    onChange={e => set('lastName', e.target.value)}
                    autoComplete="family-name" disabled={loading} required
                  />
                </Field>
              </div>

              {/* Phone */}
              <Field label="Phone Number" optional>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.9rem 0.85rem',
                    background: '#f0ede8', border: '1.5px solid #e8e4df',
                    borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                    color: '#555', flexShrink: 0, whiteSpace: 'nowrap', userSelect: 'none',
                  }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{country.flag}</span>
                    <span>{country.dial}</span>
                  </div>
                  <FocusInput
                    type="tel"
                    placeholder={country.phonePlaceholder}
                    value={form.phoneLocal}
                    onChange={e => set('phoneLocal', e.target.value)}
                    autoComplete="tel-national" inputMode="tel" disabled={loading}
                    extraStyle={{ flex: 1 }}
                  />
                </div>
                {fullPhone && (
                  <p style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.35rem' }}>
                    Full number: <strong style={{ color: '#444' }}>{fullPhone}</strong>
                  </p>
                )}
              </Field>

              {/* Email */}
              <Field label="Email" required>
                <FocusInput
                  type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)}
                  autoComplete="email" inputMode="email" disabled={loading} required
                />
              </Field>

              {/* Password */}
              <Field label="Password" required>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wb-reg-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    autoComplete="new-password" disabled={loading} required
                    style={{ ...inputBase, paddingRight: '2.8rem' }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: '#aaa', padding: 4, lineHeight: 1,
                    }}
                    aria-label={showPw ? 'Hide' : 'Show'}
                  >
                    {showPw
                      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: '0.3rem' }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{
                          flex: 1, borderRadius: 4,
                          background: i <= strength.score ? strength.color : '#e8e4df',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    {strength.label && (
                      <p style={{ fontSize: '0.72rem', fontWeight: 600, color: strength.color, margin: 0 }}>
                        {strength.label} password
                      </p>
                    )}
                  </div>
                )}
              </Field>

              {/* Confirm password */}
              <Field label="Confirm Password" required>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wb-reg-input"
                    type={showCPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    autoComplete="new-password" disabled={loading} required
                    style={{
                      ...inputBase, paddingRight: '3.5rem',
                      ...(form.confirmPassword ? {
                        borderColor: pwMatch ? '#22c55e' : '#ef4444',
                        boxShadow: pwMatch
                          ? '0 0 0 3px rgba(34,197,94,0.1)'
                          : '0 0 0 3px rgba(239,68,68,0.1)',
                      } : {}),
                    }}
                  />
                  <div style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                  }}>
                    {form.confirmPassword && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke={pwMatch ? '#22c55e' : '#ef4444'} strokeWidth="2.5">
                        {pwMatch
                          ? <polyline points="20 6 9 17 4 12"/>
                          : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                        }
                      </svg>
                    )}
                    <button
                      type="button" onClick={() => setShowCPw(v => !v)} tabIndex={-1}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4, lineHeight: 1 }}
                      aria-label={showCPw ? 'Hide' : 'Show'}
                    >
                      {showCPw
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>
                {form.confirmPassword && !pwMatch && (
                  <p style={{ fontSize: '0.72rem', color: '#ef4444', margin: '0.25rem 0 0' }}>
                    Passwords don't match
                  </p>
                )}
              </Field>

              {/* Referral */}
              <Field label="Referral Code" optional>
                <FocusInput
                  placeholder="e.g. REF123ABC"
                  value={form.referralCode}
                  onChange={e => set('referralCode', e.target.value.toUpperCase())}
                  autoComplete="off" disabled={loading}
                />
              </Field>

              {/* Terms */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                cursor: 'pointer', userSelect: 'none',
              }}>
                <div style={{ position: 'relative', width: 18, height: 18, marginTop: 2, flexShrink: 0 }}>
                  <input
                    type="checkbox" checked={terms}
                    onChange={e => setTerms(e.target.checked)} disabled={loading}
                    style={{
                      position: 'absolute', inset: 0, opacity: 0,
                      cursor: 'pointer', width: '100%', height: '100%',
                    }}
                  />
                  <div style={{
                    width: 18, height: 18, borderRadius: 5,
                    background: terms ? '#E8000D' : '#f0ede8',
                    border: `1.5px solid ${terms ? '#E8000D' : '#d0ccc6'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    {terms && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <Link to="/terms" className="wb-reg-link" style={{ color: '#E8000D', fontWeight: 700, textDecoration: 'none' }}>
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="wb-reg-link" style={{ color: '#E8000D', fontWeight: 700, textDecoration: 'none' }}>
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !terms}
                className="wb-reg-submit"
                style={{
                  width: '100%', padding: '0.95rem',
                  background: '#E8000D', color: '#fff',
                  border: 'none', borderRadius: 10,
                  fontSize: '0.9rem', fontWeight: 700,
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
                  cursor: loading || !terms ? 'not-allowed' : 'pointer',
                  opacity: loading || !terms ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s', minHeight: 50,
                }}
              >
                {loading ? (
                  <><span className="wb-reg-spin" />Creating account…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                    Create Account
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
              Already have an account?{' '}
              <Link to="/login" className="wb-reg-link" style={{ color: '#E8000D', fontWeight: 700, textDecoration: 'none' }}>
                Log in →
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