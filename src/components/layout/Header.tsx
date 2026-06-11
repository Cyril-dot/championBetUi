// WINNINGBET — Header.tsx
// Auth-responsive: shows wallet balance + avatar when logged in, Join/Login when not
// Currency: backend stores GH₵. Detected country switches display:
//   Ghana   → GH₵ (no conversion)
//   Nigeria → ₦ NGN (live GHS→NGN rate)
//   Others  → $ USD (live GHS→USD rate)
// Country detection is cached in localStorage for 24 hours.

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { wallet as walletApi } from '../../utils/api';
import type { ApiResponse } from '../../utils/api';

// ─── Currency detection + conversion ─────────────────────────────────────────

type CurrencyInfo = {
  code: 'GHS' | 'NGN' | 'USD';
  symbol: string;
  rate: number;
};

const CURRENCY_CACHE_KEY = 'wb_currency_cache';
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedCurrency(): CurrencyInfo | null {
  try {
    const raw = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: CurrencyInfo; timestamp: number };
    if (Date.now() - timestamp > CURRENCY_CACHE_TTL) {
      localStorage.removeItem(CURRENCY_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedCurrency(info: CurrencyInfo): void {
  try {
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({ data: info, timestamp: Date.now() }));
  } catch {}
}

async function detectCurrency(): Promise<CurrencyInfo> {
  const cached = getCachedCurrency();
  if (cached) return cached;

  let countryCode = 'GH';
  try {
    const geoRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (geoRes.ok) {
      const geo = await geoRes.json();
      countryCode = geo?.country_code ?? 'GH';
    }
  } catch {}

  let result: CurrencyInfo;

  if (countryCode === 'GH') {
    result = { code: 'GHS', symbol: 'GH₵', rate: 1 };
  } else if (countryCode === 'NG') {
    try {
      const fxRes = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(5000) });
      if (fxRes.ok) {
        const fx = await fxRes.json();
        const rate = fx?.rates?.NGN;
        result = typeof rate === 'number' && rate > 0
          ? { code: 'NGN', symbol: '₦', rate }
          : { code: 'NGN', symbol: '₦', rate: 52 };
      } else {
        result = { code: 'NGN', symbol: '₦', rate: 52 };
      }
    } catch {
      result = { code: 'NGN', symbol: '₦', rate: 52 };
    }
  } else {
    try {
      const fxRes = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(5000) });
      if (fxRes.ok) {
        const fx = await fxRes.json();
        const rate = fx?.rates?.USD;
        result = typeof rate === 'number' && rate > 0
          ? { code: 'USD', symbol: '$', rate }
          : { code: 'USD', symbol: '$', rate: 0.067 };
      } else {
        result = { code: 'USD', symbol: '$', rate: 0.067 };
      }
    } catch {
      result = { code: 'USD', symbol: '$', rate: 0.067 };
    }
  }

  setCachedCurrency(result);
  return result;
}

function formatAmount(cedis: number, currency: CurrencyInfo): string {
  const converted = cedis * currency.rate;
  if (currency.code === 'GHS') return `GH₵ ${converted.toFixed(2)}`;
  if (currency.code === 'NGN') return `₦ ${converted.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$ ${converted.toFixed(2)}`;
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function WinningBetLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }} aria-label="WINNINGBET">
      <span style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 900,
        fontSize: '0.55rem', color: '#ffffff',
        alignSelf: 'flex-start', marginTop: 3, marginRight: 1, lineHeight: 1,
      }}>°</span>

      <span style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 900, fontStyle: 'italic',
        fontSize: '1.35rem', letterSpacing: '-0.01em', color: '#ffffff',
        textTransform: 'uppercase', lineHeight: 1,
        display: 'inline-block', transform: 'skewX(-16deg)',
      }}>WINNING</span>

      <span style={{
        display: 'inline-block', background: '#ffffff', borderRadius: '4px',
        padding: '1px 12px 2px 12px', marginLeft: 5, transform: 'skewX(-16deg)',
      }}>
        <span style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 900, fontStyle: 'italic',
          fontSize: '1.35rem', letterSpacing: '-0.01em', color: '#E8000D',
          textTransform: 'uppercase', lineHeight: 1, display: 'inline-block',
        }}>BET</span>
      </span>
    </div>
  );
}

// ─── Wallet Balance chip ───────────────────────────────────────────────────────
function WalletChip({ currency }: { currency: CurrencyInfo | null }) {
  const [balanceCedis, setBalanceCedis] = useState<number | null>(null);

  useEffect(() => {
    walletApi.getWallet()
      .then((res: ApiResponse<Record<string, unknown>>) => {
        const data = res.data as Record<string, unknown>;
        if (typeof data?.balance === 'number') setBalanceCedis(data.balance);
      })
      .catch(() => {});
  }, []);

  const displayBalance =
    balanceCedis === null || currency === null
      ? '···'
      : formatAmount(balanceCedis, currency);

  return (
    <Link
      to="/wallet"
      className="wb-wallet-chip"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,0,0,0.20)', border: '1.5px solid rgba(255,255,255,0.25)',
        borderRadius: 7, padding: '5px 11px 5px 8px',
        textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.20)')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/>
        <path d="M3 8h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8z"/>
        <circle cx="16" cy="13" r="1" fill="rgba(255,255,255,0.85)" stroke="none"/>
      </svg>
      <span style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.82rem',
        color: '#fff', letterSpacing: '0.01em', minWidth: 60, textAlign: 'right',
      }}>
        {displayBalance}
      </span>
    </Link>
  );
}

