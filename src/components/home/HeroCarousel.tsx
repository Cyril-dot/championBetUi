import BoltIcon from '@mui/icons-material/Bolt';

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap';
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
    font-family: 'Open Sans', sans-serif;
    background: #0d0d0d;
    height: clamp(150px, 20vw, 240px);
  }

  .wb-promo-left {
    position: relative;
    z-index: 2;
    width: 40%;
    min-width: 280px;
    background: #cc0000;
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

const FONT = "'Open Sans', sans-serif";

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

        {/* brand */}
        <div style={{ lineHeight: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 'clamp(1rem, 2.6vw, 1.35rem)', color: '#fff', letterSpacing: '-0.01em' }}>winning</span>
          <span style={{ fontWeight: 800, fontSize: 'clamp(1rem, 2.6vw, 1.35rem)', color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em' }}>bet</span>
        </div>

        {/* headline */}
        <h2 style={{
          margin: 0, fontWeight: 800,
          fontSize: 'clamp(1.3rem, 3.6vw, 2.1rem)',
          color: '#fff', letterSpacing: '0.01em', lineHeight: 1,
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
              background: '#fff', color: '#cc0000',
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
            el.style.background = '#cc0000';
            el.style.borderColor = '#cc0000';
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