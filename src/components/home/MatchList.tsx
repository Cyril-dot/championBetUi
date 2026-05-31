// ---------------------------------------------------------------------------
// updated match list — live odds locked, no redirect on live games,
// supporters carousel, footer section
// CHANGES IN THIS VERSION:
//   • LIVE games: odds buttons locked (disabled, greyed with "LIVE" overlay)
//   • LIVE games: clicking row does NOT navigate to match details
//   • Supporters section: horizontal carousel with logo images (upload your own)
//   • Small footer under supporters section — transparent backgrounds
//   • Branding updated to Bet360
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import api from '../../utils/api';
import type { Match } from '../../utils/api';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';

// ---------------------------------------------------------------------------
// ADMIN LOGO POOLS
// ---------------------------------------------------------------------------
const HOME_LOGO_POOL: string[] = [
  'https://static.vecteezy.com/system/resources/thumbnails/011/049/345/small_2x/soccer-football-badge-logo-sport-team-identity-illustrations-isolated-on-white-background-vector.jpg',
  'https://marketplace.canva.com/EAGXHkfvP0k/2/0/1600w/canva-white-and-black-professional-design-football-club-logo-_0PEzCBc5Ao.jpg',
  'https://img.magnific.com/premium-vector/soccer-football-badge-logo-design-templates-sport-team-identity-vector-illustrations_683941-173.jpg',
  'https://marketplace.canva.com/EAFnwIBf4dU/2/0/1600w/canva-black-white-yellow-elegant-modern-football-club-logo-8HTQhmXBF18.jpg',
  'https://static.vecteezy.com/system/resources/previews/035/358/256/non_2x/football-club-logo-vector.jpg',
];

const AWAY_LOGO_POOL: string[] = [
  'https://marketplace.canva.com/EAF9gkRs2dU/2/0/1600w/canva-white-black-gold-circle-modern-football-club-logo-8y4rT2SOMu0.jpg',
  'https://logowik.com/content/uploads/images/football-club2744.logowik.com.webp',
  'https://img.freepik.com/free-vector/football-soccer-tournament-vector-logo-design_47987-24746.jpg?semt=ais_hybrid&w=740&q=80',
  'https://static.vecteezy.com/system/resources/thumbnails/012/995/442/small/football-championship-or-football-club-logo-vector.jpg',
  'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/logo-design-template-b588de7cc0b07e82392c3b2ea4ea7b73_screen.jpg?ts=1702915331',
];

// ---------------------------------------------------------------------------
// RECENT WINNERS
// ---------------------------------------------------------------------------
interface Winner {
  phone: string;
  amount: string;
  currency: 'GHS' | 'NGN' | 'USD';
  timeAgo: string;
}

const RECENT_WINNERS: Winner[] = [
  { phone: '0244****12', amount: '23,500',    currency: 'GHS', timeAgo: '2m'  },
  { phone: '0557****78', amount: '47,200',    currency: 'GHS', timeAgo: '5m'  },
  { phone: '0201****34', amount: '88,000',    currency: 'GHS', timeAgo: '9m'  },
  { phone: '0302****56', amount: '31,750',    currency: 'GHS', timeAgo: '14m' },
  { phone: '0249****90', amount: '65,400',    currency: 'GHS', timeAgo: '18m' },
  { phone: '0540****23', amount: '99,000',    currency: 'GHS', timeAgo: '22m' },
  { phone: '0268****67', amount: '54,800',    currency: 'GHS', timeAgo: '27m' },
  { phone: '0598****11', amount: '20,500',    currency: 'GHS', timeAgo: '31m' },
  { phone: '0241****45', amount: '76,300',    currency: 'GHS', timeAgo: '35m' },
  { phone: '0277****88', amount: '43,100',    currency: 'GHS', timeAgo: '40m' },
  { phone: '0803****21', amount: '4,200,000',  currency: 'NGN', timeAgo: '3m'  },
  { phone: '0816****54', amount: '850,000',    currency: 'NGN', timeAgo: '7m'  },
  { phone: '0705****77', amount: '22,500,000', currency: 'NGN', timeAgo: '11m' },
  { phone: '0901****32', amount: '1,700,000',  currency: 'NGN', timeAgo: '16m' },
  { phone: '0808****65', amount: '49,800,000', currency: 'NGN', timeAgo: '20m' },
  { phone: '0703****98', amount: '380,000',    currency: 'NGN', timeAgo: '24m' },
  { phone: '0812****43', amount: '7,600,000',  currency: 'NGN', timeAgo: '29m' },
  { phone: '0907****76', amount: '14,300,000', currency: 'NGN', timeAgo: '33m' },
  { phone: '0802****19', amount: '600,000',    currency: 'NGN', timeAgo: '37m' },
  { phone: '0818****52', amount: '33,000,000', currency: 'NGN', timeAgo: '42m' },
  { phone: '+1 (***) ***-3812', amount: '3,800',  currency: 'USD', timeAgo: '1m'  },
  { phone: '+1 (***) ***-7491', amount: '47,500', currency: 'USD', timeAgo: '6m'  },
  { phone: '+44 ****-***-220',  amount: '12,200', currency: 'USD', timeAgo: '10m' },
  { phone: '+1 (***) ***-6603', amount: '28,750', currency: 'USD', timeAgo: '15m' },
  { phone: '+1 (***) ***-5514', amount: '5,400',  currency: 'USD', timeAgo: '19m' },
  { phone: '+49 ****-***-881',  amount: '49,000', currency: 'USD', timeAgo: '23m' },
  { phone: '+1 (***) ***-9927', amount: '8,600',  currency: 'USD', timeAgo: '28m' },
  { phone: '+91 ****-***-334',  amount: '2,300',  currency: 'USD', timeAgo: '32m' },
  { phone: '+1 (***) ***-1158', amount: '19,900', currency: 'USD', timeAgo: '36m' },
  { phone: '+81 ****-***-762',  amount: '36,500', currency: 'USD', timeAgo: '41m' },
];

const CURRENCY_SYMBOL: Record<Winner['currency'], string> = { GHS: 'GHS', NGN: '₦', USD: '$' };

// ---------------------------------------------------------------------------
// SUPPORTERS DATA
// ⚠️  Replace each `logoUrl` with the actual uploaded image URL/path.
//     The `name` is shown as alt text only (not rendered visibly).
//     Remove the `badge` label column — carousel shows logo image only.
// ---------------------------------------------------------------------------
interface Supporter {
  name: string;
  logoUrl: string; // ← swap in your real logo image URLs here
  type: 'brand' | 'club' | 'media';
}

