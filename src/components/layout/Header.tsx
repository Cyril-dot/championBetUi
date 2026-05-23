import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { wallet } from '../../utils/api';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HomeIcon from '@mui/icons-material/Home';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CasinoIcon from '@mui/icons-material/Casino';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';

// ---------------------------------------------------------------------------
// Currency detection (mirrors WalletPage logic)
// ---------------------------------------------------------------------------

interface CurrencyInfo {
  code: string;
  symbol: string;
  rateFromGhs: number; // 1 GHS = X this currency
}

const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string }> = {
  GH: { code: 'GHS', symbol: 'GH₵' },
  NG: { code: 'NGN', symbol: '₦'   },
  KE: { code: 'KES', symbol: 'KSh' },
  TZ: { code: 'TZS', symbol: 'TSh' },
  UG: { code: 'UGX', symbol: 'USh' },
  ZA: { code: 'ZAR', symbol: 'R'   },
  EG: { code: 'EGP', symbol: 'E£'  },
  ET: { code: 'ETB', symbol: 'Br'  },
  SN: { code: 'XOF', symbol: 'CFA' },
  CI: { code: 'XOF', symbol: 'CFA' },
  CM: { code: 'XAF', symbol: 'FCFA'},
  ZM: { code: 'ZMW', symbol: 'ZK'  },
  ZW: { code: 'ZWL', symbol: 'Z$'  },
  RW: { code: 'RWF', symbol: 'FRw' },
  MW: { code: 'MWK', symbol: 'MK'  },
  MZ: { code: 'MZN', symbol: 'MT'  },
  GB: { code: 'GBP', symbol: '£'   },
  DE: { code: 'EUR', symbol: '€'   },
  FR: { code: 'EUR', symbol: '€'   },
  IT: { code: 'EUR', symbol: '€'   },
  NL: { code: 'EUR', symbol: '€'   },
  US: { code: 'USD', symbol: '$'   },
  CA: { code: 'CAD', symbol: 'CA$' },
  AU: { code: 'AUD', symbol: 'A$'  },
};

const DEFAULT_CURRENCY: CurrencyInfo = { code: 'GHS', symbol: 'GH₵', rateFromGhs: 1 };

// Cache across re-renders so we don't hit geo APIs on every poll tick
let _currencyCache: CurrencyInfo | null = null;

async function detectCurrency(): Promise<CurrencyInfo> {
  if (_currencyCache) return _currencyCache;

  let countryCode = '';

  // 1) ip-api
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,countryCode', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.status === 'success') countryCode = d.countryCode ?? '';
    }
  } catch { /* fall through */ }

  // 2) ipapi.co
  if (!countryCode) {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const d = await res.json();
        countryCode = d.country_code ?? '';
      }
    } catch { /* fall through */ }
  }

  const local = countryCode ? COUNTRY_CURRENCY[countryCode] : undefined;
  if (!local) {
    _currencyCache = DEFAULT_CURRENCY;
    return _currencyCache;
  }

  let rateFromGhs = 1;
  if (local.code !== 'GHS') {
    // 3) Fetch live GHS → local rate
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/GHS', {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        rateFromGhs = d.rates?.[local.code] ?? 1;
      }
    } catch { /* fall through */ }
  }

  _currencyCache = { code: local.code, symbol: local.symbol, rateFromGhs };
  return _currencyCache;
}

