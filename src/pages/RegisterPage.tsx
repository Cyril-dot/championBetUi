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

// ─── Logo ─────────────────────────────────────────────────────────────────────
function ShieldLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" fill="none">
      <path d="M20 1L2 9v13c0 12 7.5 21 18 24C31.5 43 38 34 38 22V9L20 1z" fill="#CC0000"/>
      <path d="M20 1L2 9v13c0 12 7.5 21 18 24C31.5 43 38 34 38 22V9L20 1z" stroke="#ff2200" strokeWidth="0.5" strokeOpacity="0.4"/>
      <text x="20" y="28" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="11" fill="#fff" letterSpacing="-0.5">360</text>
    </svg>
  );
}

// ─── Country selector ─────────────────────────────────────────────────────────
function CountrySelector({ value, onChange, disabled }: { value: Country; onChange: (c: Country) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref             = useRef<HTMLDivElement>(null);
  const searchRef       = useRef<HTMLInputElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.dial.includes(q) || c.code.toLowerCase().includes(q.toLowerCase())
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
        type="button" disabled={disabled} onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '0.9rem 1rem',
          background: '#f7f5f2', border: `1.5px solid ${open ? '#CC0000' : '#e8e4df'}`,
          borderRadius: 10, fontSize: '0.9rem', color: '#111',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: open ? '0 0 0 3px rgba(204,0,0,0.1)' : 'none',
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
                ref={searchRef} type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search country…"
                style={{ width: '100%', paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', background: '#f7f5f2', border: '1px solid #e8e4df', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111' }}
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
                    padding: '0.6rem 0.85rem', background: c.code === value.code ? '#fff5f5' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#111',
                    fontFamily: 'inherit', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
                  onMouseLeave={e => (e.currentTarget.style.background = c.code === value.code ? '#fff5f5' : 'transparent')}
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

function Field({ label, required: req, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {label}
        {req     && <span style={{ color: '#CC0000' }}>*</span>}
        {optional && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb', fontSize: '0.7rem' }}>(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement> & { extraStyle?: React.CSSProperties }) {
  const { extraStyle, ...rest } = props;
  return (
    <input
      {...rest}
      className="b360-input"
      style={{ ...inputBase, ...extraStyle, ...(props.style || {}) }}
    />
  );
}

// ─── Left panel ───────────────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '3rem 2.5rem',
    }}>
      {/* grid bg */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(204,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(204,0,0,0.05) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
      {/* glow */}
      <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%,-50%)', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,0,0,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 280, width: '100%' }}>
        <div style={{ marginBottom: '1.25rem' }}><ShieldLogo size={60} /></div>
        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontFamily: 'Georgia, serif', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em' }}>
          <span style={{ color: '#fff' }}>BET</span><span style={{ color: '#ff8888' }}>360</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', marginBottom: '2.5rem' }}>
          Sports · Betting · Live Odds
        </p>

        {/* Bonus card */}
        <div style={{ background: 'rgba(204,0,0,0.12)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: 14, padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Welcome Bonus</p>
          <p style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Georgia, serif', margin: '0 0 0.2rem', lineHeight: 1.1 }}>100%<br/>up to GH₵1,000</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: 0 }}>On your first deposit</p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {['Create your account', 'Make your first deposit', 'Start betting & winning!'].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#CC0000' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>{i + 1}</span>
              </div>
              <p style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: '0.8rem', margin: 0, textAlign: 'left' }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const fullPhone = form.phoneLocal.trim() ? `${country.dial}${form.phoneLocal.trim().replace(/^0/, '')}` : '';
  const [fp, lp]  = NAME_PLACEHOLDERS[country.code] ?? ['Jordan', 'Smith'];

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
      login({ id: u.id, fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, phone: u.phone ?? '', email: u.email, role: mapRole(u.role), kycStatus: 'unverified', referralCode: '' });
      showToast('Welcome to Bet360! 🎉', 'success');
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

        /* --- layout root --- */
        .b360-page {
          display: flex;
          height: calc(100vh - 4rem);
          overflow: hidden;
          background: #fff;
        }

        /* --- left column: fixed width, full height, scrolls nothing --- */
        .b360-left {
          width: 360px;
          min-width: 320px;
          flex-shrink: 0;
          height: 100%;
          overflow: hidden;
        }

        /* --- right column: takes remaining space, scrollable --- */
        .b360-right {
          flex: 1;
          height: 100%;
          overflow-y: auto;
          background: #fafaf8;
          min-width: 0;
        }

        /* hide left panel + show mobile bar on small screens */
        .b360-mobile-bar { display: none; }

        @media (max-width: 768px) {
          .b360-page { height: auto; min-height: 100vh; flex-direction: column; overflow: visible; }
          .b360-left { display: none; }
          .b360-right { height: auto; overflow-y: visible; }
          .b360-mobile-bar { display: flex !important; }
        }

        .b360-input:focus {
          border-color: #CC0000 !important;
          box-shadow: 0 0 0 3px rgba(204,0,0,0.1) !important;
        }
        .b360-link:hover { text-decoration: underline; }
        .b360-submit:hover:not(:disabled) {
          background: #aa0000 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(204,0,0,0.3) !important;
        }
        .b360-submit:active:not(:disabled) { transform: translateY(0); }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }
      `}</style>

      {/* Mobile top bar */}
      <div className="b360-mobile-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#0a0a0a', padding: '0.75rem 1.25rem', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(204,0,0,0.3)' }}>
        <ShieldLogo size={26} />
        <span style={{ fontFamily: 'Georgia,serif', fontWeight: 900, fontStyle: 'italic', fontSize: '1.1rem' }}>
          <span style={{ color: '#fff' }}>BET</span><span style={{ color: '#ff8888' }}>360</span>
        </span>
      </div>

      <div className="b360-page">

        {/* ── Left panel ── */}
        <div className="b360-left">
          <LeftPanel />
        </div>

        {/* ── Right: scrollable form ── */}
        <div className="b360-right">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 1.5rem 3rem' }}>
            <div style={{ width: '100%', maxWidth: 460 }}>

              {/* Heading */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <div style={{ width: 28, height: 3, background: '#CC0000', borderRadius: 2 }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#CC0000' }}>New Account</span>
                </div>
                <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 900, color: '#0a0a0a', margin: 0, lineHeight: 1.15 }}>
                  Create Account
                </h1>
                <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.4rem' }}>
                  Fill in your details to get started on Bet360.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#fff0f0', border: '1px solid rgba(204,0,0,0.25)', borderRadius: 10, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#CC0000', marginTop: 1 }}>⚠</span>
                  <span style={{ color: '#CC0000', fontSize: '0.85rem', lineHeight: 1.5 }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Country */}
                <Field label="Country" required>
                  <CountrySelector value={country} onChange={c => { setCountry(c); set('phoneLocal', ''); }} disabled={loading} />
                </Field>

                {/* Name row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Field label="First Name" required>
                    <FocusInput placeholder={fp} value={form.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="given-name" disabled={loading} required />
                  </Field>
                  <Field label="Last Name" required>
                    <FocusInput placeholder={lp} value={form.lastName} onChange={e => set('lastName', e.target.value)} autoComplete="family-name" disabled={loading} required />
                  </Field>
                </div>

                {/* Phone */}
                <Field label="Phone Number" optional>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.9rem 0.85rem', background: '#f0ede8', border: '1.5px solid #e8e4df', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, color: '#555', flexShrink: 0, whiteSpace: 'nowrap', userSelect: 'none' }}>
                      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{country.flag}</span>
                      <span>{country.dial}</span>
                    </div>
                    <FocusInput
                      type="tel" placeholder={country.phonePlaceholder}
                      value={form.phoneLocal} onChange={e => set('phoneLocal', e.target.value)}
                      autoComplete="tel-national" inputMode="tel" disabled={loading}
                      extraStyle={{ flex: 1 }}
                    />
                  </div>
                  {fullPhone && <p style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.35rem' }}>Full number: <strong style={{ color: '#444' }}>{fullPhone}</strong></p>}
                </Field>

                {/* Email */}
                <Field label="Email" required>
                  <FocusInput type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" inputMode="email" disabled={loading} required />
                </Field>

                {/* Password */}
                <Field label="Password" required>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="b360-input"
                      type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                      value={form.password} onChange={e => set('password', e.target.value)}
                      autoComplete="new-password" disabled={loading} required
                      style={{ ...inputBase, paddingRight: '2.8rem' }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4, lineHeight: 1 }}
                      aria-label={showPw ? 'Hide' : 'Show'}>
                      {showPw
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                  {form.password && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: '0.3rem' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, borderRadius: 4, background: i <= strength.score ? strength.color : '#e8e4df', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                      {strength.label && <p style={{ fontSize: '0.72rem', fontWeight: 600, color: strength.color, margin: 0 }}>{strength.label} password</p>}
                    </div>
                  )}
                </Field>

                {/* Confirm password */}
                <Field label="Confirm Password" required>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="b360-input"
                      type={showCPw ? 'text' : 'password'} placeholder="••••••••"
                      value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                      autoComplete="new-password" disabled={loading} required
                      style={{
                        ...inputBase, paddingRight: '3.5rem',
                        ...(form.confirmPassword
                          ? { borderColor: pwMatch ? '#22c55e' : '#ef4444', boxShadow: pwMatch ? '0 0 0 3px rgba(34,197,94,0.1)' : '0 0 0 3px rgba(239,68,68,0.1)' }
                          : {}),
                      }}
                    />
                    <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {form.confirmPassword && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pwMatch ? '#22c55e' : '#ef4444'} strokeWidth="2.5">
                          {pwMatch ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                        </svg>
                      )}
                      <button type="button" onClick={() => setShowCPw(v => !v)} tabIndex={-1}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4, lineHeight: 1 }}
                        aria-label={showCPw ? 'Hide' : 'Show'}>
                        {showCPw
                          ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      </button>
                    </div>
                  </div>
                  {form.confirmPassword && !pwMatch && <p style={{ fontSize: '0.72rem', color: '#ef4444', margin: '0.25rem 0 0' }}>Passwords don't match</p>}
                </Field>

                {/* Referral */}
                <Field label="Referral Code" optional>
                  <FocusInput placeholder="e.g. REF123ABC" value={form.referralCode} onChange={e => set('referralCode', e.target.value.toUpperCase())} autoComplete="off" disabled={loading} />
                </Field>

                {/* Terms */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ position: 'relative', width: 18, height: 18, marginTop: 2, flexShrink: 0 }}>
                    <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} disabled={loading}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: terms ? '#CC0000' : '#f0ede8', border: `1.5px solid ${terms ? '#CC0000' : '#d0ccc6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      {terms && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.5 }}>
                    I agree to the{' '}
                    <Link to="/terms" style={{ color: '#CC0000', fontWeight: 700, textDecoration: 'none' }} className="b360-link">Terms & Conditions</Link>
                    {' '}and{' '}
                    <Link to="/privacy" style={{ color: '#CC0000', fontWeight: 700, textDecoration: 'none' }} className="b360-link">Privacy Policy</Link>
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit" disabled={loading || !terms}
                  className="b360-submit"
                  style={{
                    width: '100%', padding: '0.95rem',
                    background: '#CC0000', color: '#fff',
                    border: 'none', borderRadius: 10,
                    fontSize: '0.9rem', fontWeight: 700,
                    fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
                    cursor: loading || !terms ? 'not-allowed' : 'pointer',
                    opacity: loading || !terms ? 0.65 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s', minHeight: 50,
                  }}
                >
                  {loading ? (
                    <><span className="spin" />Creating account…</>
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

              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#CC0000', fontWeight: 700, textDecoration: 'none' }} className="b360-link">
                  Log in →
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

      </div>
    </>
  );
}