const SUPPORTERS: Supporter[] = [
  // ── Payment / Telecom / Brand logos ──────────────────────────────────────
  { name: 'Visa',          logoUrl: 'https://1000logos.net/wp-content/uploads/2021/11/VISA-logo.png', type: 'brand' },
  { name: 'Mastercard',    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', type: 'brand' },
  { name: 'MTN',           logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcsX815Q5iM1YzjweBSeX3KwWKFy0hS7Xy1A&s', type: 'brand' },
  { name: 'Betway',        logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXudjZT_JUXrXPxTRYuuoOJ07j1wmTD3mUBQ&s', type: 'brand' },
  { name: 'Sportybet',     logoUrl: 'https://www.latestmodapks.com/wp-content/uploads/2023/04/8rBblg0p56.png', type: 'brand' },
  // ── Media ────────────────────────────────────────────────────────────────
  { name: 'DStv',          logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/94/DStv_2012_logo.svg', type: 'media' },
  { name: 'SuperSport',    logoUrl: 'https://e7.pngegg.com/pngimages/97/609/png-clipart-supersport-dstv-television-channel-others-miscellaneous-television-thumbnail.png', type: 'media' },
  { name: 'ESPN',          logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png?_=20180702212649', type: 'media' },
  { name: 'Sky Sports',    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Sky_Sports_2025.svg/3840px-Sky_Sports_2025.svg.png', type: 'media' },
  // ── Club logos ───────────────────────────────────────────────────────────
  { name: 'Real Madrid',   logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/960px-Real_Madrid_CF.svg.png', type: 'club'  },
  { name: 'Barcelona',     logoUrl: 'https://upload.wikimedia.org/wikipedia/sco/thumb/4/47/FC_Barcelona_%28crest%29.svg/3840px-FC_Barcelona_%28crest%29.svg.png', type: 'club'  },
  { name: 'Bayern Munich', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/3840px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png', type: 'club'  },
  { name: 'PSG',           logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvWP3Scw6W8CRg2_uogPSLjPF6-TGxpp_JbA&s', type: 'club'  },
  { name: 'Man City',      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/250px-Manchester_City_FC_badge.svg.png', type: 'club'  },
  // ── More brands ──────────────────────────────────────────────────────────
  { name: 'Coca-Cola',     logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/960px-Coca-Cola_logo.svg.png', type: 'brand' },
  { name: 'Nike',          logoUrl: 'https://media.about.nike.com/image-downloads/cf68f541-fc92-4373-91cb-086ae0fe2f88/002-nike-logos-swoosh-white.jpg', type: 'brand' },
  { name: 'Adidas',        logoUrl: 'https://preview.thenewsmarket.com/Previews/ADID/StillAssets/1920x1440/689347.jpg', type: 'brand' }
];

// ---------------------------------------------------------------------------
// SupportersCarousel
// ---------------------------------------------------------------------------
function SupportersCarousel() {
  const doubled = useMemo(() => [...SUPPORTERS, ...SUPPORTERS], []);
  return (
    <div className="supporters-wrap">
      <div className="supporters-track-wrap">
        <div className="supporters-track">
          {doubled.map((s, i) => (
            <div key={i} className="supporter-chip">
              {s.logoUrl ? (
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  className="supporter-logo-img"
                  draggable={false}
                />
              ) : (
                <div className="supporter-logo-placeholder" title={s.name}>
                  <span className="supporter-placeholder-initial">
                    {s.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="supporters-fade-l" />
        <div className="supporters-fade-r" />
      </div>
      <style>{`
        .supporters-wrap {
          margin: 48px 0 0;
          border-radius: 12px;
          overflow: hidden;
          background: transparent;
        }
        .supporters-track-wrap {
          position: relative;
          overflow: hidden;
          padding: 10px 0;
          background: transparent;
        }
        .supporters-track {
          display: flex;
          gap: 14px;
          animation: supportersScroll 60s linear infinite;
          width: max-content;
          padding: 0 14px;
        }
        .supporter-chip {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 2px;
          cursor: default;
          transition: transform 0.15s;
        }
        .supporter-chip:hover {
          transform: translateY(-2px);
        }
        /* Real logo image — enlarged */
        .supporter-logo-img {
          height: 60px;
          width: auto;
          max-width: 120px;
          object-fit: contain;
          display: block;
          border-radius: 6px;
          user-select: none;
        }
        /* Placeholder until real logo is uploaded */
        .supporter-logo-placeholder {
          height: 60px;
          width: 90px;
          border-radius: 8px;
          border: 1.5px dashed rgba(0,0,0,0.18);
          background: rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .supporter-placeholder-initial {
          font-size: 20px;
          font-weight: 800;
          color: rgba(0,0,0,0.22);
          font-family: system-ui, sans-serif;
          text-transform: uppercase;
        }
        .supporters-fade-l {
          position: absolute; top: 0; left: 0; bottom: 0; width: 32px;
          background: linear-gradient(90deg, white 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        .supporters-fade-r {
          position: absolute; top: 0; right: 0; bottom: 0; width: 32px;
          background: linear-gradient(270deg, white 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        @keyframes supportersScroll {
          0%  { transform: translateX(0); }
          100%{ transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SiteFooter
// ---------------------------------------------------------------------------
function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <SportsSoccerIcon sx={{ fontSize: 20, color: '#22c55e' }} />
          <span className="footer-brand-name">Bet360</span>
        </div>
        <p className="footer-tagline">Your #1 destination for live sports betting.</p>
      </div>

      <div className="footer-links">
        <a href="#" className="footer-link">About Us</a>
        <span className="footer-dot">·</span>
        <a href="#" className="footer-link">Terms &amp; Conditions</a>
        <span className="footer-dot">·</span>
        <a href="#" className="footer-link">Privacy Policy</a>
        <span className="footer-dot">·</span>
        <a href="#" className="footer-link">Responsible Gambling</a>
        <span className="footer-dot">·</span>
        <a href="#" className="footer-link">Contact Support</a>
      </div>

      <div className="footer-warning">
        <span className="footer-warning-icon">⚠️</span>
        <span>Gambling can be addictive. Please play responsibly. You must be 18+ to use this service. For help visit <strong>www.gamcare.org.uk</strong></span>
      </div>

      <div className="footer-bottom">
        <span>© {year} Bet360. All rights reserved.</span>
        <span className="footer-pipe">|</span>
        <span>Licensed &amp; Regulated</span>
        <span className="footer-18">18+</span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

        .site-footer {
          margin-top: 24px;
          padding: 22px 16px 36px;
          border-top: 1.5px solid rgba(0,0,0,0.08);
          background: transparent;
          border-radius: 12px 12px 0 0;
          font-family: 'Open Sans', sans-serif;
        }
        .footer-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin-bottom: 16px;
        }
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .footer-brand-name {
          font-size: 20px;
          font-weight: 800;
          color: #ef4444;
          letter-spacing: 0.02em;
          font-family: 'Open Sans', sans-serif;
        }
        .footer-tagline {
          font-size: 14px;
          color: #64748b;
          font-family: 'Open Sans', sans-serif;
          text-align: center;
          margin: 0;
          font-weight: 400;
        }
        .footer-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .footer-link {
          font-size: 13px;
          color: #475569;
          text-decoration: none;
          font-family: 'Open Sans', sans-serif;
          font-weight: 600;
          transition: color 0.15s;
        }
        .footer-link:hover { color: #22c55e; }
        .footer-dot { font-size: 13px; color: #94a3b8; }
        .footer-warning {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 11px 14px;
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 8px;
          margin-bottom: 14px;
          font-size: 12px;
          color: #64748b;
          font-family: 'Open Sans', sans-serif;
          line-height: 1.6;
          font-weight: 400;
        }
        .footer-warning-icon { flex-shrink: 0; font-size: 14px; }
        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
          font-family: 'Open Sans', sans-serif;
          font-weight: 400;
          flex-wrap: wrap;
        }
        .footer-pipe { opacity: 0.4; }
        .footer-18 {
          background: #22c55e;
          color: #000;
          font-size: 11px;
          font-weight: 800;
          border-radius: 4px;
          padding: 2px 6px;
          letter-spacing: 0.05em;
          font-family: 'Open Sans', sans-serif;
        }
      `}</style>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// GrandPrizeWinnersBar
// ---------------------------------------------------------------------------
function GrandPrizeWinnersBar() {
  const doubled = useMemo(() => [...RECENT_WINNERS, ...RECENT_WINNERS], []);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px',
        background: 'var(--bg-card, rgba(255,255,255,0.04))',
        borderRadius: '10px 10px 0 0',
        borderBottom: '1px solid rgba(34,197,94,0.2)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }}>
        <EmojiEventsIcon sx={{ fontSize: 16, color: '#f5a623' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #e2e8f0)', letterSpacing: '0.04em', fontFamily: 'system-ui, sans-serif' }}>
          Grand Prize Winners
        </span>
      </div>
      <div style={{
        overflow: 'hidden', padding: '8px 0 8px', position: 'relative',
        background: 'var(--bg-card, rgba(255,255,255,0.04))',
        borderRadius: '0 0 10px 10px',
        border: '1px solid rgba(34,197,94,0.2)',
        borderTop: 'none',
      }}>
        <div style={{ display: 'flex', gap: 8, animation: 'winnersScroll 90s linear infinite', width: 'max-content', padding: '0 12px' }}>
          {doubled.map((w, i) => (
            <div key={i} className="wc-card">
              <div className="wc-shimmer" />
              <div style={{ lineHeight: 1 }}>
                <div className="wc-phone">{w.phone} won</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', marginTop: 4 }}>
                  <span className="wc-symbol">{CURRENCY_SYMBOL[w.currency]}</span>
                  <span className="wc-amount">{w.amount}</span>
                </div>
                <div className="wc-sub">in Sports · {w.timeAgo} ago</div>
              </div>
            </div>
          ))}
        </div>
        <div className="wc-fade-left" /><div className="wc-fade-right" />
      </div>
      <style>{`
        .wc-card { flex-shrink:0; background:rgba(34,197,94,0.06); border-radius:8px; padding:10px 14px; display:flex; align-items:flex-start; gap:10px; border:1px solid rgba(34,197,94,0.15); min-width:140px; position:relative; overflow:hidden; }
        .wc-shimmer { position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent 0%,#22c55e 50%,transparent 100%); opacity:0.4; }
        .wc-phone { font-size:11px; font-weight:500; color:var(--text-muted,#94a3b8); white-space:nowrap; font-family:system-ui,sans-serif; }
        .wc-symbol { font-size:12px; font-weight:700; color:#22c55e; font-family:system-ui,sans-serif; }
        .wc-amount { font-size:15px; font-weight:800; color:#22c55e; letter-spacing:-0.01em; font-family:system-ui,sans-serif; }
        .wc-sub { font-size:10px; color:var(--text-faint,#64748b); margin-top:3px; font-family:system-ui,sans-serif; }
        .wc-fade-left { position:absolute; top:0; left:0; bottom:0; width:24px; background:linear-gradient(90deg,var(--bg-page,#0f172a) 0%,transparent 100%); pointer-events:none; z-index:2; }
        .wc-fade-right { position:absolute; top:0; right:0; bottom:0; width:24px; background:linear-gradient(270deg,var(--bg-page,#0f172a) 0%,transparent 100%); pointer-events:none; z-index:2; }
        @keyframes winnersScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FloatingBetSlipButton
// ---------------------------------------------------------------------------
function FloatingBetSlipButton() {
  const navigate = useNavigate();
  const { betSlip } = useAppStore() as { betSlip: { matchId: string }[] };
  const count = betSlip?.length ?? 0;
  return (
    <button onClick={() => navigate('/betslip')} aria-label="Open bet slip" style={{
      position:'fixed', bottom:80, right:16, zIndex:1000,
      width:56, height:56, borderRadius:'50%',
      background:'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)',
      border:'2px solid rgba(34,197,94,0.4)', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:'0 4px 20px rgba(34,197,94,0.45)',
      transition:'transform 0.15s ease, box-shadow 0.15s ease',
    }}>
      <ReceiptLongIcon sx={{ fontSize:26, color:'#fff' }} />
      {count > 0 && (
        <span style={{
          position:'absolute', top:-2, right:-2,
          background:'#064e3b', color:'#6ee7b7', borderRadius:'50%',
          width:20, height:20, fontSize:11, fontWeight:800,
          display:'flex', alignItems:'center', justifyContent:'center',
          border:'2px solid #0d1117', lineHeight:1,
        }}>{count > 9 ? '9+' : count}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SportTab = 'football' | 'basketball' | 'tennis' | 'baseball' | 'nfl' | 'mma';
type FootballLeagueTab = 'all' | 'premier_league' | 'la_liga' | 'bundesliga' | 'serie_a' | 'ligue_1' | 'other';
type MatchCategory = 'live' | 'today' | 'upcoming';

interface OddsMap { home: number; draw: number; away: number; }
interface EnrichedMatch extends Match {
  oddsMap?: OddsMap;
  adminHomeLogo?: string;
  adminAwayLogo?: string;
}

interface BetSlipEntry {
  matchId: string;
  matchName: string;
  market: string;
  selection: string;
  odd: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sanitizeLogo(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('blob:')) return '';
  return trimmed;
}

function assignAdminLogos(matches: EnrichedMatch[]): EnrichedMatch[] {
  const poolSize = Math.max(HOME_LOGO_POOL.length, AWAY_LOGO_POOL.length, 1);
  return matches.map((m, idx) => {
    const hardHome = sanitizeLogo((m as unknown as Record<string, string>).hardcodedHomeLogo);
    const hardAway = sanitizeLogo((m as unknown as Record<string, string>).hardcodedAwayLogo);
    const homeUrl = hardHome || sanitizeLogo(HOME_LOGO_POOL[idx % poolSize]) || '';
    const awayUrl = hardAway || sanitizeLogo(AWAY_LOGO_POOL[idx % poolSize]) || '';
    return { ...m, adminHomeLogo: homeUrl, adminAwayLogo: awayUrl };
  });
}

function buildAdminTeamFingerprints(adminMatches: EnrichedMatch[]): Set<string> {
  const fps = new Set<string>();
  for (const m of adminMatches) {
    const home = (m.homeTeam ?? '').toLowerCase().trim();
    const away = (m.awayTeam ?? '').toLowerCase().trim();
    if (home && away) fps.add(`${home}|${away}`);
  }
  return fps;
}

function isMatchInAdminSet(match: EnrichedMatch, adminFps: Set<string>): boolean {
  const home = (match.homeTeam ?? '').toLowerCase().trim();
  const away = (match.awayTeam ?? '').toLowerCase().trim();
  return adminFps.has(`${home}|${away}`);
}

const HIDDEN_ADMIN_IDS_KEY = 'hidden_finished_admin_match_ids';
function loadHiddenAdminIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_ADMIN_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch { /* ignore */ }
  return new Set();
}
function saveHiddenAdminIds(ids: Set<string>): void {
  try { localStorage.setItem(HIDDEN_ADMIN_IDS_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}
function addHiddenAdminId(id: string): void {
  const ids = loadHiddenAdminIds();
  ids.add(id);
  saveHiddenAdminIds(ids);
}

// ---------------------------------------------------------------------------
// League → teams mappings
// ---------------------------------------------------------------------------
const LEAGUE_TEAMS: Record<Exclude<FootballLeagueTab, 'all' | 'other'>, { leagueNames: string[]; teams: string[] }> = {
  premier_league: {
    leagueNames: ['Premier League', 'English Premier League', 'EPL'],
    teams: [
      'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Brighton & Hove Albion',
      'Chelsea','Crystal Palace','Everton','Fulham','Ipswich','Ipswich Town',
      'Leicester','Leicester City','Liverpool','Manchester City','Manchester United',
      'Newcastle','Newcastle United','Nottingham Forest','Nottm Forest','Southampton',
      'Tottenham','Tottenham Hotspur','West Ham','West Ham United','Wolves','Wolverhampton',
      'Wolverhampton Wanderers','Sunderland','Leeds United','Leeds','Burnley','AFC Bournemouth',
    ],
  },
  la_liga: {
    leagueNames: ['La Liga','LaLiga','La Liga EA Sports','Primera División','Primera Division'],
    teams: [
      'Athletic Club','Athletic Bilbao','Atlético Madrid','Atletico Madrid','Atlético de Madrid',
      'Barcelona','FC Barcelona','Celta Vigo','Deportivo Alavés','Deportivo Alaves',
      'Espanyol','RCD Espanyol','Getafe','Girona','Las Palmas','UD Las Palmas',
      'Leganés','Leganes','CD Leganés','Mallorca','RCD Mallorca','Osasuna','CA Osasuna',
      'Rayo Vallecano','Real Betis','Real Madrid','Real Sociedad','Real Valladolid',
      'Sevilla','Sevilla FC','Valencia','Valencia CF','Villarreal','Villarreal CF',
      'Alavés','Alaves','Levante','Elche','Real Oviedo',
    ],
  },
  bundesliga: {
    leagueNames: ['Bundesliga','1. Bundesliga','German Bundesliga','Fußball-Bundesliga'],
    teams: [
      'Augsburg','FC Augsburg','Bayer Leverkusen','Bayern Munich','FC Bayern München',
      'FC Bayern Munich','Borussia Dortmund','BVB','Borussia Mönchengladbach',
      'Borussia Monchengladbach','Eintracht Frankfurt','Freiburg','SC Freiburg',
      'Hamburg','Hamburger SV','Hamburg SV','Heidenheim','1. FC Heidenheim','1. FC Heidenheim 1846',
      'Hoffenheim','TSG Hoffenheim','Holstein Kiel','Mainz','Mainz 05','1. FSV Mainz 05',
      'RB Leipzig','Red Bull Leipzig','St. Pauli','FC St. Pauli','Stuttgart','VfB Stuttgart',
      'Union Berlin','1. FC Union Berlin','Werder Bremen','SV Werder Bremen','Wolfsburg',
      'VfL Wolfsburg','FC Cologne','1. FC Köln','Cologne',
    ],
  },
  serie_a: {
    leagueNames: ['Serie A','Italian Serie A','Serie A TIM'],
    teams: [
      'AC Milan','Milan','Atalanta','Atalanta BC','Bologna','Bologna FC',
      'Cagliari','Cagliari Calcio','Como','Como 1907','Empoli','Fiorentina','ACF Fiorentina',
      'Genoa','Genoa CFC','Hellas Verona','Inter','Inter Milan','FC Internazionale',
      'Internazionale','Juventus','Juve','Lazio','SS Lazio','Lecce','US Lecce',
      'Monza','AC Monza','Napoli','SSC Napoli','Parma','Parma Calcio','Roma','AS Roma',
      'Torino','Torino FC','Udinese','Udinese Calcio','Venezia','Venezia FC',
      'Cremonese','Pisa','Sassuolo',
    ],
  },
  ligue_1: {
    leagueNames: ['Ligue 1','Ligue 1 Uber Eats','French Ligue 1',"Ligue 1 McDonald's"],
    teams: [
      'Angers','SCO Angers','Auxerre','AJ Auxerre','Brest','Stade Brestois',
      'Stade Brestois 29','Le Havre','Le Havre AC','HAC','Lens','RC Lens','Lille','LOSC Lille',
      'Lyon','Olympique Lyonnais','OL','Marseille','Olympique de Marseille','OM',
      'Monaco','AS Monaco','Montpellier','Montpellier HSC','Nantes','FC Nantes',
      'Nice','OGC Nice','Paris Saint-Germain','PSG','Paris SG','Paris FC',
      'Reims','Stade de Reims','Rennes','Stade Rennais','Saint-Étienne','Saint-Etienne',
      'AS Saint-Étienne','Strasbourg','RC Strasbourg','Toulouse','Toulouse FC',
      'Metz','Lorient',
    ],
  },
};

const TEAM_TO_LEAGUE_TAB = new Map<string, Exclude<FootballLeagueTab, 'all' | 'other'>>();
const LEAGUE_NAME_TO_TAB = new Map<string, Exclude<FootballLeagueTab, 'all' | 'other'>>();

for (const [tab, { leagueNames, teams }] of Object.entries(LEAGUE_TEAMS) as [Exclude<FootballLeagueTab, 'all' | 'other'>, typeof LEAGUE_TEAMS[keyof typeof LEAGUE_TEAMS]][]) {
  for (const name of leagueNames) LEAGUE_NAME_TO_TAB.set(name.toLowerCase(), tab);
  for (const team of teams) TEAM_TO_LEAGUE_TAB.set(team.toLowerCase(), tab);
}

function matchBelongsToLeagueTab(match: Match, tab: Exclude<FootballLeagueTab, 'all' | 'other'>): boolean {
  if (LEAGUE_NAME_TO_TAB.get((match.league ?? '').toLowerCase()) === tab) return true;
  const homeTab = TEAM_TO_LEAGUE_TAB.get((match.homeTeam ?? '').toLowerCase());
  const awayTab = TEAM_TO_LEAGUE_TAB.get((match.awayTeam ?? '').toLowerCase());
  return homeTab === tab && awayTab === tab;
}

function inferLeagueFromTeams(homeTeam: string, awayTeam: string): string {
  const h = homeTeam.toLowerCase();
  const a = awayTeam.toLowerCase();
  for (const [, { leagueNames, teams }] of Object.entries(LEAGUE_TEAMS) as [Exclude<FootballLeagueTab, 'all' | 'other'>, typeof LEAGUE_TEAMS[keyof typeof LEAGUE_TEAMS]][]) {
    const teamSet = new Set(teams.map((t) => t.toLowerCase()));
    if (teamSet.has(h) && teamSet.has(a)) return leagueNames[0];
  }
  return '';
}

const SPORT_TABS: { key: SportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'football',   label: 'Football',   icon: <SportsSoccerIcon sx={{ fontSize: 16 }} /> },
  { key: 'basketball', label: 'Basketball', icon: <SportsBasketballIcon sx={{ fontSize: 16 }} /> },
  { key: 'tennis',     label: 'Tennis',     icon: <SportsTennisIcon sx={{ fontSize: 16 }} /> },
  { key: 'baseball',   label: 'Baseball',   icon: <SportsBaseballIcon sx={{ fontSize: 16 }} /> },
  { key: 'nfl',        label: 'NFL',        icon: <SportsFootballIcon sx={{ fontSize: 16 }} /> },
  { key: 'mma',        label: 'MMA',        icon: <SportsMmaIcon sx={{ fontSize: 16 }} /> },
];

const FOOTBALL_LEAGUE_TABS: { key: FootballLeagueTab; label: string }[] = [
  { key: 'all',            label: 'All'            },
  { key: 'premier_league', label: 'Premier League' },
  { key: 'la_liga',        label: 'La Liga'        },
  { key: 'bundesliga',     label: 'Bundesliga'     },
  { key: 'serie_a',        label: 'Serie A'        },
  { key: 'ligue_1',        label: 'Ligue 1'        },
  { key: 'other',          label: 'Other'          },
];

const TWO_WAY_ODDS_SPORTS = new Set<SportTab>(['baseball','basketball','nfl','mma']);

const LIVE_STATUSES = new Set([
  'LIVE','live','IN_PLAY','in_play','inplay',
  'FIRST_HALF','first_half','1H','1h','SECOND_HALF','second_half','2H','2h',
  'HALFTIME','halftime','HALF_TIME','half_time','HT','ht',
  'EXTRA_TIME','extra_time','ET','et','ET1','et1','ET2','et2',
  'PENALTIES','penalties','PEN','pen','P','SHOOTOUT','shootout',
  'BREAK','break','SUSPENDED','suspended','INTERRUPTED','interrupted',
  'STATUS_IN_PROGRESS','STATUS_HALFTIME','STATUS_END_PERIOD',
  'STATUS_OVERTIME','STATUS_FIRST_HALF','STATUS_SECOND_HALF',
]);

const FINISHED_STATUSES = new Set([
  'FINISHED','finished','FULL_TIME','full_time','FT','ft',
  'AWARDED','awarded','CANCELLED','cancelled','CANCELED','canceled',
  'POSTPONED','postponed','ABANDONED','abandoned','VOID','void',
  'AFTER_EXTRA_TIME','after_extra_time','AET','aet',
  'AFTER_PENALTIES','after_penalties','AP','ap',
  'ENDED','ended','COMPLETED','completed','COMPLETE','complete',
  'WALKOVER','walkover','RETIRED','retired','DELAYED','delayed',
  'COVERAGE_LOST','coverage_lost',
  'STATUS_FINAL','STATUS_FULL_TIME','STATUS_POSTPONED',
  'STATUS_CANCELED','STATUS_SUSPENDED','STATUS_ABANDONED','STATUS_RAIN_DELAY',
]);

const HALFTIME_STATUSES   = new Set(['HALFTIME','halftime','HALF_TIME','half_time','HT','ht','STATUS_HALFTIME']);
const EXTRA_TIME_STATUSES = new Set(['EXTRA_TIME','extra_time','ET','et','ET1','et1','ET2','et2','STATUS_OVERTIME']);
const PENALTY_STATUSES    = new Set(['PENALTIES','penalties','PEN','pen','SHOOTOUT','shootout']);

const TOP_6_LEAGUE_DISPLAY_NAMES = ['Premier League','La Liga','Bundesliga','Serie A','Ligue 1'];
const TOP_6_LABELS = new Set<string>(TOP_6_LEAGUE_DISPLAY_NAMES);
const CUPS_LABELS  = new Set<string>([
  'FA Cup','EFL Cup / Carabao Cup','Copa del Rey','DFB Pokal','Coppa Italia',
  'Coupe de France','UEFA Champions League','UEFA Europa League',
  'UEFA Conference League','UEFA Nations League','UEFA Euros',
  'Copa Libertadores','Copa América','CONCACAF Champions Cup',
  'AFC Champions League','CAF Champions League','Africa Cup of Nations',
  'FIFA World Cup',"Women's World Cup",'FIFA Club World Cup',
]);

function leagueSortKey(league: string): string {
  if (!league) return '99_zzz_unknown';
  for (let i = 0; i < TOP_6_LEAGUE_DISPLAY_NAMES.length; i++) {
    if (league === TOP_6_LEAGUE_DISPLAY_NAMES[i]) return `00_${String(i).padStart(2,'0')}_${league}`;
  }
  if (CUPS_LABELS.has(league)) return `01_${league.toLowerCase()}`;
  return `02_${league.toLowerCase()}`;
}

function categorise(match: Match): MatchCategory | null {
  const status = match.status ?? '';
  if (FINISHED_STATUSES.has(status)) return null;
  if (LIVE_STATUSES.has(status)) return 'live';
  if (match.kickoffAt) {
    const kickoff = new Date(match.kickoffAt);
    const now = new Date();
    if (kickoff.toISOString().slice(0,10) === now.toISOString().slice(0,10)) return 'today';
    if (kickoff > now) return 'upcoming';
    return 'today';
  }
  return 'upcoming';
}

function formatKickoff(kickoffAt?: string): string {
  if (!kickoffAt) return '--:--';
  return new Date(kickoffAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12: false });
}

function formatCountdown(kickoffAt?: string): string {
  if (!kickoffAt) return '';
  const diff = new Date(kickoffAt).getTime() - Date.now();
  if (diff <= 0) return 'Starting soon';
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function extractOddsMap(oddsArray: unknown[], homeTeam: string, awayTeam: string): OddsMap | undefined {
  if (!Array.isArray(oddsArray) || oddsArray.length === 0) return undefined;
  const pool = oddsArray as Array<Record<string, unknown>>;
  const parseOdd = (o: Record<string, unknown>): number =>
    parseFloat(String(o.odd ?? o.value ?? o.odds ?? o.price ?? o.decimal ?? o.americanOdds ?? '0'));
  const norm = (s: string) => s.toLowerCase().trim();
  const normHome = norm(homeTeam);
  const normAway = norm(awayTeam);
  const matchesTeam = (sel: string, teamNorm: string) => { const s = norm(sel); return s === teamNorm || s.includes(teamNorm) || teamNorm.includes(s); };
  let home = 0, draw = 0, away = 0;
  for (const o of pool) {
    const sel = norm(String(o.selection ?? o.outcome ?? o.name ?? o.label ?? o.type ?? ''));
    const val = parseOdd(o);
    if (val <= 1 || val > 200) continue;
    if (sel === 'home') { if (home === 0) home = val; }
    else if (sel === 'away') { if (away === 0) away = val; }
    else if (sel === 'draw' || sel === 'x') { if (draw === 0) draw = val; }
    else if (matchesTeam(sel, normHome)) { if (home === 0) home = val; }
    else if (matchesTeam(sel, normAway)) { if (away === 0) away = val; }
  }
  if (home === 0 && draw === 0 && away === 0) {
    const vals = pool.map(parseOdd).filter((v) => v > 1 && v < 50);
    if (vals.length >= 2) return vals.length >= 3 ? { home: vals[0], draw: vals[1], away: vals[2] } : { home: vals[0], draw: 0, away: vals[1] };
    return undefined;
  }
  return { home, draw, away };
}

function unwrapWithAllOdds(raw: unknown): Array<{ match: Match; odds: unknown[] }> {
  if (!raw) return [];
  const obj = raw as Record<string, unknown>;
  if (!obj.success || !obj.data) return [];
  const items: Array<{ match: Match; odds: unknown[] }> = [];
  const processItem = (item: unknown) => {
    const i = item as Record<string, unknown>;
    const match = normalizeMatch(i.match ?? i);
    if (!match?.id) return;
    const odds: unknown[] = Array.isArray(i.match_result) ? i.match_result : Array.isArray(i.odds) ? i.odds : Array.isArray(i.markets) ? i.markets : [];
    items.push({ match, odds });
  };
  const data = obj.data;
  if (Array.isArray(data)) data.forEach(processItem);
  else if (data && typeof data === 'object') for (const val of Object.values(data as Record<string, unknown>)) if (Array.isArray(val)) val.forEach(processItem);
  return items;
}

function looksLikeFixtureName(s: string): boolean { return / at /i.test(s) || / vs\.? /i.test(s) || / @ /i.test(s); }

function normalizeMatch(raw: unknown): Match | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.matchId ?? r.match_id ?? r.fixtureId ?? r.fixture_id ?? '');
  if (!id || id === 'undefined') return null;
  let competitorHome: Record<string, unknown> | null = null;
  let competitorAway: Record<string, unknown> | null = null;
  const competitorsArr = Array.isArray(r.competitors) ? r.competitors as Record<string, unknown>[] : null;
  const competitionsArr = Array.isArray(r.competitions) ? r.competitions as Record<string, unknown>[] : null;
  const firstComp = competitionsArr?.[0] as Record<string, unknown> | undefined;
  const nestedCompetitors = Array.isArray(firstComp?.competitors) ? firstComp!.competitors as Record<string, unknown>[] : null;
  const resolveCompetitors = (arr: Record<string, unknown>[]) => {
    for (const c of arr) {
      const side = String(c.homeAway ?? c.type ?? '').toLowerCase();
      const teamObj = (c.team && typeof c.team === 'object') ? c.team as Record<string, unknown> : c;
      if (side === 'home') competitorHome = teamObj; else if (side === 'away') competitorAway = teamObj;
    }
    if (!competitorHome && !competitorAway && arr.length >= 2) {
      const t0 = arr[0]; const t1 = arr[1];
      competitorHome = (t0.team && typeof t0.team === 'object') ? t0.team as Record<string, unknown> : t0;
      competitorAway = (t1.team && typeof t1.team === 'object') ? t1.team as Record<string, unknown> : t1;
    }
  };
  if (competitorsArr) resolveCompetitors(competitorsArr);
  if (!competitorHome && !competitorAway && nestedCompetitors) resolveCompetitors(nestedCompetitors);
  const homeObj = competitorHome ?? ((r.home && typeof r.home === 'object') ? r.home as Record<string, unknown> : null);
  const awayObj = competitorAway ?? ((r.away && typeof r.away === 'object') ? r.away as Record<string, unknown> : null);
  let homeTeam = String(r.homeTeam ?? r.home_team ?? r.homeName ?? r.home_name ?? homeObj?.name ?? homeObj?.displayName ?? homeObj?.teamName ?? '').trim();
  let awayTeam = String(r.awayTeam ?? r.away_team ?? r.awayName ?? r.away_name ?? awayObj?.name ?? awayObj?.displayName ?? awayObj?.teamName ?? '').trim();
  if ((!homeTeam || !awayTeam) && typeof r.name === 'string') {
    const atMatch = r.name.match(/^(.+?)\s+at\s+(.+)$/i);
    const vsMatch = r.name.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (atMatch) { if (!awayTeam) awayTeam = atMatch[1].trim(); if (!homeTeam) homeTeam = atMatch[2].trim(); }
    else if (vsMatch) { if (!homeTeam) homeTeam = vsMatch[1].trim(); if (!awayTeam) awayTeam = vsMatch[2].trim(); }
  }
  if (!homeTeam && !awayTeam) return null;
  let leagueName = '';
  let leagueLogo = '';
  if (firstComp) {
    const compLeague = firstComp.league ?? firstComp.season;
    if (compLeague && typeof compLeague === 'object') leagueName = String((compLeague as Record<string,unknown>).name ?? (compLeague as Record<string,unknown>).displayName ?? (compLeague as Record<string,unknown>).slug ?? '');
  }
  if (!leagueName) {
    const rawLeague = r.league ?? r.leagueName ?? r.competition ?? r.league_name ?? r.competitionName;
    if (rawLeague && typeof rawLeague === 'object') {
      const lo = rawLeague as Record<string, unknown>;
      leagueName = String(lo.name ?? lo.displayName ?? lo.shortName ?? lo.abbreviation ?? '');
      leagueLogo = String(lo.logo ?? lo.logoUrl ?? '');
      if (Array.isArray(lo.logos) && lo.logos.length > 0) leagueLogo = String((lo.logos[0] as Record<string,unknown>).href ?? (lo.logos[0] as Record<string,unknown>).url ?? leagueLogo);
    } else if (rawLeague) {
      const candidate = String(rawLeague);
      leagueName = looksLikeFixtureName(candidate) ? '' : candidate;
    }
  }
  if (!leagueName && firstComp) { const season = firstComp.season as Record<string, unknown> | undefined; if (season?.slug) leagueName = String(season.slug); }
  if (!leagueLogo) leagueLogo = String(r.leagueLogo ?? r.league_logo ?? r.competitionLogo ?? r.competition_logo ?? '');
  if (!leagueName && homeTeam && awayTeam) leagueName = inferLeagueFromTeams(homeTeam, awayTeam);
  let status = '';
  const rawStatus = (firstComp?.status) ?? r.status ?? r.matchStatus ?? r.match_status ?? r.state;
  if (rawStatus && typeof rawStatus === 'object') {
    const so = rawStatus as Record<string, unknown>;
    const typeObj = so.type as Record<string, unknown> | undefined;
    status = String(typeObj?.name ?? typeObj?.description ?? so.name ?? so.description ?? so.state ?? '');
  } else status = String(rawStatus ?? '');
  let scoreHome: number | undefined;
  let scoreAway: number | undefined;
  const rawScoreHome = r.scoreHome ?? r.score_home ?? r.homeScore ?? r.home_score;
  const rawScoreAway = r.scoreAway ?? r.score_away ?? r.awayScore ?? r.away_score;
  if (rawScoreHome != null) scoreHome = Number(rawScoreHome); else if (homeObj?.score != null) scoreHome = Number(homeObj.score);
  if (rawScoreAway != null) scoreAway = Number(rawScoreAway); else if (awayObj?.score != null) scoreAway = Number(awayObj.score);
  const scoreCompetitors = competitorsArr ?? nestedCompetitors ?? [];
  if (scoreHome == null || scoreAway == null) {
    for (const c of scoreCompetitors) {
      const side = String(c.homeAway ?? '').toLowerCase();
      const s = c.score != null ? Number(c.score) : undefined;
      if (side === 'home' && s != null && scoreHome == null) scoreHome = s;
      if (side === 'away' && s != null && scoreAway == null) scoreAway = s;
    }
  }
  const kickoffAt = String(r.kickoffAt ?? r.kickoff_at ?? r.startTime ?? r.start_time ?? r.date ?? r.scheduledAt ?? r.datetime ?? firstComp?.date ?? '');
  let minutePlayed: number | undefined;
  if (r.minutePlayed != null) minutePlayed = Number(r.minutePlayed);
  else if (r.minute_played != null) minutePlayed = Number(r.minute_played);
  else if (rawStatus && typeof rawStatus === 'object') {
    const so = rawStatus as Record<string, unknown>;
    const clock = so.displayClock ?? so.clock;
    if (clock) { const mins = parseInt(String(clock), 10); if (!isNaN(mins)) minutePlayed = mins; }
  }
  return { id, source: (r.source as Match['source']) ?? 'ESPN', homeTeam, awayTeam, league: leagueName, status, kickoffAt, scoreHome, scoreAway, homeLogo: '', awayLogo: '', leagueLogo, minutePlayed, sport: String(r.sport ?? 'FOOTBALL'), createdAt: String(r.createdAt ?? r.created_at ?? '') } as Match;
}

function normalizeAdminMatch(raw: unknown): Match | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.matchId ?? r.match_id ?? '');
  if (!id || id === 'undefined') return null;
  const homeTeam = String(r.homeTeam ?? r.home_team ?? r.homeName ?? r.home_name ?? '').trim();
  const awayTeam = String(r.awayTeam ?? r.away_team ?? r.awayName ?? r.away_name ?? '').trim();
  let leagueName = '';
  let leagueLogo = '';
  const rawLeague = r.league ?? r.leagueName ?? r.league_name ?? r.competition ?? r.competitionName;
  if (rawLeague && typeof rawLeague === 'object') {
    const lo = rawLeague as Record<string, unknown>;
    leagueName = String(lo.name ?? lo.displayName ?? lo.shortName ?? '');
    leagueLogo = String(lo.logo ?? lo.logoUrl ?? lo.logo_url ?? '');
  } else if (typeof rawLeague === 'string' && rawLeague.trim()) leagueName = rawLeague.trim();
  if (!leagueLogo) leagueLogo = sanitizeLogo(String(r.leagueLogo ?? r.league_logo ?? r.competitionLogo ?? r.competition_logo ?? ''));
  if (!leagueName && homeTeam && awayTeam) leagueName = inferLeagueFromTeams(homeTeam, awayTeam);
  const status = String(r.status ?? r.matchStatus ?? r.match_status ?? '');
  const scoreHome = r.scoreHome != null ? Number(r.scoreHome) : r.score_home != null ? Number(r.score_home) : r.homeScore != null ? Number(r.homeScore) : undefined;
  const scoreAway = r.scoreAway != null ? Number(r.scoreAway) : r.score_away != null ? Number(r.score_away) : r.awayScore != null ? Number(r.awayScore) : undefined;
  const kickoffAt = String(r.kickoffAt ?? r.kickoff_at ?? r.startTime ?? r.start_time ?? r.date ?? r.scheduledAt ?? '');
  const minutePlayed = r.minutePlayed != null ? Number(r.minutePlayed) : r.minute_played != null ? Number(r.minute_played) : undefined;
  return { id, source: 'ADMIN_CREATED' as Match['source'], homeTeam: homeTeam || 'Home Team', awayTeam: awayTeam || 'Away Team', league: leagueName, status, kickoffAt, scoreHome, scoreAway, homeLogo: '', awayLogo: '', leagueLogo, minutePlayed, sport: String(r.sport ?? 'FOOTBALL'), createdAt: String(r.createdAt ?? r.created_at ?? '') } as Match;
}

function safeUnwrapList(raw: unknown): Match[] {
  if (!raw) return [];
  const normalize = (arr: unknown[]): Match[] => arr.map(normalizeMatch).filter((m): m is Match => m !== null);
  if (Array.isArray(raw)) return normalize(raw);
  const obj = raw as Record<string, unknown>;
  if (!obj.success || !obj.data) return [];
  if (Array.isArray(obj.data)) return normalize(obj.data);
  if (typeof obj.data === 'object') { const all: unknown[] = []; for (const val of Object.values(obj.data as Record<string, unknown>)) if (Array.isArray(val)) all.push(...val); return normalize(all); }
  return [];
}

function dedup(matches: Match[]): EnrichedMatch[] {
  const seen = new Set<string>();
  return matches.filter(({ id }) => { if (seen.has(id)) return false; seen.add(id); return true; }).map((m) => ({ ...m }));
}

function safeUnwrapOddsArray(raw: unknown): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  if (!obj.success) return [];
  return Array.isArray(obj.data) ? obj.data : [];
}

function unwrapAdminMatches(raw: unknown): Match[] {
  if (!raw) return [];
  const obj = raw as Record<string, unknown>;
  if (!obj.success || !Array.isArray(obj.data)) return [];
  return (obj.data as unknown[]).reduce<Match[]>((acc, item) => { const match = normalizeAdminMatch(item); if (match?.id) acc.push(match); return acc; }, []);
}

async function fetchAdminMatchOdds(matchId: string): Promise<unknown[]> {
  try { return safeUnwrapOddsArray(await fetch(`https://futballbackend-production-2b7e.up.railway.app/api/public/admin-matches/${matchId}/odds`).then((r) => r.json())); }
  catch { return []; }
}

function mergeOddsById(oddsById: Map<string, unknown[]>, entries: Array<{ match: Match; odds: unknown[] }>): void {
  for (const { match, odds } of entries) {
    if (odds.length === 0) continue;
    const existing = oddsById.get(match.id);
    if (!existing || odds.length > existing.length) oddsById.set(match.id, odds);
  }
}

function hasValidOdds(match: EnrichedMatch): boolean {
  if (FINISHED_STATUSES.has(match.status ?? '')) return true;
  const o = match.oddsMap;
  return !!o && o.home > 0 && o.away > 0;
}

async function fetchAllFootballMatches(): Promise<EnrichedMatch[]> {
  const [withOddsRes, liveRes, upcomingRes, todayRes, resultsRes, livescoreLiveRes, livescoreTodayRes, allCupsUpcomingRes, allCupsTodayRes, allCupsLive] = await Promise.allSettled([
    api.publicFootball.withAllOdds(), api.publicFootball.live(), api.publicFootball.upcoming(), api.publicFootball.today(), api.publicFootball.results(50),
    api.publicFootballLivescore.live(), api.publicFootballLivescore.today(), api.publicFootball.allCupsUpcoming(), api.publicFootball.allCupsToday(), api.publicFootball.allCupsLive(),
  ]);
  const oddsById = new Map<string, unknown[]>();
  const withOddsItems     = withOddsRes.status  === 'fulfilled' ? unwrapWithAllOdds(withOddsRes.value)   : [];
  const fromUpcomingItems = upcomingRes.status   === 'fulfilled' ? unwrapWithAllOdds(upcomingRes.value)   : [];
  const fromTodayItems    = todayRes.status      === 'fulfilled' ? unwrapWithAllOdds(todayRes.value)      : [];
  mergeOddsById(oddsById, withOddsItems); mergeOddsById(oddsById, fromUpcomingItems); mergeOddsById(oddsById, fromTodayItems);
  if (liveRes.status === 'fulfilled') mergeOddsById(oddsById, unwrapWithAllOdds(liveRes.value));
  const oddsByFingerprint = new Map<string, unknown[]>();
  const makeFingerprint = (home: string, away: string, kickoff: string) => `${home.toLowerCase().trim()}|${away.toLowerCase().trim()}|${kickoff.slice(0, 10)}`;
  for (const [matchId, odds] of oddsById.entries()) {
    const sourceMatch = [...withOddsItems, ...fromUpcomingItems, ...fromTodayItems].find(({ match }) => match.id === matchId)?.match;
    if (sourceMatch?.homeTeam && sourceMatch?.awayTeam && sourceMatch?.kickoffAt) {
      const fp = makeFingerprint(sourceMatch.homeTeam, sourceMatch.awayTeam, sourceMatch.kickoffAt);
      if (!oddsByFingerprint.has(fp)) oddsByFingerprint.set(fp, odds);
    }
  }
  const allMatches: Match[] = [
    ...withOddsItems.map(({ match }) => match),
    ...(liveRes.status === 'fulfilled' ? safeUnwrapList(liveRes.value) : []),
    ...fromUpcomingItems.map(({ match }) => match),
    ...fromTodayItems.map(({ match }) => match),
    ...(resultsRes.status === 'fulfilled' ? safeUnwrapList(resultsRes.value) : []),
    ...(allCupsUpcomingRes.status === 'fulfilled' ? safeUnwrapList(allCupsUpcomingRes.value) : []),
    ...(allCupsTodayRes.status === 'fulfilled' ? safeUnwrapList(allCupsTodayRes.value) : []),
    ...(allCupsLive.status === 'fulfilled' ? safeUnwrapList(allCupsLive.value) : []),
    ...(livescoreLiveRes.status === 'fulfilled' ? safeUnwrapList(livescoreLiveRes.value) : []),
    ...(livescoreTodayRes.status === 'fulfilled' ? safeUnwrapList(livescoreTodayRes.value) : []),
  ];
  const seenIds = new Set<string>(); const seenFps = new Set<string>();
  const dedupedMatches = allMatches.filter((m) => {
    if (!m?.id || seenIds.has(m.id)) return false; seenIds.add(m.id);
    const fp = `${(m.homeTeam ?? '').toLowerCase()}|${(m.awayTeam ?? '').toLowerCase()}|${(m.kickoffAt ?? '').slice(0,16)}`;
    if (fp !== '||' && seenFps.has(fp)) return false; if (fp !== '||') seenFps.add(fp); return true;
  });
  const enrichedPass1 = dedupedMatches.map((match) => {
    let odds = oddsById.get(match.id) ?? [];
    if (odds.length === 0 && match.homeTeam && match.awayTeam && match.kickoffAt) { const fp = makeFingerprint(match.homeTeam, match.awayTeam, match.kickoffAt); const fpOdds = oddsByFingerprint.get(fp); if (fpOdds?.length) odds = fpOdds; }
    const oddsMap = extractOddsMap(odds, match.homeTeam ?? '', match.awayTeam ?? '');
    return { ...match, oddsMap, _needsOdds: !oddsMap && !FINISHED_STATUSES.has(match.status ?? '') };
  });
  const needsIndividualOdds = enrichedPass1.filter((m) => m._needsOdds).slice(0, 30);
  const individualOddsResults = await Promise.allSettled(needsIndividualOdds.map((m) => api.publicFootball.odds(m.id).then((r) => ({ matchId: m.id, data: r })).catch(() => ({ matchId: m.id, data: null }))));
  const individualOddsMap = new Map<string, unknown[]>();
  individualOddsResults.forEach((result) => { if (result.status === 'fulfilled' && result.value.data) { const arr = safeUnwrapOddsArray(result.value.data); if (arr.length > 0) individualOddsMap.set(result.value.matchId, arr); } });
  const enriched = enrichedPass1.map(({ _needsOdds, ...match }) => {
    if (!_needsOdds || match.oddsMap) return match as EnrichedMatch;
    const indOdds = individualOddsMap.get(match.id) ?? [];
    if (indOdds.length === 0) return match as EnrichedMatch;
    return { ...match, oddsMap: extractOddsMap(indOdds, match.homeTeam ?? '', match.awayTeam ?? '') } as EnrichedMatch;
  });
  return enriched.filter(hasValidOdds);
}

function filterByLeagueTab(matches: EnrichedMatch[], tab: FootballLeagueTab): { matches: EnrichedMatch[]; isFallback: boolean } {
  if (tab === 'all') return { matches, isFallback: false };
  if (tab === 'other') {
    const filtered = matches.filter((m) => { for (const lt of Object.keys(LEAGUE_TEAMS) as Exclude<FootballLeagueTab,'all'|'other'>[]) { if (matchBelongsToLeagueTab(m, lt)) return false; } return true; });
    return filtered.length === 0 ? { matches, isFallback: true } : { matches: filtered, isFallback: false };
  }
  const filtered = matches.filter((m) => matchBelongsToLeagueTab(m, tab));
  return filtered.length === 0 ? { matches, isFallback: true } : { matches: filtered, isFallback: false };
}

async function fetchBasketballMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([api.publicBasketball.live(), api.publicBasketball.upcoming(), api.publicBasketball.results()]);
  const allItems = [...(live.status === 'fulfilled' ? unwrapWithAllOdds(live.value) : []), ...(upcoming.status === 'fulfilled' ? unwrapWithAllOdds(upcoming.value) : []), ...(results.status === 'fulfilled' ? unwrapWithAllOdds(results.value) : [])];
  const seen = new Set<string>();
  return allItems.filter(({ match }) => { if (!match?.id || seen.has(match.id)) return false; seen.add(match.id); return true; }).map(({ match, odds }) => ({ ...match, oddsMap: extractOddsMap(odds, match.homeTeam ?? '', match.awayTeam ?? '') })).filter(hasValidOdds);
}
async function fetchTennisMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([api.publicTennis.live(), api.publicTennis.upcoming(), api.publicTennis.results()]);
  return dedup([...(live.status === 'fulfilled' ? safeUnwrapList(live.value) : []), ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []), ...(results.status === 'fulfilled' ? safeUnwrapList(results.value) : [])]).filter(hasValidOdds);
}
async function fetchBaseballMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, today] = await Promise.allSettled([api.publicBaseball.live(), api.publicBaseball.upcoming(), api.publicBaseball.today()]);
  const allItems = [...(live.status === 'fulfilled' ? unwrapWithAllOdds(live.value) : []), ...(upcoming.status === 'fulfilled' ? unwrapWithAllOdds(upcoming.value) : []), ...(today.status === 'fulfilled' ? unwrapWithAllOdds(today.value) : [])];
  const seen = new Set<string>();
  const deduped = allItems.filter(({ match }) => { if (!match?.id || seen.has(match.id)) return false; seen.add(match.id); return true; });
  const needsOdds = deduped.filter(({ odds }) => odds.length === 0).slice(0, 20);
  const oddsResponses = await Promise.allSettled(needsOdds.map(({ match }) => api.publicBaseball.odds(match.id).catch(() => null)));
  const oddsById = new Map<string, unknown[]>();
  needsOdds.forEach(({ match }, idx) => { const result = oddsResponses[idx]; if (result.status === 'fulfilled' && result.value != null) { const parsed = safeUnwrapOddsArray(result.value); if (parsed.length > 0) oddsById.set(match.id, parsed); } });
  return deduped.map(({ match, odds }) => ({ ...match, oddsMap: extractOddsMap(odds.length > 0 ? odds : (oddsById.get(match.id) ?? []), match.homeTeam ?? '', match.awayTeam ?? '') })).filter(hasValidOdds);
}
async function fetchNflMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([api.publicNfl.live(), api.publicNfl.upcoming(), api.publicNfl.results()]);
  return dedup([...(live.status === 'fulfilled' ? safeUnwrapList(live.value) : []), ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []), ...(results.status === 'fulfilled' ? safeUnwrapList(results.value) : [])]).filter(hasValidOdds);
}
async function fetchMmaMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([api.publicMma.live(), api.publicMma.upcoming(), api.publicMma.results()]);
  return dedup([...(live.status === 'fulfilled' ? safeUnwrapList(live.value) : []), ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []), ...(results.status === 'fulfilled' ? safeUnwrapList(results.value) : [])]).filter(hasValidOdds);
}

function useLiveTimer(match: EnrichedMatch): string {
  const status = match.status ?? '';
  const isLive = LIVE_STATUSES.has(status);
  const getElapsedMins = useCallback((): number => {
    if (match.kickoffAt) { const elapsed = Date.now() - new Date(match.kickoffAt).getTime(); if (elapsed >= 0) return Math.floor(elapsed / 60_000); }
    return match.minutePlayed ?? 0;
  }, [match.kickoffAt, match.minutePlayed]);
  const [elapsed, setElapsed] = useState<number>(getElapsedMins);
  useEffect(() => {
    if (!isLive) return;
    setElapsed(getElapsedMins());
    const id = setInterval(() => setElapsed(getElapsedMins()), 30_000);
    return () => clearInterval(id);
  }, [isLive, getElapsedMins]);
  if (!isLive) return '';
  if (HALFTIME_STATUSES.has(status)) return 'HT';
  if (PENALTY_STATUSES.has(status)) return 'PEN';
  if (EXTRA_TIME_STATUSES.has(status)) return `${Math.min(elapsed, 120)}' ET`;
  return `${match.minutePlayed != null ? match.minutePlayed : Math.min(elapsed, 90)}'`;
}

const ADMIN_FINISHED_LINGER_MS = 10_000;

// ---------------------------------------------------------------------------
// CompactMatchRow — LIVE: odds locked, no navigation
// ---------------------------------------------------------------------------
function CompactMatchRow({
  match, hasDraw = true, onClick, isAdmin = false, matchIndex,
}: {
  match: EnrichedMatch; hasDraw?: boolean; onClick?: () => void; isAdmin?: boolean; matchIndex: number;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore() as { betSlip: BetSlipEntry[]; addToBetSlip: (e: BetSlipEntry) => void; showToast: (m: string, t: string) => void; };
  const status = match.status ?? '';
  const isLive = LIVE_STATUSES.has(status);
  const timerStr = useLiveTimer(match);
  const odds = match.oddsMap;
  const sportLabel = isAdmin ? 'SPECIAL' : (match.league || match.sport || '');

  const isSel = (sel: string) => (betSlip as BetSlipEntry[]).some((s) => s.matchId === match.id && s.market === '1X2' && s.selection === sel);

  const pick = (sel: string, odd: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLive) return;
    if (!odd || odd <= 0) return;
    addToBetSlip({ matchId: match.id, matchName: `${match.homeTeam} vs ${match.awayTeam}`, market: '1X2', selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };

  const handleRowClick = () => {
    if (isLive) return;
    onClick?.();
  };

  const oddsSlots = hasDraw
    ? [{ key: '1', val: odds?.home ?? 0 }, { key: 'X', val: odds?.draw ?? 0 }, { key: '2', val: odds?.away ?? 0 }]
    : [{ key: '1', val: odds?.home ?? 0 }, { key: '2', val: odds?.away ?? 0 }];

  return (
    <div
      className={`cmr${isLive ? ' live' : ''}${isAdmin ? ' admin' : ''}${isLive ? ' no-pointer' : ''}`}
      onClick={handleRowClick}
      role={isLive ? 'presentation' : 'button'}
      tabIndex={isLive ? -1 : 0}
      onKeyDown={(e) => { if (!isLive && (e.key === 'Enter' || e.key === ' ')) onClick?.(); }}
      style={isLive ? { cursor: 'default' } : undefined}
    >
      {/* Left: time/status */}
      <div className="cmr-left">
        {isAdmin && <span className="cmr-star">★</span>}
        {isLive ? (
          <span className="cmr-live"><FiberManualRecordIcon sx={{ fontSize: 8 }} />{timerStr || 'LIVE'}</span>
        ) : (
          <span className="cmr-time">{match.kickoffAt ? formatKickoff(match.kickoffAt) : '--:--'}</span>
        )}
        <span className="cmr-id">#{matchIndex}</span>
        <span className="cmr-sport">{sportLabel.toUpperCase().slice(0, 10)}</span>
      </div>

      {/* Center: teams */}
      <div className="cmr-teams">
        <div className="cmr-team">
          {isLive && <span className="cmr-score">{match.scoreHome ?? 0}</span>}
          <span className="cmr-name">{match.homeTeam}</span>
        </div>
        <div className="cmr-team">
          {isLive && <span className="cmr-score">{match.scoreAway ?? 0}</span>}
          <span className="cmr-name">{match.awayTeam}</span>
        </div>
        {!isLive && match.kickoffAt && (
          <div className="cmr-countdown"><ScheduleIcon sx={{ fontSize: 10, opacity: 0.5 }} />{formatCountdown(match.kickoffAt)}</div>
        )}
      </div>

      {/* Right: odds — LOCKED when live */}
      <div className="cmr-odds">
        {isLive ? (
          <div className="cmr-odds-locked">
            <LockIcon sx={{ fontSize: 13, color: 'rgba(239,68,68,0.7)' }} />
            <span className="cmr-locked-label">Live · Locked</span>
          </div>
        ) : (
          oddsSlots.map(({ key, val }) => (
            <button
              key={key}
              className={`cmr-btn${val <= 0 ? ' empty' : isSel(key) ? ' sel' : ''}`}
              onClick={(e) => val > 0 && pick(key, val, e)}
              disabled={val <= 0}
            >
              <span className="cmr-btn-label">{key}</span>
              <span className="cmr-btn-val">{val > 0 ? val.toFixed(2) : '—'}</span>
            </button>
          ))
        )}
      </div>

      {!isLive && (
        <button className="cmr-stats" onClick={(e) => { e.stopPropagation(); onClick?.(); }} aria-label="stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </button>
      )}
      {isLive && <div style={{ width: 28, flexShrink: 0 }} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecialGamesSection
// ---------------------------------------------------------------------------
function SpecialGamesSection({ onAdminFingerprintsChange, hasDraw, globalIndexStart }: {
  onAdminFingerprintsChange: (fps: Set<string>) => void; hasDraw: boolean; globalIndexStart: number;
}) {
  const navigate = useNavigate();
  const permanentlyHiddenRef = useRef<Set<string>>(loadHiddenAdminIds());
  const finishedAtRef = useRef<Map<string, number>>(new Map());
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());
  const [adminMatches, setAdminMatches] = useState<EnrichedMatch[]>([]);
  const genRef = useRef(0);

  useEffect(() => {
    const myGen = ++genRef.current;
    const alive = () => myGen === genRef.current;
    async function load() {
      try {
        const raw = await fetch('https://futballbackend-production-2b7e.up.railway.app/api/public/admin-matches?ngrok-skip-browser-warning=true').then((r) => r.json());
        if (!alive()) return;
        const matches = unwrapAdminMatches(raw);
        if (matches.length === 0) { setAdminMatches([]); onAdminFingerprintsChange(new Set()); return; }
        const oddsResults = await Promise.allSettled(matches.map((m) => fetchAdminMatchOdds(m.id)));
        if (!alive()) return;
        const enriched: EnrichedMatch[] = matches.map((match, idx) => {
          const oddsArr = oddsResults[idx].status === 'fulfilled' ? oddsResults[idx].value : [];
          return { ...match, oddsMap: extractOddsMap(oddsArr, match.homeTeam ?? '', match.awayTeam ?? '') };
        });
        const withLogos = assignAdminLogos(enriched.filter(hasValidOdds));
        const now = Date.now();
        for (const m of withLogos) { if (FINISHED_STATUSES.has(m.status ?? '') && !finishedAtRef.current.has(m.id) && !permanentlyHiddenRef.current.has(m.id)) finishedAtRef.current.set(m.id, now); }
        setAdminMatches(withLogos);
        onAdminFingerprintsChange(buildAdminTeamFingerprints(withLogos));
      } catch { /* silent */ }
    }
    load();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { genRef.current++; clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [id, finishedAt] of finishedAtRef.current.entries()) {
      if (permanentlyHiddenRef.current.has(id) || sessionHiddenIds.has(id)) continue;
      const remaining = ADMIN_FINISHED_LINGER_MS - (Date.now() - finishedAt);
      const hide = () => { addHiddenAdminId(id); permanentlyHiddenRef.current.add(id); setSessionHiddenIds((prev) => new Set([...prev, id])); };
      if (remaining <= 0) hide(); else timers.push(setTimeout(hide, remaining));
    }
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMatches]);

  const visibleMatches = useMemo(() => adminMatches.filter((m) => {
    if (permanentlyHiddenRef.current.has(m.id)) return false;
    if (FINISHED_STATUSES.has(m.status ?? '')) return finishedAtRef.current.has(m.id);
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [adminMatches, sessionHiddenIds]);

  if (visibleMatches.length === 0) return null;
  const liveCount = visibleMatches.filter((m) => LIVE_STATUSES.has(m.status ?? '')).length;

  return (
    <div className="cmsec special">
      <div className="cmsec-hdr">
        <span className="cmsec-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f5a623' }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          Special Games <span className="cmsec-cnt">({visibleMatches.length})</span>
        </span>
        {liveCount > 0 && <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:'var(--live-green,#22c55e)' }}><FiberManualRecordIcon sx={{ fontSize:8 }} />{liveCount} Live</span>}
      </div>
      <div className="cmsec-col-hdr">
        <div style={{ flex:1 }} />
        {hasDraw ? ['1','X','2'].map((h) => <div key={h} className="cmsec-col-lbl">{h}</div>) : ['1','2'].map((h) => <div key={h} className="cmsec-col-lbl">{h}</div>)}
        <div style={{ width:28 }} />
      </div>
      {visibleMatches.map((m, idx) => (
        <CompactMatchRow
          key={m.id}
          match={m}
          hasDraw={hasDraw}
          isAdmin
          onClick={LIVE_STATUSES.has(m.status ?? '') ? undefined : () => navigate(`/match/${m.id}`)}
          matchIndex={globalIndexStart + idx + 1}
        />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="cmr" style={{ cursor:'default', pointerEvents:'none' }}>
      <div className="cmr-left">
        <div className="skeleton-block" style={{ width:40, height:13, borderRadius:4 }} />
        <div className="skeleton-block" style={{ width:30, height:10, borderRadius:3, marginTop:5 }} />
      </div>
      <div className="cmr-teams">
        <div className="skeleton-block" style={{ width:'72%', height:13, borderRadius:4, marginBottom:5 }} />
        <div className="skeleton-block" style={{ width:'58%', height:13, borderRadius:4 }} />
      </div>
      <div className="cmr-odds">{[0,1,2].map((i) => <div key={i} className="cmr-btn empty skeleton-block" style={{ width:60 }} />)}</div>
      <div style={{ width:28 }} />
    </div>
  );
}

function FallbackNotice({ tabLabel }: { tabLabel: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', marginBottom:10, borderRadius:8, background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)' }}>
      <span style={{ fontSize:14 }}>ℹ️</span>
      <span style={{ fontSize:12, color:'var(--text-muted,#64748b)', fontFamily:'system-ui,sans-serif' }}>
        No <strong style={{ color:'var(--text-main,#cbd5e1)', fontWeight:700 }}>{tabLabel}</strong> matches right now — showing all available games.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main MatchList
// ---------------------------------------------------------------------------
export default function MatchList() {
  const [activeSport, setActiveSport]         = useState<SportTab>('football');
  const [activeLeagueTab, setActiveLeagueTab] = useState<FootballLeagueTab>('all');
  const [allFootballMatches, setAllFootballMatches] = useState<EnrichedMatch[]>([]);
  const [footballLoading, setFootballLoading]       = useState(false);
  const [sportMatches, setSportMatches] = useState<Record<SportTab, EnrichedMatch[]>>({ football:[], basketball:[], tennis:[], baseball:[], nfl:[], mma:[] });
  const [sportLoading, setSportLoading] = useState<Record<SportTab, boolean>>({ football:false, basketball:false, tennis:false, baseball:false, nfl:false, mma:false });
  const [error, setError] = useState<string | null>(null);
  const [adminFingerprints, setAdminFingerprints] = useState<Set<string>>(new Set());
  const footballGenRef = useRef(0);
  const sportGenRefs   = useRef<Record<SportTab, number>>({ football:0, basketball:0, tennis:0, baseball:0, nfl:0, mma:0 });
  const loadedSports   = useRef<Set<SportTab>>(new Set());
  const abortControllersRef = useRef<AbortController[]>([]);
  const showDraw = !TWO_WAY_ODDS_SPORTS.has(activeSport);

  const fetchFootball = useCallback(async (background = false) => {
    const gen = ++footballGenRef.current;
    const alive = () => footballGenRef.current === gen;
    abortControllersRef.current.forEach((c) => c.abort()); abortControllersRef.current = [];
    if (!background) { setFootballLoading(true); setError(null); }
    try { const matches = await fetchAllFootballMatches(); if (!alive()) return; setAllFootballMatches(matches); }
    catch (err) { if (err instanceof Error && err.name === 'AbortError') return; if (alive() && !background) setError((err as Error).message ?? 'Failed to load matches'); }
    finally { if (alive()) setFootballLoading(false); }
  }, []);

  const fetchSport = useCallback(async (sport: SportTab, background = false) => {
    if (sport === 'football') return;
    const gen = ++sportGenRefs.current[sport];
    const alive = () => sportGenRefs.current[sport] === gen;
    if (!background) { setSportLoading((prev) => ({ ...prev, [sport]: true })); setError(null); }
    try {
      let matches: EnrichedMatch[] = [];
      switch (sport) { case 'basketball': matches = await fetchBasketballMatches(); break; case 'tennis': matches = await fetchTennisMatches(); break; case 'baseball': matches = await fetchBaseballMatches(); break; case 'nfl': matches = await fetchNflMatches(); break; case 'mma': matches = await fetchMmaMatches(); break; }
      if (!alive()) return;
      setSportMatches((prev) => ({ ...prev, [sport]: matches })); loadedSports.current.add(sport);
    } catch (err) { if (err instanceof Error && err.name === 'AbortError') return; if (alive() && !background) setError((err as Error).message ?? 'Failed to load matches'); }
    finally { if (alive()) setSportLoading((prev) => ({ ...prev, [sport]: false })); }
  }, []);

  useEffect(() => { return () => { abortControllersRef.current.forEach((c) => c.abort()); footballGenRef.current++; (Object.keys(sportGenRefs.current) as SportTab[]).forEach((s) => sportGenRefs.current[s]++); }; }, []);
  useEffect(() => { fetchFootball(false); }, [fetchFootball]);
  useEffect(() => { if (activeSport !== 'football') fetchSport(activeSport, false); }, [activeSport, fetchSport]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== 'visible') return; if (activeSport === 'football') fetchFootball(true); else fetchSport(activeSport, true); };
    const interval = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [activeSport, fetchFootball, fetchSport]);

  const { allMatches, isFallback } = useMemo((): { allMatches: EnrichedMatch[]; isFallback: boolean } => {
    if (activeSport === 'football') {
      const result = filterByLeagueTab(allFootballMatches, activeLeagueTab);
      const filtered = adminFingerprints.size > 0 ? result.matches.filter((m) => !isMatchInAdminSet(m, adminFingerprints)) : result.matches;
      return { allMatches: filtered.filter((m) => !FINISHED_STATUSES.has(m.status ?? '')), isFallback: result.isFallback };
    }
    return { allMatches: sportMatches[activeSport].filter((m) => !FINISHED_STATUSES.has(m.status ?? '')), isFallback: false };
  }, [activeSport, activeLeagueTab, allFootballMatches, sportMatches, adminFingerprints]);

  const grouped = useMemo(() => {
    const cats: Record<MatchCategory, EnrichedMatch[]> = { live:[], today:[], upcoming:[] };
    for (const m of allMatches) { const cat = categorise(m); if (cat) cats[cat].push(m); }
    return cats;
  }, [allMatches]);

  const isLoading = useMemo(() => activeSport === 'football' ? footballLoading : sportLoading[activeSport], [activeSport, footballLoading, sportLoading]);
  const navigate = useNavigate();
  const activeLeagueTabLabel = useMemo(() => FOOTBALL_LEAGUE_TABS.find((t) => t.key === activeLeagueTab)?.label ?? activeLeagueTab, [activeLeagueTab]);

  function renderSection(title: string, matches: EnrichedMatch[], opts: { isLive?: boolean } = {}, startIdx: number): { node: React.ReactNode; count: number } {
    if (matches.length === 0) return { node: null, count: 0 };
    const grouped = new Map<string, EnrichedMatch[]>();
    for (const m of matches) { const key = m.league || '(Other)'; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key)!.push(m); }
    const sortedGroups = [...grouped.entries()].sort(([a], [b]) => leagueSortKey(a).localeCompare(leagueSortKey(b)));
    let rowIdx = startIdx;
    const rows: React.ReactNode[] = [];
    for (const [league, lm] of sortedGroups) {
      rows.push(<div key={`lhdr-${league}`} className="cm-league-hdr"><span className="cm-league-name">{league}</span><span className="cm-league-cnt">{lm.length}</span></div>);
      for (const m of lm) {
        const isMatchLive = LIVE_STATUSES.has(m.status ?? '');
        rows.push(
          <CompactMatchRow
            key={m.id}
            match={m}
            hasDraw={showDraw}
            onClick={isMatchLive ? undefined : () => navigate(`/match/${m.id}`)}
            matchIndex={rowIdx + 1}
          />
        );
        rowIdx++;
      }
    }
    return {
      node: (
        <div className={`cmsec${opts.isLive ? ' live-section' : ''}`}>
          <div className="cmsec-hdr">
            <span className="cmsec-title">
              {opts.isLive && <FiberManualRecordIcon sx={{ fontSize:10, color:'var(--live-green,#22c55e)' }} />}
              {title} <span className="cmsec-cnt">({matches.length})</span>
            </span>
            {opts.isLive && (
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(239,68,68,0.8)', fontWeight:700, fontFamily:'system-ui,sans-serif' }}>
                <LockIcon sx={{ fontSize: 11 }} /> Odds locked during live play
              </span>
            )}
          </div>
          <div className="cmsec-col-hdr">
            <div style={{ flex:1 }} />
            {showDraw ? ['1','X','2'].map((h) => <div key={h} className="cmsec-col-lbl">{h}</div>) : ['1','2'].map((h) => <div key={h} className="cmsec-col-lbl">{h}</div>)}
            <div style={{ width:28 }} />
          </div>
          {rows}
        </div>
      ),
      count: rowIdx - startIdx,
    };
  }

  const handleRetry = () => { if (activeSport === 'football') fetchFootball(false); else { loadedSports.current.delete(activeSport); fetchSport(activeSport, false); } };
  let globalIdx = 0;

  return (
    <div className="px-4 mt-4">
      <GrandPrizeWinnersBar />

      {/* Sport tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {SPORT_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveSport(tab.key)} className={`sport-tab${activeSport === tab.key ? ' active' : ''}`}>{tab.icon}{tab.label}</button>
        ))}
      </div>

      {/* League sub-tabs */}
      {activeSport === 'football' && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {FOOTBALL_LEAGUE_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveLeagueTab(tab.key)} className={`league-tab${activeLeagueTab === tab.key ? ' active' : ''}`}>{tab.label}</button>
          ))}
        </div>
      )}

      {isFallback && !isLoading && <FallbackNotice tabLabel={activeLeagueTabLabel} />}

      {/* Special Games */}
      {activeSport === 'football' && (
        <SpecialGamesSection onAdminFingerprintsChange={setAdminFingerprints} hasDraw={showDraw} globalIndexStart={globalIdx} />
      )}

      {/* Matches */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>{error}</p>
          <button onClick={handleRetry} className="mt-3 text-xs font-semibold hover:underline" style={{ color:'var(--primary)' }}>Try again</button>
        </div>
      ) : isLoading ? (
        <div className="cmsec">
          <div className="cmsec-hdr"><div className="skeleton-block" style={{ width:90, height:14, borderRadius:4 }} /></div>
          <div className="cmsec-col-hdr"><div style={{ flex:1 }} />{['1','X','2'].map((h) => <div key={h} className="cmsec-col-lbl">{h}</div>)}<div style={{ width:28 }} /></div>
          {[0,1,2,3,4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
          {(() => {
            const liveR    = renderSection('Live Now', grouped.live,     { isLive: true }, globalIdx); globalIdx += liveR.count;
            const todayR   = renderSection('Today',    grouped.today,    {},               globalIdx); globalIdx += todayR.count;
            const upcomingR = renderSection('Upcoming', grouped.upcoming, {},              globalIdx);
            return <>{liveR.node}{todayR.node}{upcomingR.node}</>;
          })()}
          {allMatches.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">{activeSport === 'football' ? '⚽' : activeSport === 'basketball' ? '🏀' : activeSport === 'tennis' ? '🎾' : activeSport === 'baseball' ? '⚾' : activeSport === 'nfl' ? '🏈' : '🥊'}</div>
              <p className="text-sm" style={{ color:'var(--text-muted)' }}>No {SPORT_TABS.find((t) => t.key === activeSport)?.label} matches available right now.</p>
            </div>
          )}
        </>
      )}

      {/* ── Supporters Carousel ── */}
      <SupportersCarousel />

      {/* ── Footer ── */}
      <SiteFooter />

      <FloatingBetSlipButton />

      <style>{`
        /* ═══════════════════════════════════════════════
           SECTION CONTAINER
        ═══════════════════════════════════════════════ */
        .cmsec {
          margin-bottom: 14px;
          border-radius: 12px;
          overflow: hidden;
          border: 1.5px solid rgba(34,197,94,0.18);
          background: var(--card-bg, rgba(13,20,34,0.98));
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        }
        .cmsec.special {
          border-color: rgba(245,166,35,0.3);
          box-shadow: 0 2px 16px rgba(245,166,35,0.08);
        }
        .cmsec.live-section {
          border-color: rgba(34,197,94,0.35);
          box-shadow: 0 2px 16px rgba(34,197,94,0.1);
        }

        .cmsec-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 12px 9px;
          background: rgba(34,197,94,0.06);
          border-bottom: 1.5px solid rgba(34,197,94,0.15);
        }
        .cmsec.special .cmsec-hdr {
          background: rgba(245,166,35,0.07);
          border-bottom-color: rgba(245,166,35,0.2);
        }
        .cmsec-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          color: var(--text-main, #e2e8f0);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-family: system-ui, sans-serif;
        }
        .cmsec-cnt {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #64748b);
          letter-spacing: 0;
        }

        .cmsec-col-hdr {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1.5px solid rgba(34,197,94,0.1);
          gap: 3px;
        }
        .cmsec-col-lbl {
          width: 52px;
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          color: #22c55e;
          letter-spacing: 0.07em;
          flex-shrink: 0;
        }
        @media (max-width: 380px) {
          .cmsec-col-lbl { width: 44px; font-size: 10px; }
        }

        .cm-league-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 12px;
          background: rgba(34,197,94,0.04);
          border-bottom: 1px solid rgba(34,197,94,0.08);
        }
        .cm-league-name {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted, #94a3b8);
          letter-spacing: 0.03em;
          font-family: system-ui, sans-serif;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1;
          margin-right: 8px;
        }
        .cm-league-cnt {
          font-size: 10px;
          color: var(--text-faint, #475569);
          font-family: system-ui, sans-serif;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 10px;
          padding: 1px 7px;
          flex-shrink: 0;
        }

        /* ═══════════════════════════════════════════════
           MATCH ROW
        ═══════════════════════════════════════════════ */
        .cmr {
          display: flex;
          align-items: center;
          padding: 9px 8px 9px 10px;
          gap: 6px;
          border-bottom: 1px solid rgba(34,197,94,0.09);
          cursor: pointer;
          transition: background 0.12s ease;
          min-height: 60px;
          width: 100%;
          box-sizing: border-box;
        }
        .cmr:last-child { border-bottom: none; }
        .cmr:hover { background: rgba(34,197,94,0.05); }
        .cmr.live { background: rgba(34,197,94,0.04); border-left: 3px solid #22c55e; padding-left: 7px; }
        .cmr.live:hover { background: rgba(34,197,94,0.04); }
        .cmr.no-pointer { cursor: default !important; }
        .cmr.admin { background: rgba(245,166,35,0.04); border-left: 3px solid #f5a623; padding-left: 7px; }

        .cmr-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          width: 54px;
          min-width: 54px;
          flex-shrink: 0;
        }
        .cmr-time {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-main, #e2e8f0);
          font-family: system-ui, sans-serif;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .cmr-id {
          font-size: 9px;
          color: rgba(34,197,94,0.55);
          font-family: system-ui, sans-serif;
          font-weight: 600;
        }
        .cmr-sport {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-faint, #475569);
          letter-spacing: 0.04em;
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 54px;
        }
        .cmr-live {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 900;
          color: #22c55e;
          font-family: system-ui, sans-serif;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .cmr-star { font-size: 12px; color: #f5a623; }

        .cmr-teams {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          overflow: hidden;
        }
        .cmr-team {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          width: 100%;
        }
        .cmr-score {
          font-size: 14px;
          font-weight: 900;
          color: #22c55e;
          min-width: 14px;
          flex-shrink: 0;
          font-family: system-ui, sans-serif;
        }
        .cmr-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main, #e2e8f0);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: system-ui, sans-serif;
          line-height: 1.3;
          flex: 1;
          min-width: 0;
        }
        .cmr-countdown {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: var(--text-faint, #475569);
          margin-top: 1px;
          font-family: system-ui, sans-serif;
          white-space: nowrap;
        }

        /* ═══════════════════════════════════════════════
           ODDS BUTTONS
        ═══════════════════════════════════════════════ */
        .cmr-odds {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-shrink: 0;
        }

        .cmr-odds-locked {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          width: 162px;
          height: 44px;
          border-radius: 8px;
          border: 1.5px solid rgba(239,68,68,0.25);
          background: rgba(239,68,68,0.06);
          flex-shrink: 0;
        }
        .cmr-locked-label {
          font-size: 9px;
          font-weight: 800;
          color: rgba(239,68,68,0.65);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-family: system-ui, sans-serif;
        }
        @media (max-width: 380px) {
          .cmr-odds-locked { width: 134px; }
        }

        .cmr-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 44px;
          border-radius: 7px;
          border: 1.5px solid rgba(34,197,94,0.35);
          background: rgba(34,197,94,0.08);
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, transform 0.08s;
          flex-shrink: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .cmr-btn:hover:not(.empty):not(.sel) {
          background: rgba(34,197,94,0.16);
          border-color: rgba(34,197,94,0.6);
        }
        .cmr-btn:active:not(.empty):not(.sel) { transform: scale(0.94); }
        .cmr-btn.sel {
          background: rgba(34,197,94,0.22);
          border-color: #22c55e;
          box-shadow: 0 0 0 2px rgba(34,197,94,0.2);
        }
        .cmr-btn.empty {
          opacity: 0.28;
          cursor: default;
          border-color: rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .cmr-btn-label {
          font-size: 9px;
          font-weight: 800;
          color: rgba(34,197,94,0.65);
          letter-spacing: 0.07em;
          font-family: system-ui, sans-serif;
          line-height: 1;
        }
        .cmr-btn-val {
          font-size: 13px;
          font-weight: 800;
          color: #22c55e;
          font-family: system-ui, sans-serif;
          letter-spacing: -0.01em;
          line-height: 1.2;
          margin-top: 2px;
        }
        .cmr-btn.sel .cmr-btn-label { color: rgba(34,197,94,0.9); }
        .cmr-btn.sel .cmr-btn-val { color: #4ade80; }
        .cmr-btn.empty .cmr-btn-val { color: var(--text-faint, #475569); }

        @media (max-width: 380px) {
          .cmr { padding: 8px 6px 8px 8px; gap: 4px; }
          .cmr.live, .cmr.admin { padding-left: 5px; }
          .cmr-left { width: 48px; min-width: 48px; }
          .cmr-time { font-size: 12px; }
          .cmr-name { font-size: 12px; }
          .cmr-btn { width: 44px; height: 40px; border-radius: 6px; }
          .cmr-btn-val { font-size: 12px; }
          .cmr-odds { gap: 2px; }
          .cmr-stats { width: 26px; height: 26px; }
        }

        .cmr-stats {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          border: 1.5px solid rgba(34,197,94,0.2);
          background: rgba(34,197,94,0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(34,197,94,0.45);
          flex-shrink: 0;
          transition: background 0.1s, color 0.1s, border-color 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .cmr-stats:hover {
          background: rgba(34,197,94,0.12);
          color: #22c55e;
          border-color: rgba(34,197,94,0.4);
        }
      `}</style>
    </div>
  );
}