function formatBalance(amountGhs: number, currency: CurrencyInfo): string {
  const converted = amountGhs * currency.rateFromGhs;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  } catch {
    return `${currency.symbol} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// ---------------------------------------------------------------------------
// Nav links
// ---------------------------------------------------------------------------
const navLinks = [
  { to: '/',          label: 'Home',      icon: <HomeIcon sx={{ fontSize: 16 }} /> },
  {
    to: '/live',
    label: 'Live',
    icon: <FiberManualRecordIcon className="text-green-500 animate-pulse-green" sx={{ fontSize: 16 }} />,
  },
  { to: '/casino',    label: 'Casino',    icon: <CasinoIcon sx={{ fontSize: 16 }} /> },
  { to: '/affiliate', label: 'Affiliate', icon: <GroupAddIcon sx={{ fontSize: 16 }} /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getUserInitials(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ---------------------------------------------------------------------------
// NxtBetLogo
// ---------------------------------------------------------------------------
function NxtBetLogo() {
  return (
    <div className="flex items-center gap-2 select-none" aria-label="NxtBet">
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="nxtbet-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1565C0" />
              <stop offset="100%" stopColor="#42A5F5" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="18" r="17" fill="url(#nxtbet-bg)" />
          <circle cx="18" cy="18" r="12" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeDasharray="4 2.5" />
          <circle cx="18" cy="18" r="8" fill="rgba(255,255,255,0.12)" />
          <text x="18" y="23" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="14" fill="#ffffff">N</text>
          <circle cx="30" cy="18" r="2.8" fill="#ffffff" />
          <circle cx="6"  cy="18" r="1.8" fill="rgba(255,255,255,0.45)" />
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, lineHeight: 1 }}>
        <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Nxt</span>
        <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Bet</span>
      </div>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #1565C0, #42A5F5)', marginBottom: 8, flexShrink: 0 }} aria-hidden="true" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Header
// ---------------------------------------------------------------------------
export default function Header() {
  const { theme, toggleTheme, user } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wallet state — balance stored in GHS (backend native), displayed in local currency
  const [walletBalanceGhs, setWalletBalanceGhs] = useState<number | null>(null);
  const [currency,         setCurrency]         = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [balanceLoading,   setBalanceLoading]   = useState(false);
  const [balanceFlash,     setBalanceFlash]     = useState(false);

  const location    = useLocation();
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBalRef  = useRef<number | null>(null);

  const isDark = theme.endsWith('-dark');

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Detect local currency once on mount
  useEffect(() => {
    detectCurrency().then(setCurrency);
  }, []);

  // Fetch wallet balance, compare to previous, flash on change
  const fetchBalance = async () => {
    if (!user) return;
    try {
      const res = await wallet.getWallet();
      if (res.success && res.data) {
        const d = res.data as Record<string, unknown>;
        // Backend returns balance in GHS
        const newBal =
          typeof d.balance === 'number'         ? d.balance :
          typeof d.balanceGhs === 'number'       ? d.balanceGhs :
          typeof d.availableBalance === 'number' ? d.availableBalance :
          null;

        if (newBal !== null) {
          if (prevBalRef.current !== null && prevBalRef.current !== newBal) {
            setBalanceFlash(true);
            setTimeout(() => setBalanceFlash(false), 600);
          }
          prevBalRef.current = newBal;
          setWalletBalanceGhs(newBal);
        }
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!user) {
      setWalletBalanceGhs(null);
      prevBalRef.current = null;
      setMobileMenuOpen(false);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    setBalanceLoading(true);
    fetchBalance().finally(() => setBalanceLoading(false));
    pollRef.current = setInterval(fetchBalance, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  // Formatted balance string in local currency
  const balanceDisplay = walletBalanceGhs !== null
    ? formatBalance(walletBalanceGhs, currency)
    : null;

  // ---------------------------------------------------------------------------
  return (
    <header
      className="sticky top-0 z-50 border-b shadow-sm"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
    >
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">

        {/* LOGO */}
        <Link to="/" className="flex items-center shrink-0">
          <NxtBetLogo />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map(l => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: active ? 'color-mix(in srgb, #1565C0 12%, transparent)' : undefined,
                  color: active ? '#1565C0' : 'var(--text-muted)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
              >
                {l.icon}
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors touch-manipulation"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
            aria-label="Toggle theme"
          >
            {isDark
              ? <LightModeIcon fontSize="small" className="text-yellow-400" />
              : <DarkModeIcon fontSize="small" />}
          </button>

          {/* ── LOGGED IN ── */}
          {user ? (
            <div className="flex items-center gap-2">

              {/* Wallet balance pill — local currency */}
              <Link
                to="/wallet"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all touch-manipulation"
                style={{
                  borderColor: balanceFlash ? '#4ade80' : 'var(--border-light)',
                  backgroundColor: balanceFlash
                    ? 'color-mix(in srgb, #4ade80 15%, transparent)'
                    : 'var(--card-alt)',
                }}
                title={`Wallet balance (${currency.code})`}
              >
                {/* Live indicator dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>

                <AccountBalanceWalletIcon sx={{ fontSize: 14, color: 'var(--text-muted)' }} />

                {balanceLoading && walletBalanceGhs === null ? (
                  <span className="text-xs w-14 animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</span>
                ) : balanceDisplay !== null ? (
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: balanceFlash ? '#16a34a' : 'var(--text-main)' }}
                  >
                    {balanceDisplay}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </Link>

              {/* Deposit button */}
              <Link
                to="/deposit"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full touch-manipulation font-bold text-sm whitespace-nowrap"
                style={{
                  background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.9';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.35)';
                }}
              >
                <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
                Deposit
              </Link>

              {/* User avatar */}
              <Link
                to="/account"
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors touch-manipulation"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
                  style={{ background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)' }}
                >
                  {getUserInitials(user.fullName)}
                </div>
                <span className="hidden sm:inline text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                  {user.fullName.split(' ')[0]}
                </span>
              </Link>
            </div>
          ) : (
            /* ── NOT LOGGED IN ── */
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors touch-manipulation whitespace-nowrap"
                style={{ color: 'var(--text-main)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
              >
                <LoginIcon fontSize="small" />
                <span>Login</span>
              </Link>

              <Link
                to="/register"
                className="flex items-center gap-1.5 text-sm py-2 px-4 rounded-full touch-manipulation font-bold whitespace-nowrap"
                style={{
                  background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(21, 101, 192, 0.4)',
                  border: 'none',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.9';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(21, 101, 192, 0.55)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(21, 101, 192, 0.4)';
                }}
              >
                <PersonAddIcon fontSize="small" />
                <span className="hidden xs:inline">Register</span>
                <span className="xs:hidden">Join</span>
              </Link>
            </div>
          )}

          {/* Hamburger — mobile/tablet, logged-in only */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2 rounded-lg transition-colors touch-manipulation"
              style={{ color: 'var(--text-main)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t animate-fade-in"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
        >
          <nav className="flex flex-col p-3 gap-1">

            {navLinks.map(l => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] touch-manipulation"
                  style={{
                    backgroundColor: active ? 'color-mix(in srgb, #1565C0 12%, transparent)' : undefined,
                    color: active ? '#1565C0' : 'var(--text-muted)',
                  }}
                >
                  {l.icon}
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                    {l.label}
                  </span>
                </Link>
              );
            })}

            <div className="border-t mt-1 pt-2 flex flex-col gap-2" style={{ borderColor: 'var(--border-light)' }}>
              {user ? (
                <>
                  {/* Wallet balance row — local currency */}
                  <Link
                    to="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg min-h-[48px] touch-manipulation"
                    style={{ backgroundColor: 'var(--card-alt)' }}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      <AccountBalanceWalletIcon fontSize="small" />
                      Wallet Balance
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-main)' }}>
                        {balanceDisplay ?? '—'}
                      </span>
                    </div>
                  </Link>

                  {/* Deposit button */}
                  <Link
                    to="/deposit"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 text-sm min-h-[48px] rounded-full touch-manipulation font-bold"
                    style={{
                      background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                      color: '#ffffff',
                      boxShadow: '0 2px 10px rgba(22, 163, 74, 0.35)',
                      textDecoration: 'none',
                    }}
                  >
                    <AddCircleOutlineIcon fontSize="small" />
                    Deposit
                  </Link>

                  {/* Account */}
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium min-h-[48px] touch-manipulation"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)' }}
                    >
                      {getUserInitials(user.fullName)}
                    </div>
                    {user.fullName.split(' ')[0]}'s Account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold min-h-[48px] touch-manipulation border transition-colors"
                    style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)', backgroundColor: 'var(--card-alt)' }}
                  >
                    <LoginIcon fontSize="small" />
                    Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 text-sm min-h-[48px] rounded-full touch-manipulation font-bold"
                    style={{
                      background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
                      color: '#ffffff',
                      boxShadow: '0 2px 10px rgba(21, 101, 192, 0.4)',
                      textDecoration: 'none',
                    }}
                  >
                    <PersonAddIcon fontSize="small" />
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}