import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TelegramIcon from '@mui/icons-material/Telegram';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import CasinoIcon from '@mui/icons-material/Casino';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import HelpIcon from '@mui/icons-material/Help';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// ---------------------------------------------------------------------------
// NxtBetLogo — Orbit Mark (matches Header exactly)
// ---------------------------------------------------------------------------
function NxtBetLogo() {
  return (
    <div className="flex items-center gap-2 select-none" aria-label="NxtBet">
      {/* Orbit mark icon */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="nxtbet-bg-footer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1565C0" />
              <stop offset="100%" stopColor="#42A5F5" />
            </linearGradient>
          </defs>

          {/* Outer filled circle */}
          <circle cx="18" cy="18" r="17" fill="url(#nxtbet-bg-footer)" />

          {/* Orbit ring (dashed) */}
          <circle
            cx="18"
            cy="18"
            r="12"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.2"
            strokeDasharray="4 2.5"
          />

          {/* Inner translucent circle */}
          <circle cx="18" cy="18" r="8" fill="rgba(255,255,255,0.12)" />

          {/* "N" letterform */}
          <text
            x="18"
            y="23"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="900"
            fontSize="14"
            fill="#ffffff"
          >
            N
          </text>

          {/* Orbit dot – right */}
          <circle cx="30" cy="18" r="2.8" fill="#ffffff" />

          {/* Orbit dot – left (smaller, faded) */}
          <circle cx="6" cy="18" r="1.8" fill="rgba(255,255,255,0.45)" />
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 900,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Nxt
        </span>
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 900,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            color: 'var(--text-main)',
          }}
        >
          Bet
        </span>
      </div>

      {/* Small blue accent dot */}
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1565C0, #42A5F5)',
          marginBottom: 8,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const quickLinks = [
  { to: '/',          label: 'Home',         icon: <HomeIcon sx={{ fontSize: 14 }} /> },
  { to: '/live',      label: 'Live Betting', icon: <FiberManualRecordIcon className="text-green-500 animate-pulse-green" sx={{ fontSize: 14 }} /> },
  { to: '/casino',    label: 'Casino',       icon: <CasinoIcon sx={{ fontSize: 14 }} /> },
  { to: '/sports',    label: 'Sports',       icon: <SportsSoccerIcon sx={{ fontSize: 14 }} /> },
  { to: '/live-tv',   label: 'Live TV',      icon: <LiveTvIcon sx={{ fontSize: 14 }} /> },
  { to: '/jackpot',   label: 'Jackpot',      icon: <EmojiEventsIcon sx={{ fontSize: 14 }} /> },
  { to: '/affiliate', label: 'Affiliate',    icon: <GroupAddIcon sx={{ fontSize: 14 }} /> },
  { to: '/wallet',    label: 'Wallet',       icon: <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> },
];

const companyLinks = [
  { to: '/about',       label: 'About Us',           icon: <InfoIcon sx={{ fontSize: 14 }} /> },
  { to: '/terms',       label: 'Terms & Conditions', icon: <GavelIcon sx={{ fontSize: 14 }} /> },
  { to: '/privacy',     label: 'Privacy Policy',     icon: <SecurityIcon sx={{ fontSize: 14 }} /> },
  { to: '/responsible', label: 'Responsible Gaming', icon: <ShieldIcon sx={{ fontSize: 14 }} /> },
  { to: '/faq',         label: 'FAQ',                icon: <HelpIcon sx={{ fontSize: 14 }} /> },
];

const socials = [
  { icon: <FacebookIcon  sx={{ fontSize: 18 }} />, href: 'https://facebook.com',  label: 'Facebook',  color: '#1877F2' },
  { icon: <TwitterIcon   sx={{ fontSize: 18 }} />, href: 'https://twitter.com',   label: 'Twitter/X', color: '#000000' },
  { icon: <InstagramIcon sx={{ fontSize: 18 }} />, href: 'https://instagram.com', label: 'Instagram', color: '#E1306C' },
  { icon: <TelegramIcon  sx={{ fontSize: 18 }} />, href: 'https://t.me',          label: 'Telegram',  color: '#229ED9' },
  { icon: <YouTubeIcon   sx={{ fontSize: 18 }} />, href: 'https://youtube.com',   label: 'YouTube',   color: '#FF0000' },
];

const paymentMethods = ['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay', 'ACH'];

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t mt-auto"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
    >
      {/* ── QUICK DIAL BANNER — hidden on mobile ──────────────────────────── */}
      <div
        className="hidden sm:flex w-full py-3 items-center justify-center gap-3 flex-wrap text-sm font-bold tracking-wide"
        style={{
          background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
          color: '#fff',
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ opacity: 0.85, fontWeight: 400 }}>24/7 Customer Support:</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.06em' }}>+1 (800) 555-0192</span>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* ── COL 1: Brand — always visible ─── */}
        <div className="flex flex-col gap-4">
          <Link to="/">
            <NxtBetLogo />
          </Link>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 260 }}>
            The world's most visited betting platform. Bet on sports, play casino games and win big — responsibly.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-2 flex-wrap">
            {socials.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: 'var(--card-alt)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = s.color;
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                  (e.currentTarget as HTMLElement).style.borderColor = s.color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)';
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Contact info — always visible */}
          <div className="flex flex-col gap-2 mt-1">

            {/* Location */}
            <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <LocationOnIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6, marginTop: 1, flexShrink: 0 }} />
              <span>
                350 Fifth Avenue, Suite 4100<br />
                New York, NY 10118<br />
                United States
              </span>
            </div>

            {/* Phone */}
            <a
              href="tel:+18005550192"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <PhoneIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6 }} />
              +1 (800) 555-0192
            </a>

            {/* Email */}
            <a
              href="mailto:support@nxtbet.com"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <EmailIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6 }} />
              support@nxtbet.com
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/nxtbet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#229ED9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <TelegramIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6 }} />
              @nxtbet on Telegram
            </a>
          </div>

          {/* Payment methods — always visible */}
          <div>
            <p
              className="text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', opacity: 0.6 }}
            >
              Payment Methods
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paymentMethods.map(m => (
                <span
                  key={m}
                  className="text-xs px-2 py-0.5 rounded font-semibold"
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Official partner badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--card-alt)', color: 'var(--text-muted)' }}
            >
              Official Betting Partner
            </span>
          </div>
        </div>

        {/* ── COL 2: Quick Links — hidden on mobile ─── */}
        <div className="hidden sm:block">
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{
              background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Quick Links
          </h3>
          <ul className="flex flex-col gap-2">
            {quickLinks.map(l => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="flex items-center gap-2 text-xs transition-colors group"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                >
                  <span style={{ opacity: 0.6 }}>{l.icon}</span>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── COL 3: Company — hidden on mobile ─── */}
        <div className="hidden sm:block">
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{
              background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Company
          </h3>
          <ul className="flex flex-col gap-2">
            {companyLinks.map(l => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="flex items-center gap-2 text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                >
                  <span style={{ opacity: 0.6 }}>{l.icon}</span>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── COL 4: Connect — hidden on mobile ─── */}
        <div className="hidden sm:block">
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{
              background: 'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Connect With Us
          </h3>

          <div className="flex flex-col gap-3">

            {/* Location */}
            <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <LocationOnIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6, marginTop: 1, flexShrink: 0 }} />
              <span>
                350 Fifth Avenue, Suite 4100<br />
                New York, NY 10118<br />
                United States
              </span>
            </div>

            {/* Phone */}
            <a
              href="tel:+18005550192"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <PhoneIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6 }} />
              +1 (800) 555-0192
            </a>

            {/* Email */}
            <a
              href="mailto:support@nxtbet.com"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <EmailIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6 }} />
              support@nxtbet.com
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/nxtbet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#229ED9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <TelegramIcon sx={{ fontSize: 14 }} style={{ opacity: 0.6 }} />
              @nxtbet on Telegram
            </a>

            {/* Payment methods */}
            <div className="mt-2">
              <p
                className="text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'var(--text-muted)', opacity: 0.6 }}
              >
                Payment Methods
              </p>
              <div className="flex flex-wrap gap-1.5">
                {paymentMethods.map(m => (
                  <span
                    key={m}
                    className="text-xs px-2 py-0.5 rounded font-semibold"
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RESPONSIBLE GAMING BANNER ─────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">

          {/* 21+ disclaimer */}
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-xs"
              style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
            >
              21+
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 420 }}>
              Must be 21 years or older to participate. Please gamble responsibly.
              If you or someone you know has a gambling problem, call the
              National Problem Gambling Helpline: <strong>1-800-522-4700</strong>.
            </p>
          </div>

          {/* License */}
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded flex items-center justify-center"
              style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}
            >
              <ShieldIcon sx={{ fontSize: 18 }} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 380 }}>
              NxtBet is licensed and regulated under the laws of the State of New Jersey,
              Division of Gaming Enforcement. License No. NJDGE-2024-00237.
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ────────────────────────────────────────────────────── */}
      <div
        className="border-t"
        style={{
          borderColor: 'var(--border-light)',
          backgroundColor: 'color-mix(in srgb, var(--card-bg) 80%, #000 20%)',
        }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            © {year} NxtBet. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {['Terms', 'Privacy', 'Cookies'].map(t => (
              <Link
                key={t}
                to={`/${t.toLowerCase()}`}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.6';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}