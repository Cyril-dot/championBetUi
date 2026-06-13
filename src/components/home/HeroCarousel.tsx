import BoltIcon from '@mui/icons-material/Bolt';

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap';
document.head.appendChild(fontLink);

const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes livePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(0.85); }
  }

  .wb-promo-banner {
    margin: 12px;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    font-family: 'Inter', sans-serif;
    background: #0d0d0d;
    height: clamp(150px, 20vw, 240px);
  }

  .wb-promo-left {
    position: relative;
    z-index: 2;
    width: 40%;
    min-width: 280px;
    background: #E8000D;
    clip-path: polygon(0 0, 100% 0, 90% 100%, 0 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: clamp(16px, 2.2vw, 28px) clamp(20px, 3vw, 40px);
  }

  .wb-promo-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: clamp(14px, 2vw, 22px) clamp(16px, 2.2vw, 28px);
    z-index: 1;
  }

  @media (max-width: 520px) {
    .wb-promo-banner {
      flex-direction: column;
      height: auto;
      margin: 8px;
    }

    .wb-promo-left {
      width: 100%;
      min-width: unset;
      clip-path: none;
      border-radius: 0;
      padding: 20px;
      gap: 12px;
    }

    .wb-promo-right {
      justify-content: flex-start;
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
  }
`;
document.head.appendChild(styleTag);

const FONT = "'Inter', sans-serif";

// ─── CB Monogram SVG (matches Header exactly) ────────────────────────────────
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
      {/* C — bold open arc */}
      <path
        d="M16 6.5C12.2 6.5 8.5 9.2 8.5 14C8.5 18.8 12.2 21.5 16 21.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* B — vertical stem */}
      <line
        x1="16" y1="6.5" x2="16" y2="21.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* B — upper arc */}
      <path
        d="M16 6.5H19.5C21.4 6.5 22.8 7.8 22.8 9.6C22.8 11.4 21.4 13 19.5 13H16"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* B — lower arc */}
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

// ─── ChampionBet Logo (matches Header exactly) ───────────────────────────────
function ChampionBetLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }} aria-label="CHAMPIONBET">
      {/* Monogram badge */}
      <div style={{
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
      }}>
        <CBMark size={24} />
      </div>

      {/* Stacked wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 0 }}>
        <span style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontStyle: 'italic',
          fontSize: '0.72rem',
          letterSpacing: '0.26em',
          color: 'rgba(255,255,255,0.90)',
          textTransform: 'uppercase',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          Champion
        </span>
        <span style={{
          fontFamily: FONT,
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
        }}>
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
  );
}

export default function PromoBanner() {
  return (
    <div className="wb-promo-banner">
      {/* ── Red left panel with diagonal clip ── */}
      <div className="wb-promo-left">
        {/* live dot + tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
            flexShrink: 0, display: 'inline-block',
            animation: 'livePulse 1.4s ease-in-out infinite',
          }} />
          <span style={{
            fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.14em',
            textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.88)',
          }}>
            Best Odds Guaranteed
          </span>
        </div>

        {/* Logo — replaces old "winningbet" text */}
        <ChampionBetLogo />

        {/* headline */}
        <h2 style={{
          margin: 0, fontWeight: 800,
          fontSize: 'clamp(1.3rem, 3.6vw, 2.1rem)',
          color: '#fff', letterSpacing: '0.01em', lineHeight: 1,
          fontFamily: FONT,
          textShadow: '0 2px 10px rgba(0,0,0,0.25)',
        }}>
          Bet Smarter Today
        </h2>

        {/* CTA */}
        <div>
          <a
            href="/register"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 5,
              background: '#fff', color: '#E8000D',
              fontFamily: FONT, fontWeight: 800, fontSize: '0.74rem',
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              textDecoration: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ffe5e5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
          >
            <BoltIcon sx={{ fontSize: 13 }} />
            Bet Now
          </a>
        </div>

        {/* trust pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
          {['Trusted Odds', 'Fast Deposits', 'Daily Action'].map(tag => (
            <span key={tag} style={{
              fontWeight: 600, fontSize: '0.53rem', letterSpacing: '0.07em',
              textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.78)',
              background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 3, padding: '2px 8px',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Dark right side ── */}
      <div className="wb-promo-right">
        <a
          href="/register"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 26px', borderRadius: 50,
            background: 'transparent', color: '#fff',
            fontFamily: FONT, fontWeight: 800, fontSize: '0.8rem',
            letterSpacing: '0.14em', textTransform: 'uppercase' as const,
            textDecoration: 'none', border: '2px solid rgba(255,255,255,0.55)',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = '#E8000D';
            el.style.borderColor = '#E8000D';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'transparent';
            el.style.borderColor = 'rgba(255,255,255,0.55)';
          }}
        >
          Bet Now
        </a>
      </div>
    </div>
  );
}