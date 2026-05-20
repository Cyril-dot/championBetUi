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
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

// ---------------------------------------------------------------------------
// Nav links
// ---------------------------------------------------------------------------
const navLinks = [
  { to: '/',          label: 'Home',      icon: <HomeIcon sx={{ fontSize: 16 }} /> },
  {
    to: '/live',
    label: 'Live',
    icon: <FiberManualRecordIcon className="text-green-500 animate-pulse-green" sx={{ fontSize: 16 }} />
  },
  { to: '/casino',    label: 'Casino',    icon: <CasinoIcon sx={{ fontSize: 16 }} /> },
  { to: '/affiliate', label: 'Affiliate', icon: <GroupAddIcon sx={{ fontSize: 16 }} /> },
];

// ---------------------------------------------------------------------------
// Helper – user initials
// ---------------------------------------------------------------------------
function getUserInitials(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ---------------------------------------------------------------------------
// SuperBetLogo – Concept 3: Fire & Energy
// ---------------------------------------------------------------------------
function SuperBetLogo() {
  return (
    <div className="flex items-center gap-1.5 select-none" aria-label="SuperBet">
      {/* Flame icon with gradient effect via layered spans */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E24B4A 0%, #EF9F27 100%)',
          flexShrink: 0,
        }}
      >
        <LocalFireDepartmentIcon
          sx={{ fontSize: 18 }}
          style={{ color: '#ffffff' }}
          aria-hidden="true"
        />
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, lineHeight: 1 }}>
        <span
          style={{
            fontWeight: 900,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #E24B4A 0%, #EF9F27 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Super
        </span>
        <span
          style={{
            fontWeight: 900,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            color: 'var(--text-main)',
          }}
        >
          Bet
        </span>
      </div>

      {/* Star accent */}
      <span
        style={{
          fontSize: 10,
          lineHeight: 1,
          background: 'linear-gradient(90deg, #E24B4A, #EF9F27)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 6,
        }}
        aria-hidden="true"
      >
        ★
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Header() {
  const { theme, toggleTheme, user } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // -------- Wallet state – always USD ----------
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceFlash, setBalanceFlash] = useState(false);

  const location = useLocation();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  const isDark = theme.endsWith('-dark');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // ---------------- Wallet polling ----------------
  const fetchBalance = async () => {
    if (!user) return;
    try {
      const res = await wallet.getWallet();
      if (res.success && res.data) {
        const d = res.data as Record<string, unknown>;
        const newBal =
          typeof d.balanceUsd === 'number'
            ? d.balanceUsd
            : typeof d.balance === 'number'
            ? d.balance
            : typeof d.availableBalance === 'number'
            ? d.availableBalance
            : null;

        if (newBal !== null) {
          if (prevBalanceRef.current !== null && prevBalanceRef.current !== newBal) {
            setBalanceFlash(true);
            setTimeout(() => setBalanceFlash(false), 600);
          }
          prevBalanceRef.current = newBal;
          setWalletBalance(newBal);
        }
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      prevBalanceRef.current = null;
      setMobileMenuOpen(false);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    setBalanceLoading(true);
    fetchBalance().finally(() => setBalanceLoading(false));
    pollRef.current = setInterval(fetchBalance, 15_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  // ---------------- Helpers ----------------
  const formatBalance = (a: number) =>
    a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---------------- Render ----------------
  return (
    <header
      className="sticky top-0 z-50 border-b shadow-sm"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
    >
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">

        {/* ---------- LOGO ---------- */}
        <Link to="/" className="flex items-center shrink-0">
          <SuperBetLogo />
        </Link>

        {/* ---------- DESKTOP NAV ---------- */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map(l => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: active ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)';
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
              >
                {l.icon}
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ---------- RIGHT ACTIONS ---------- */}
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
            {isDark ? (
              <LightModeIcon fontSize="small" className="text-yellow-400" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </button>

          {/* USER LOGGED IN */}
          {user ? (
            <div className="flex items-center gap-2">

              {/* Wallet balance pill */}
              <Link
                to="/wallet"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all touch-manipulation"
                style={{
                  borderColor: balanceFlash ? '#4ade80' : 'var(--border-light)',
                  backgroundColor: balanceFlash
                    ? 'color-mix(in srgb, #4ade80 15%, transparent)'
                    : 'var(--card-alt)',
                }}
                title="Wallet balance (USD)"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <AccountBalanceWalletIcon sx={{ fontSize: 14, color: 'var(--text-muted)' }} />
                {balanceLoading && walletBalance === null ? (
                  <span className="text-xs w-12 animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</span>
                ) : walletBalance !== null ? (
                  <span className="text-sm font-bold tabular-nums" style={{ color: balanceFlash ? '#16a34a' : 'var(--text-main)' }}>
                    ${formatBalance(walletBalance)}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                )}
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
                  style={{ backgroundColor: 'var(--primary-dark)' }}
                >
                  {getUserInitials(user.fullName)}
                </div>
                <span className="hidden sm:inline text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                  {user.fullName.split(' ')[0]}
                </span>
              </Link>
            </div>
          ) : (
            /* USER NOT LOGGED IN */
            <div className="flex items-center gap-1 sm:gap-2">

              {/* Login – visible on all screen sizes */}
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

              {/* Register – fire gradient button, always visible */}
              <Link
                to="/register"
                className="flex items-center gap-1.5 text-sm py-2 px-4 rounded-full touch-manipulation font-bold whitespace-nowrap"
                style={{
                  background: 'linear-gradient(90deg, #E24B4A 0%, #EF9F27 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(226, 75, 74, 0.35)',
                  border: 'none',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.9';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(226, 75, 74, 0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(226, 75, 74, 0.35)';
                }}
              >
                <PersonAddIcon fontSize="small" />
                <span className="hidden xs:inline">Register</span>
                <span className="xs:hidden">Join</span>
              </Link>
            </div>
          )}

          {/* Hamburger – only shown when user is logged in, mobile/tablet only */}
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

      {/* ------------------- MOBILE MENU ------------------- */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t animate-fade-in"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
        >
          <nav className="flex flex-col p-3 gap-1">

            {/* Nav links */}
            {navLinks.map(l => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] touch-manipulation"
                  style={{
                    backgroundColor: active ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
                    color: active ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  {l.icon}
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                    {l.label}
                  </span>
                </Link>
              );
            })}

            {/* Bottom block */}
            <div className="border-t mt-1 pt-2 flex flex-col gap-2" style={{ borderColor: 'var(--border-light)' }}>

              {user ? (
                <>
                  {/* Wallet */}
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
                        {walletBalance !== null ? `$${formatBalance(walletBalance)}` : '—'}
                      </span>
                    </div>
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
                      style={{ backgroundColor: 'var(--primary-dark)' }}
                    >
                      {getUserInitials(user.fullName)}
                    </div>
                    {user.fullName.split(' ')[0]}'s Account
                  </Link>
                </>
              ) : (
                <>
                  {/* Login */}
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold min-h-[48px] touch-manipulation border transition-colors"
                    style={{
                      color: 'var(--text-main)',
                      borderColor: 'var(--border-light)',
                      backgroundColor: 'var(--card-alt)',
                    }}
                  >
                    <LoginIcon fontSize="small" />
                    Login
                  </Link>

                  {/* Register – fire gradient, full width */}
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 text-sm min-h-[48px] rounded-full touch-manipulation font-bold"
                    style={{
                      background: 'linear-gradient(90deg, #E24B4A 0%, #EF9F27 100%)',
                      color: '#ffffff',
                      boxShadow: '0 2px 10px rgba(226, 75, 74, 0.4)',
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