import { useState, useEffect, useCallback } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

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
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (max-width: 480px) {
    .carousel-left-panel { width: 100% !important; padding: 14px 16px !important; }
    .carousel-right-panel { display: none !important; }
    .carousel-winner-title { font-size: clamp(1.6rem, 10vw, 2.4rem) !important; line-height: 1 !important; }
    .carousel-cta-btn { padding: 10px 20px !important; font-size: 0.78rem !important; }
    .carousel-pills { display: none !important; }
    .carousel-bottom-controls { display: flex !important; }
    .carousel-mobile-counter { display: flex !important; }
  }
  @media (max-width: 360px) {
    .carousel-winner-title { font-size: 1.5rem !important; }
    .carousel-promo-tag { font-size: 0.55rem !important; }
  }
  @media (min-width: 481px) and (max-width: 768px) {
    .carousel-left-panel { width: 65% !important; }
    .carousel-right-panel { width: 35% !important; }
    .carousel-winner-title { font-size: clamp(1.6rem, 5.5vw, 2.8rem) !important; }
  }
  @media (hover: none) and (pointer: coarse) {
    .carousel-nav-btn { width: 42px !important; height: 42px !important; }
  }
`;
document.head.appendChild(styleTag);

const FlagEngland = () => (
  <svg width="22" height="15" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="white"/>
    <rect x="24" width="12" height="40" fill="#CC0000"/>
    <rect y="14" width="60" height="12" fill="#CC0000"/>
  </svg>
);
const FlagSpain = () => (
  <svg width="22" height="15" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#c60b1e"/>
    <rect y="10" width="60" height="20" fill="#ffc400"/>
  </svg>
);
const FlagGermany = () => (
  <svg width="22" height="15" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#000"/>
    <rect y="13.3" width="60" height="13.3" fill="#DD0000"/>
    <rect y="26.6" width="60" height="13.4" fill="#FFCE00"/>
  </svg>
);
const FlagItaly = () => (
  <svg width="22" height="15" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#CE2B37"/>
    <rect width="40" height="40" fill="#fff"/>
    <rect width="20" height="40" fill="#009246"/>
  </svg>
);
const FlagFrance = () => (
  <svg width="22" height="15" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#ED2939"/>
    <rect width="40" height="40" fill="#fff"/>
    <rect width="20" height="40" fill="#002395"/>
  </svg>
);
const FlagEurope = () => (
  <svg width="22" height="15" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="40" fill="#003399"/>
    {[0,1,2,3,4,5,6,7,8,9,10,11].map((n) => {
      const angle = (n * 30 - 90) * (Math.PI / 180);
      const cx = 30 + 11 * Math.cos(angle);
      const cy = 20 + 11 * Math.sin(angle);
      return <circle key={n} cx={cx} cy={cy} r="2" fill="#FFDD00" />;
    })}
  </svg>
);

const leagueBadge: Record<string, { bg: string; text: string; label: string }> = {
  'Premier League':        { bg: '#38003c', text: '#00ff85', label: 'PL' },
  'La Liga':               { bg: '#ff4b1f', text: '#ffffff', label: 'LL' },
  'Bundesliga':            { bg: '#d3010c', text: '#ffd700', label: 'BL' },
  'Serie A':               { bg: '#1a1a6e', text: '#ffffff', label: 'SA' },
  'Ligue 1':               { bg: '#daa520', text: '#091c3e', label: 'L1' },
  'UEFA Champions League': { bg: '#0a1172', text: '#c0a020', label: 'UCL' },
};

const slides = [
  {
    league: 'Premier League', country: 'England', Flag: FlagEngland,
    winner: 'Arsenal', season: '2025/26 Champions', promoTag: 'Bet on the champions',
    image: 'https://platform.theshortfuse.sbnation.com/wp-content/uploads/sites/165/2025/08/gettyimages-2229282520.jpg?quality=90&strip=all&crop=0,8.8902317441006,100,82.219536511799',
    isPending: false,
  },
  {
    league: 'La Liga', country: 'Spain', Flag: FlagSpain,
    winner: 'FC Barcelona', season: '2025/26 Champions', promoTag: 'Best odds guaranteed',
    image: 'https://platform.barcablaugranes.com/wp-content/uploads/sites/21/2026/05/gettyimages-2275040752.jpg?quality=90&strip=all&crop=0%2C0.02498750624688%2C100%2C99.950024987506&w=2400',
    isPending: false,
  },
  {
    league: 'Bundesliga', country: 'Germany', Flag: FlagGermany,
    winner: 'Bayern Munich', season: '2025/26 Champions', promoTag: 'Fast payouts daily',
    image: 'https://img.fcbayern.com/image/upload/f_auto/q_auto/t_cms-16x9-seo/v1770575366/cms/public/images/fcbayern-com/homepage/Saison-25-26/Galerien/Spiele/fcb-hoffenheim/04-fcbayern-hoffenheim-260208-mel.jpg',
    isPending: false,
  },
  {
    league: 'Serie A', country: 'Italy', Flag: FlagItaly,
    winner: 'Inter Milan', season: '2025/26 Champions', promoTag: 'Trusted odds, every match',
    image: 'https://img.fcbayern.com/image/upload/f_auto/q_auto/t_cms-4x3-seo-thumbnail/v1741682360/cms/public/images/fcbayern-com/homepage/Saison-24-25/Gegnerteams/Inter%20Mailand/inter-mailand-viertelfinale-champions-league-gegner-ima.jpg',
    isPending: false,
  },
  {
    league: 'Ligue 1', country: 'France', Flag: FlagFrance,
    winner: 'Paris Saint-Germain', season: '2025/26 Champions', promoTag: 'Live markets open now',
    image: 'https://assets.goal.com/images/v3/bltea264cd9dfaab053/GOAL%20-%20Blank%20WEB%20-%20Facebook%20(25).jpg?auto=webp&format=pjpg&width=3840&quality=60',
    isPending: false,
  },
  {
    league: 'UEFA Champions League', country: 'Europe', Flag: FlagEurope,
    winner: 'Final: PSG vs Arsenal', season: 'May 30, 2026 · Budapest', promoTag: 'Place your final bet now',
    image: 'https://editorial.uefa.com/resources/0298-1da13f6acf3e-760def7d0dbf-1000/ucl_24x27_-_h2h_-_facebook.jpeg',
    isPending: true,
  },
];

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function LeagueWinnersCarousel() {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(slides.map(() => false));
  const [paused, setPaused] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 480;
  const isTablet = windowWidth > 480 && windowWidth <= 768;

  const goTo = useCallback((index: number) => { setCurrent(index); setAnimKey(k => k + 1); }, []);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const handleLoad = (i: number) => {
    setLoaded(prev => { const n = [...prev]; n[i] = true; return n; });
  };

  const handleTouchStart = (e: React.TouchEvent) => { setTouchStartX(e.touches[0].clientX); setPaused(true); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
    setTouchStartX(null); setPaused(false);
  };

  const slide = slides[current];
  const badge = leagueBadge[slide.league];
  const { Flag } = slide;

  const FONT_DISPLAY = "'Open Sans', sans-serif";
  const FONT_BODY    = "'Open Sans', sans-serif";

  const carouselMinHeight = isMobile
    ? 'clamp(280px, 85vw, 400px)'
    : isTablet ? 'clamp(220px, 42vw, 360px)' : 'clamp(210px, 38vw, 400px)';

  const leftPanelWidth  = isMobile ? '100%' : isTablet ? '65%' : '58%';
  const rightPanelWidth = isMobile ? '0'    : isTablet ? '35%' : '42%';

  return (
    <div
      className="relative mx-3 sm:mx-4 mt-3 sm:mt-4 overflow-hidden"
      style={{ minHeight: carouselMinHeight }}
      onMouseEnter={() => !isMobile && setPaused(true)}
      onMouseLeave={() => !isMobile && setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── BACKGROUND SLIDES ── */}
      {slides.map((s, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === current ? 1 : 0, zIndex: 0 }}>
          <div className="absolute inset-0" style={{ background: '#080808' }} />
          <img
            src={s.image} alt="" aria-hidden="true" onLoad={() => handleLoad(i)}
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ opacity: loaded[i] ? 1 : 0, transition: 'opacity 0.6s' }}
          />
        </div>
      ))}

      {/* ── OVERLAYS ── */}
      {isMobile ? (
        <>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,4,6,0.97) 0%, rgba(4,4,6,0.90) 30%, rgba(4,4,6,0.45) 58%, rgba(0,0,0,0.10) 80%, rgba(0,0,0,0.0) 100%)', zIndex: 1 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 60%)', zIndex: 1 }} />
          <div className="absolute inset-x-0 top-0" style={{ height: '20%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, transparent 100%)', zIndex: 1 }} />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(4,4,6,0.97) 0%, rgba(6,6,10,0.93) 28%, rgba(8,8,14,0.75) 52%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0.0) 100%)', zIndex: 1 }} />
          <div className="absolute inset-x-0 bottom-0" style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)', zIndex: 1 }} />
          <div className="absolute inset-x-0 top-0" style={{ height: '30%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, transparent 100%)', zIndex: 1 }} />
        </>
      )}

      {/* Red left accent bar */}
      <div className="absolute inset-y-0 left-0" style={{ width: 4, background: 'linear-gradient(to bottom, #ff2030, #a0000a)', zIndex: 3 }} />

      {/* ── MAIN CONTENT ── */}
      <div className="absolute inset-0 flex" style={{ zIndex: 2 }}>

        {/* LEFT PANEL */}
        <div
          className="carousel-left-panel flex flex-col justify-between"
          style={{
            width: leftPanelWidth, minWidth: 0,
            padding: isMobile ? '14px 16px' : isTablet ? 'clamp(14px, 3vw, 28px)' : 'clamp(16px, 3.5vw, 36px)',
            justifyContent: isMobile ? 'flex-end' : 'space-between',
          }}
        >
          {!isMobile && (
            <div className="flex items-center gap-2">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0, animation: 'livePulse 1.4s ease-in-out infinite' }} />
              <span className="carousel-promo-tag" style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.55)' }}>
                {slide.promoTag}
              </span>
            </div>
          )}

          <div key={animKey} className="flex flex-col my-auto" style={{ gap: isMobile ? '6px' : 'clamp(6px, 1.2vw, 14px)', paddingBlock: isMobile ? '8px 10px' : 'clamp(10px,2vw,20px)', animation: 'slideIn 0.45s ease both' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: badge.bg, color: badge.text, fontSize: '0.58rem', fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: '0.06em', height: 19, padding: '0 7px', borderRadius: 3, border: `1px solid ${badge.text}44`, flexShrink: 0 }}>
                <SportsSoccerIcon style={{ fontSize: 9 }} />
                {badge.label}
              </div>
              <div className="rounded-sm overflow-hidden" style={{ lineHeight: 0, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}><Flag /></div>
              <span style={{ fontFamily: FONT_BODY, fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.55)' }}>
                {slide.country} · {isMobile ? badge.label : slide.league}
              </span>
            </div>

            <div style={{ width: 40, height: 2, background: '#e8000f', borderRadius: 1, opacity: 0.85 }} />

            <h2 className="carousel-winner-title" style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: isMobile ? 'clamp(1.6rem, 9vw, 2.3rem)' : isTablet ? 'clamp(1.6rem, 5.5vw, 2.8rem)' : 'clamp(1.8rem, 6vw, 3.4rem)', color: '#ffffff', letterSpacing: '0.03em', lineHeight: 0.95, margin: 0, textShadow: '0 2px 18px rgba(0,0,0,0.65)' }}>
              {slide.winner}
            </h2>

            {slide.isPending ? (
              <div className="flex items-center gap-1.5">
                <SportsSoccerIcon style={{ fontSize: 12, color: '#e8000f' }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: '#ff6b74' }}>{slide.season}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <EmojiEventsIcon style={{ fontSize: 12, color: '#ffd700' }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.65)' }}>{slide.season}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <a
                href="/register"
                className="carousel-cta-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '10px 18px' : '9px 22px', borderRadius: 5, background: '#e8000f', color: '#fff', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: isMobile ? '0.76rem' : '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', transition: 'background 0.15s', boxShadow: '0 3px 14px rgba(232,0,15,0.55)', flexShrink: 0 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#ff1a27'; el.style.boxShadow = '0 5px 22px rgba(232,0,15,0.78)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#e8000f'; el.style.boxShadow = '0 3px 14px rgba(232,0,15,0.55)'; }}
              >
                <BoltIcon sx={{ fontSize: 15 }} />
                Bet Now
              </a>

              {isMobile && (
                <div className="flex items-center gap-2 ml-auto">
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.06em', marginRight: 4 }}>
                    <span style={{ color: '#fff', fontSize: '0.9rem' }}>{String(current + 1).padStart(2, '0')}</span>
                    <span style={{ margin: '0 2px' }}>/</span>
                    <span>{String(slides.length).padStart(2, '0')}</span>
                  </span>
                  <button onClick={prev} aria-label="Previous slide" className="carousel-nav-btn" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ChevronLeftIcon style={{ fontSize: 17 }} />
                  </button>
                  <button onClick={next} aria-label="Next slide" className="carousel-nav-btn" style={{ width: 34, height: 34, borderRadius: '50%', background: '#e8000f', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(232,0,15,0.55)' }}>
                    <ChevronRightIcon style={{ fontSize: 17 }} />
                  </button>
                </div>
              )}
            </div>

            {!isMobile && (
              <div className="carousel-pills flex flex-wrap gap-1.5">
                {['Trusted Odds', 'Fast Deposits', 'Daily Action'].map(tag => (
                  <span key={tag} style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: '0.57rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.55)', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '2px 8px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        {!isMobile && (
          <div className="carousel-right-panel ml-auto flex flex-col items-end justify-between" style={{ width: rightPanelWidth, minWidth: 0, padding: isTablet ? 'clamp(12px, 2.5vw, 24px)' : 'clamp(12px, 2.5vw, 28px)' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.40)' }}>
              <span style={{ color: '#ffffff', fontSize: '1rem' }}>{String(current + 1).padStart(2, '0')}</span>
              <span style={{ margin: '0 3px' }}>/</span>
              <span>{String(slides.length).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prev} aria-label="Previous slide" className="carousel-nav-btn" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#e8000f'; el.style.borderColor = '#e8000f'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.08)'; el.style.borderColor = 'rgba(255,255,255,0.22)'; }}
              >
                <ChevronLeftIcon style={{ fontSize: 18 }} />
              </button>
              <button onClick={next} aria-label="Next slide" className="carousel-nav-btn" style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8000f', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 10px rgba(232,0,15,0.55)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ff1a27'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#e8000f'; }}
              >
                <ChevronRightIcon style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PROGRESS BAR ── */}
      <div className="absolute inset-x-0 bottom-0 flex" style={{ zIndex: 4, height: isMobile ? 4 : 3, gap: 2, padding: '0 2px' }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`} style={{ flex: 1, height: '100%', border: 'none', cursor: 'pointer', padding: 0, borderRadius: 2, background: i === current ? '#e8000f' : 'rgba(255,255,255,0.18)', transition: 'background 0.3s', minHeight: isMobile ? 20 : undefined }} />
        ))}
      </div>
    </div>
  );
}