// ─── User Avatar + dropdown ───────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen]     = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);
  const { user, logout }    = useAppStore();
  const navigate            = useNavigate();

  const u = user as unknown as Record<string, unknown>;
  const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || (u?.email as string) || 'U';
  const initials = fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleLogout = () => { logout(); setOpen(false); navigate('/'); };

  const menuItems = [
    {
      label: 'My Account', to: '/account',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    },
    {
      label: 'Wallet', to: '/wallet',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/><path d="M3 8h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8z"/><circle cx="16" cy="13" r="1" fill="currentColor" stroke="none"/></svg>,
    },
    {
      label: 'Deposit', to: '/deposit',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.55)',
          color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: 700,
          fontSize: '0.88rem', letterSpacing: '0.04em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s', flexShrink: 0, outline: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.30)';
          (e.currentTarget as HTMLElement).style.borderColor = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.55)';
        }}
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          minWidth: 220, background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden',
          zIndex: 9999, animation: 'wbDropIn 0.15s ease-out',
        }}>
          <div style={{ padding: '14px 16px 12px', background: '#E8000D', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</p>
            <p style={{ margin: '2px 0 0', fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u?.email as string ?? ''}</p>
          </div>

          {menuItems.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.83rem', color: '#222', textDecoration: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: '#888', display: 'flex' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.83rem', color: '#E8000D', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff0f0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/>
              <path d="M9 12h12m-3-3 3 3-3 3"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Deposit shortcut button ──────────────────────────────────────────────────
function DepositBtn() {
  return (
    <Link to="/deposit" aria-label="Deposit"
      style={{
        width: 34, height: 34, borderRadius: '50%',
        background: '#ffffff', border: 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none', flexShrink: 0, transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8000D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </Link>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const { user, modalOpen, setModalOpen } = useAppStore();
  const isLoggedIn = !!user;

  useEffect(() => {
    detectCurrency().then(setCurrency);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .wb-header {
          position: sticky;
          top: 0;
          z-index: 9997;
          background: #E8000D;
          box-shadow: ${scrolled ? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.20)'};
          transition: box-shadow 0.2s, transform 0.3s ease-in-out;
          transform: ${modalOpen ? 'translateY(-100%)' : 'translateY(0)'};
        }

        .wb-header-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 16px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        /* Tighten logo on very small screens */
        @media (max-width: 360px) {
          .wb-logo-winning {
            font-size: 1.1rem !important;
          }
          .wb-logo-bet {
            font-size: 1.1rem !important;
          }
        }

        /* Hide wallet balance text on small screens, show icon only */
        @media (max-width: 400px) {
          .wb-wallet-label {
            display: none;
          }
          .wb-wallet-chip {
            padding: 5px 8px !important;
          }
        }

        /* Join Now — white pill, red text */
        .wb-btn-join {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.84rem;
          letter-spacing: 0.02em;
          color: #E8000D;
          background: #ffffff;
          border: none;
          padding: 8px 22px;
          border-radius: 50px;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.12s;
          display: inline-flex;
          align-items: center;
        }
        .wb-btn-join:hover {
          opacity: 0.90;
          transform: translateY(-1px);
        }

        /* Log In — white outline pill */
        .wb-btn-login {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.84rem;
          letter-spacing: 0.02em;
          color: #ffffff;
          background: transparent;
          border: 2px solid #ffffff;
          padding: 6px 20px;
          border-radius: 50px;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, transform 0.12s;
          display: inline-flex;
          align-items: center;
        }
        .wb-btn-login:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }

        /* Compact buttons on small screens */
        @media (max-width: 380px) {
          .wb-btn-join {
            padding: 7px 14px;
            font-size: 0.78rem;
          }
          .wb-btn-login {
            padding: 5px 12px;
            font-size: 0.78rem;
          }
        }

        @keyframes wbDropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="wb-header">
        <div className="wb-header-inner">

          {/* Left — Logo */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }} aria-label="WINNINGBET">
              <span style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 900,
                fontSize: '0.55rem', color: '#ffffff',
                alignSelf: 'flex-start', marginTop: 3, marginRight: 1, lineHeight: 1,
              }}>°</span>
              <span className="wb-logo-winning" style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 900, fontStyle: 'italic',
                fontSize: '1.35rem', letterSpacing: '-0.01em', color: '#ffffff',
                textTransform: 'uppercase', lineHeight: 1,
                display: 'inline-block', transform: 'skewX(-16deg)',
              }}>WINNING</span>
              <span style={{
                display: 'inline-block', background: '#ffffff', borderRadius: '4px',
                padding: '1px 12px 2px 12px', marginLeft: 5, transform: 'skewX(-16deg)',
              }}>
                <span className="wb-logo-bet" style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 900, fontStyle: 'italic',
                  fontSize: '1.35rem', letterSpacing: '-0.01em', color: '#E8000D',
                  textTransform: 'uppercase', lineHeight: 1, display: 'inline-block',
                }}>BET</span>
              </span>
            </div>
          </Link>

          {/* Right — Auth controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isLoggedIn ? (
              <>
                <WalletChip currency={currency} />
                <DepositBtn />
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/register" className="wb-btn-join">Join Now</Link>
                <Link to="/login"    className="wb-btn-login">Log In</Link>
              </>
            )}
          </div>

        </div>
      </header>
    </>
  );
}