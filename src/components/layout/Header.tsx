// Bet360 — Header.tsx
// Auth-responsive: shows wallet balance + avatar when logged in, Join/Login when not

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { wallet as walletApi } from '../../utils/api';
import type { ApiResponse } from '../../utils/api';

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Bet360Logo({ dark = false }: { dark?: boolean }) {
  const textColor   = dark ? '#111' : '#ffffff';
  const accentColor = dark ? '#CC0000' : '#ffffff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, userSelect: 'none' }} aria-label="Bet360">
      <svg width="26" height="30" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14 1L2 6.5v9c0 8.5 5.2 14.7 12 16.5C20.8 30.2 26 24 26 15.5v-9L14 1z"
          fill={dark ? '#CC0000' : 'rgba(255,255,255,0.25)'}
        />
        <path
          d="M14 5L5.5 9v7.5c0 6.5 3.8 11.2 8.5 12.8C18.7 27.7 22.5 23 22.5 16.5V9L14 5z"
          fill="none"
          stroke={dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.35)'}
          strokeWidth="1"
        />
        <text
          x="14" y="20"
          textAnchor="middle"
          fontFamily="'Inter', 'Arial Narrow', sans-serif"
          fontWeight="800"
          fontSize="9"
          fill={dark ? '#fff' : '#CC0000'}
          letterSpacing="-0.3"
        >360</text>
      </svg>
      <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '0.02em',
          color: textColor,
          textTransform: 'uppercase',
        }}>BET</span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '0.02em',
          color: accentColor,
          textTransform: 'uppercase',
          ...(dark ? {} : { background: 'rgba(255,255,255,0.18)', borderRadius: 3, padding: '0 3px' }),
        }}>360</span>
      </div>
    </div>
  );
}

// ─── Wallet Balance chip ───────────────────────────────────────────────────────
function WalletChip() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    walletApi.getWallet()
      .then((res: ApiResponse<Record<string, unknown>>) => {
        const data = res.data as Record<string, unknown>;
        if (typeof data?.balance === 'number') setBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  return (
    <Link
      to="/wallet"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(0,0,0,0.22)',
        border: '1.5px solid rgba(255,255,255,0.22)',
        borderRadius: 7,
        padding: '5px 11px 5px 8px',
        textDecoration: 'none',
        transition: 'background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.38)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.22)')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.85)" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/>
        <path d="M3 8h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8z"/>
        <circle cx="16" cy="13" r="1" fill="rgba(255,255,255,0.85)" stroke="none"/>
      </svg>
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: '0.82rem',
        color: '#fff',
        letterSpacing: '0.01em',
        minWidth: 60,
        textAlign: 'right',
      }}>
        {balance === null ? '···' : `GH₵ ${balance.toFixed(2)}`}
      </span>
    </Link>
  );
}

// ─── User Avatar + dropdown ───────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);
  const { user, logout } = useAppStore();
  const navigate        = useNavigate();

  const fullName = [
    (user as unknown as Record<string, unknown>)?.firstName,
    (user as unknown as Record<string, unknown>)?.lastName,
  ].filter(Boolean).join(' ') || (user as unknown as Record<string, unknown>)?.email as string || 'U';
  const initials = fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const menuItems = [
    {
      label: 'My Account',
      to: '/account',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    },
    {
      label: 'Wallet',
      to: '/wallet',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/><path d="M3 8h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8z"/><circle cx="16" cy="13" r="1" fill="currentColor" stroke="none"/></svg>,
    },
    {
      label: 'Deposit',
      to: '/deposit',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          border: '2px solid rgba(255,255,255,0.55)',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: '0.88rem',
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
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          minWidth: 220,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          zIndex: 200,
          animation: 'b360DropIn 0.15s ease-out',
        }}>
          <div style={{
            padding: '14px 16px 12px',
            background: '#CC0000',
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
            }}>{fullName}</p>
            <p style={{
              margin: '2px 0 0',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.74rem',
              color: 'rgba(255,255,255,0.75)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{(user as unknown as Record<string, unknown>)?.email as string ?? ''}</p>
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
              color: '#CC0000',
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

// ─── Deposit shortcut button (+ icon only) ────────────────────────────────────
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
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="#CC0000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </Link>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAppStore();
  const isLoggedIn = !!user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .bet360-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #CC0000;
          box-shadow: ${scrolled ? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 10px rgba(0,0,0,0.25)'};
          transition: box-shadow 0.2s;
        }

        .bet360-btn-login {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.03em;
          color: #CC0000;
          background: #ffffff;
          border: none;
          padding: 7px 18px;
          border-radius: 5px;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: opacity 0.15s;
          display: inline-flex;
          align-items: center;
        }
        .bet360-btn-login:hover { opacity: 0.88; }

        .bet360-btn-register {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.03em;
          color: #fff;
          background: transparent;
          border: 2px solid rgba(255,255,255,0.75);
          padding: 6px 18px;
          border-radius: 5px;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          display: inline-flex;
          align-items: center;
        }
        .bet360-btn-register:hover { background: rgba(255,255,255,0.12); border-color: #fff; }

        @keyframes b360DropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="bet360-header">
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 16px',
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>

          {/* Logo → home */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Bet360Logo />
          </Link>

          {/* Right side: auth-responsive */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLoggedIn ? (
              <>
                <WalletChip />
                <DepositBtn />
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/register" className="bet360-btn-login">Join Now</Link>
                <Link to="/login"    className="bet360-btn-register">Log In</Link>
              </>
            )}
          </div>

        </div>
      </header>
    </>
  );
}