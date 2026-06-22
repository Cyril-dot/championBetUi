// CHAMPIONBET — Header.tsx
// Auth-responsive: shows wallet balance + avatar when logged in, Join/Login when not
// Currency: shows correct symbol based on detected country, NO conversion (raw balance value shown)
//   Ghana   → GH₵
//   Nigeria → ₦
//   Others  → $
// Country detection is cached in localStorage for 24 hours.

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { wallet as walletApi } from '../../utils/api';
import type { ApiResponse } from '../../utils/api';

// ─── Currency symbol detection ────────────────────────────────────────────────

type CurrencySymbol = {
  symbol: string;
};

const CURRENCY_CACHE_KEY = 'cb_currency_cache';
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedCurrency(): CurrencySymbol | null {
  try {
    const raw = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: CurrencySymbol; timestamp: number };
    if (Date.now() - timestamp > CURRENCY_CACHE_TTL) {
      localStorage.removeItem(CURRENCY_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedCurrency(info: CurrencySymbol): void {
  try {
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({ data: info, timestamp: Date.now() }));
  } catch {}
}

async function detectCurrencySymbol(): Promise<CurrencySymbol> {
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

  let result: CurrencySymbol;

  if (countryCode === 'GH') {
    result = { symbol: 'GH₵' };
  } else if (countryCode === 'NG') {
    result = { symbol: '₦' };
  } else {
    result = { symbol: '$' };
  }

  setCachedCurrency(result);
  return result;
}

function formatAmount(balance: number, currency: CurrencySymbol): string {
  return `${currency.symbol} ${balance.toFixed(2)}`;
}

// ─── CB Monogram SVG ──────────────────────────────────────────────────────────
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

// ─── Wallet Balance chip ───────────────────────────────────────────────────────
function WalletChip({ currency }: { currency: CurrencySymbol | null }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    walletApi.getWallet()
      .then((res: ApiResponse<Record<string, unknown>>) => {
        const data = res.data as Record<string, unknown>;
        if (typeof data?.balance === 'number') setBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  const displayBalance =
    balance === null || currency === null
      ? '···'
      : formatAmount(balance, currency);

  return (
    <Link
      to="/wallet"
      className="wb-wallet-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.28)',
        borderRadius: 7,
        padding: '6px 12px 6px 9px',
        textDecoration: 'none',
        transition: 'background 0.15s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.32)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.18)')}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.85)" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M17 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/>
        <path d="M3 8h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8z"/>
        <circle cx="16" cy="13" r="1" fill="rgba(255,255,255,0.85)" stroke="none"/>
      </svg>
      <span
        className="wb-wallet-label"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: '0.82rem',
          color: '#fff',
          letterSpacing: '0.01em',
          minWidth: 60,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
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
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
    },
    {
      label: 'Wallet', to: '/wallet',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/>
          <path d="M3 8h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8z"/>
          <circle cx="16" cy="13" r="1" fill="currentColor" stroke="none"/>
        </svg>
      ),
    },
    {
      label: 'Deposit', to: '/deposit',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      ),
    },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.16)',
          border: '2px solid rgba(255,255,255,0.50)',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: '0.82rem',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s',
          flexShrink: 0,
          outline: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.28)';
          (e.currentTarget as HTMLElement).style.borderColor = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.50)';
        }}
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          minWidth: 224,
          maxWidth: '90vw',
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
          overflow: 'hidden',
          zIndex: 9999,
          animation: 'wbDropIn 0.15s ease-out',
        }}>
          {/* Profile header strip */}
          <div style={{
            padding: '14px 16px 12px',
            background: '#E8000D',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}>
            <p style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: '0.88rem',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {fullName}
            </p>
            <p style={{
              margin: '2px 0 0',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.74rem',
              color: 'rgba(255,255,255,0.72)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {u?.email as string ?? ''}
            </p>
          </div>

          {menuItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '0.83rem',
                color: '#222',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: '#888', display: 'flex' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '11px 16px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: '0.83rem',
              color: '#E8000D',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
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
    <Link
      to="/deposit"
      aria-label="Deposit"
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: '#ffffff',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        flexShrink: 0,
        transition: 'opacity 0.15s, transform 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.opacity = '0.85';
        e.currentTarget.style.transform = 'scale(1.07)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="#E8000D" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </Link>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState<CurrencySymbol | null>(null);
  const { user, modalOpen, setModalOpen } = useAppStore();
  const isLoggedIn = !!user;

  useEffect(() => {
    detectCurrencySymbol().then(setCurrency);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap');

        .wb-header {
          position: sticky;
          top: 0;
          z-index: 9997;
          background: #E8000D;
          box-shadow: ${scrolled
            ? '0 4px 24px rgba(0,0,0,0.40)'
            : '0 2px 8px rgba(0,0,0,0.18)'
          };
          transition: box-shadow 0.2s, transform 0.3s ease-in-out;
          transform: ${modalOpen ? 'translateY(-100%)' : 'translateY(0)'};
        }

        .wb-header-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 20px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        @media (max-width: 480px) {
          .wb-header-inner {
            height: 56px;
            padding: 0 14px;
            gap: 7px;
          }
        }

        @media (max-width: 360px) {
          .wb-logo-badge { width: 34px !important; height: 34px !important; border-radius: 6px !important; }
          .wb-logo-champion { font-size: 0.62rem !important; }
          .wb-logo-bet { font-size: 1.35rem !important; }
        }

        @media (max-width: 320px) {
          .wb-logo-badge { width: 28px !important; height: 28px !important; }
          .wb-logo-champion { font-size: 0.56rem !important; }
          .wb-logo-bet { font-size: 1.1rem !important; }
        }

        @media (max-width: 400px) {
          .wb-wallet-label { display: none; }
          .wb-wallet-chip { padding: 6px 9px !important; }
        }

        @media (max-width: 480px) {
          .wb-right-controls { gap: 6px !important; }
        }

        .wb-btn-join {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 0.86rem;
          letter-spacing: 0.02em;
          color: #E8000D;
          background: #ffffff;
          border: none;
          padding: 9px 24px;
          border-radius: 50px;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.12s;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .wb-btn-join:hover { opacity: 0.88; transform: translateY(-1px); }

        .wb-btn-login {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.86rem;
          letter-spacing: 0.02em;
          color: #ffffff;
          background: transparent;
          border: 2px solid rgba(255,255,255,0.80);
          padding: 7px 20px;
          border-radius: 50px;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, transform 0.12s;
          display: inline-flex;
          align-items: center;
        }
        .wb-btn-login:hover { background: rgba(255,255,255,0.18); transform: translateY(-1px); }

        @media (max-width: 380px) {
          .wb-btn-join  { padding: 7px 14px; font-size: 0.78rem; }
          .wb-btn-login { padding: 5px 12px; font-size: 0.78rem; }
        }
        @media (max-width: 320px) {
          .wb-btn-join  { padding: 6px 11px; font-size: 0.72rem; }
          .wb-btn-login { padding: 4px 9px;  font-size: 0.72rem; }
        }

        @keyframes wbDropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="wb-header">
        <div className="wb-header-inner">

          {/* ── Left: Logo ── */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0, minWidth: 0 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }}
              aria-label="ChampionBet"
            >
              <div
                className="wb-logo-badge"
                style={{
                  width: 42,
                  height: 42,
                  background: 'rgba(0,0,0,0.22)',
                  border: '2px solid rgba(255,255,255,0.70)',
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                <CBMark size={24} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 0 }}>
                <span
                  className="wb-logo-champion"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontStyle: 'italic',
                    fontSize: '0.72rem',
                    letterSpacing: '0.26em',
                    color: 'rgba(255,255,255,0.90)',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Champion
                </span>
                <span
                  className="wb-logo-bet"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 900,
                    fontStyle: 'italic',
                    fontSize: '1.72rem',
                    letterSpacing: '-0.01em',
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    display: 'inline-block',
                    transform: 'skewX(-10deg)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.30)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Bet
                </span>
                <div style={{
                  width: '100%',
                  height: 2.5,
                  background: '#ffffff',
                  borderRadius: 2,
                  opacity: 0.65,
                  marginTop: 2,
                }} />
              </div>
            </div>
          </Link>

          {/* ── Right: Auth controls ── */}
          <div
            className="wb-right-controls"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
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
