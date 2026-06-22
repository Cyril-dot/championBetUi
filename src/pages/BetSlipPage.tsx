import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { calculateTotalOdds, calculatePotentialReturn } from '../utils';
import { bets as betsApi, booking, wallet as walletApi, publicFootball as publicMatches } from '../utils/api';
import type { Bet, BetSelection } from '../utils/api';
import html2canvas from 'html2canvas';

import ReceiptLongIcon          from '@mui/icons-material/ReceiptLong';
import HistoryIcon              from '@mui/icons-material/History';
import DeleteIcon               from '@mui/icons-material/Delete';
import CloseIcon                from '@mui/icons-material/Close';
import CircularProgress         from '@mui/icons-material/Loop';
import RefreshIcon              from '@mui/icons-material/Refresh';
import LoginIcon                from '@mui/icons-material/Login';
import QrCodeIcon               from '@mui/icons-material/QrCode';
import SportsSoccerIcon         from '@mui/icons-material/SportsSoccer';
import CheckCircleIcon          from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon         from '@mui/icons-material/InfoOutlined';
import ShareIcon                from '@mui/icons-material/Share';
import DownloadIcon             from '@mui/icons-material/Download';
import PublicIcon               from '@mui/icons-material/Public';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon           from '@mui/icons-material/TrendingUp';

// ─── Currency detection ───────────────────────────────────────────────────────
export interface CurrencyInfo {
  code: string; symbol: string; name: string; countryCode: string; rateFromGhs: number;
}

const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  GH: { code: 'GHS', symbol: 'GH₵',  name: 'Ghanaian Cedi' },
  NG: { code: 'NGN', symbol: '₦',     name: 'Nigerian Naira' },
  KE: { code: 'KES', symbol: 'KSh',   name: 'Kenyan Shilling' },
  TZ: { code: 'TZS', symbol: 'TSh',   name: 'Tanzanian Shilling' },
  UG: { code: 'UGX', symbol: 'USh',   name: 'Ugandan Shilling' },
  ZA: { code: 'ZAR', symbol: 'R',     name: 'South African Rand' },
  EG: { code: 'EGP', symbol: 'E£',    name: 'Egyptian Pound' },
  ET: { code: 'ETB', symbol: 'Br',    name: 'Ethiopian Birr' },
  SN: { code: 'XOF', symbol: 'CFA',   name: 'West African CFA Franc' },
  CI: { code: 'XOF', symbol: 'CFA',   name: 'West African CFA Franc' },
  CM: { code: 'XAF', symbol: 'FCFA',  name: 'Central African CFA Franc' },
  ZM: { code: 'ZMW', symbol: 'ZK',    name: 'Zambian Kwacha' },
  ZW: { code: 'ZWL', symbol: 'Z$',    name: 'Zimbabwean Dollar' },
  RW: { code: 'RWF', symbol: 'FRw',   name: 'Rwandan Franc' },
  MW: { code: 'MWK', symbol: 'MK',    name: 'Malawian Kwacha' },
  MZ: { code: 'MZN', symbol: 'MT',    name: 'Mozambican Metical' },
  GB: { code: 'GBP', symbol: '£',     name: 'British Pound' },
  DE: { code: 'EUR', symbol: '€',     name: 'Euro' },
  FR: { code: 'EUR', symbol: '€',     name: 'Euro' },
  IT: { code: 'EUR', symbol: '€',     name: 'Euro' },
  ES: { code: 'EUR', symbol: '€',     name: 'Euro' },
  US: { code: 'USD', symbol: '$',     name: 'US Dollar' },
  CA: { code: 'CAD', symbol: 'CA$',   name: 'Canadian Dollar' },
  AU: { code: 'AUD', symbol: 'A$',    name: 'Australian Dollar' },
};

export const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', countryCode: 'GH', rateFromGhs: 1,
};

let _currencyCache: CurrencyInfo | null = null;
let _currencyInflight: Promise<CurrencyInfo> | null = null;

async function detectCurrencyInfo(): Promise<CurrencyInfo> {
  if (_currencyCache) return _currencyCache;
  if (_currencyInflight) return _currencyInflight;
  _currencyInflight = (async (): Promise<CurrencyInfo> => {
    let countryCode = '';
    try { const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) }); if (r.ok) countryCode = (await r.json()).country_code ?? ''; } catch {}
    if (!countryCode) { try { const r = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) }); if (r.ok) countryCode = (await r.json()).countryCode ?? ''; } catch {} }
    if (!countryCode) { try { const r = await fetch('https://ip.guide/', { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } }); if (r.ok) countryCode = (await r.json()).location?.country_code ?? ''; } catch {} }
    const localMeta = countryCode ? COUNTRY_CURRENCY[countryCode] : undefined;
    if (!localMeta) { _currencyCache = DEFAULT_CURRENCY; return _currencyCache; }
    let rateFromGhs = 1;
    if (localMeta.code !== 'GHS') {
      try { const r = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(5000) }); if (r.ok) { const d = await r.json(); rateFromGhs = d.rates?.[localMeta.code] ?? 1; } } catch {}
      if (rateFromGhs === 1) { try { const r = await fetch(`https://api.exchangerate.host/convert?from=GHS&to=${localMeta.code}&amount=1`, { signal: AbortSignal.timeout(5000) }); if (r.ok) { const d = await r.json(); if (d.success && d.result) rateFromGhs = d.result; } } catch {} }
    }
    _currencyCache = { code: localMeta.code, symbol: localMeta.symbol, name: localMeta.name, countryCode, rateFromGhs };
    return _currencyCache;
  })();
  return _currencyInflight;
}

function formatLocal(amountInGhs: number, currency: CurrencyInfo): string {
  const converted = amountInGhs * currency.rateFromGhs;
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: currency.code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted); }
  catch { return `${currency.symbol}${converted.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
}

function localToGhs(localAmount: number, currency: CurrencyInfo): number {
  if (!currency.rateFromGhs) return localAmount;
  return localAmount / currency.rateFromGhs;
}

function ghsToLocal(ghsAmount: number, currency: CurrencyInfo): number {
  return ghsAmount * currency.rateFromGhs;
}

const MIN_STAKE_GHS = 300;

const DEBUG = (() => { try { return localStorage.getItem('CHAMPIONBET_DEBUG') === 'true'; } catch { return false; } })();
function log(area: string, ...args: unknown[]) { if (!DEBUG) return; console.log(`%c[ChampionBet:${area}]`, 'color:#dc2626;font-weight:bold', ...args); }
function logError(area: string, ...args: unknown[]) { console.error(`[ChampionBet:${area}]`, ...args); }

function buildMatchLabel(s: Record<string, unknown>): string {
  if (!s) return 'Unknown match';
  if (s.matchLabel)  return String(s.matchLabel);
  if (s.match_label) return String(s.match_label);
  if (s.match)       return String(s.match);
  const home = (s.homeTeam ?? s.home_team) as string | undefined;
  const away = (s.awayTeam ?? s.away_team) as string | undefined;
  if (home && away) return `${home} vs ${away}`;
  const id = (s.matchId ?? s.match_id ?? '') as string;
  return id ? `Match …${id.slice(-6)}` : 'Unknown match';
}

function extractOdds(sel: Record<string, unknown>): number {
  const candidates: Array<[string, unknown]> = [
    ['currentOdds', sel.currentOdds], ['oddsLocked', sel.oddsLocked],
    ['odds', sel.odds], ['value', sel.value], ['odd', sel.odd],
    ['price', sel.price], ['oddsValue', sel.oddsValue], ['rate', sel.rate],
  ];
  for (const [key, raw] of candidates) {
    const n = Number(raw);
    if (!isNaN(n) && n > 1) { log('extractOdds', `using "${key}" =`, n); return n; }
  }
  return 1;
}

function normaliseBet(bet: Bet): Bet {
  if (!bet) return bet;
  return {
    ...bet,
    placedAt:        bet.placedAt        ?? (bet as any).placed_at,
    settledAt:       bet.settledAt       ?? (bet as any).settled_at,
    totalOdds:       bet.totalOdds       ?? (bet as any).total_odds,
    potentialReturn: bet.potentialReturn ?? (bet as any).potential_return,
    selections: (bet.selections ?? []).map(s => ({
      ...s,
      oddsLocked: s.oddsLocked ?? (s as any).odds_locked ?? (s as any).odds ?? 1,
      homeTeam:   s.homeTeam   ?? (s as any).home_team,
      awayTeam:   s.awayTeam   ?? (s as any).away_team,
    })),
  };
}

// ─── Brand components ─────────────────────────────────────────────────────────
function ChampionBetLogoSvg({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r="26" fill="#dc2626" />
      <circle cx="28" cy="28" r="20" fill="none" stroke="white" strokeWidth="3" />
      <text x="28" y="31" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="Georgia,serif" fill="white" letterSpacing="-0.5">CH</text>
    </svg>
  );
}

function ChampionBetWordmarkDark({ size = 14 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', lineHeight: 1 }}>
      <span style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontWeight: 900, fontStyle: 'italic', fontSize: size, letterSpacing: '-0.02em', color: '#ffffff' }}>Champion</span>
      <span style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontWeight: 900, fontStyle: 'italic', fontSize: size, letterSpacing: '-0.02em', color: '#ef4444' }}>Bet</span>
    </span>
  );
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cfg: Record<string, string> = {
    won:        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    lost:       'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    pending:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    void:       'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    cashed_out: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${cfg[s] ?? cfg.pending}`}>{status.replace('_', ' ')}</span>;
}

function SelectionResult({ result }: { result?: string }) {
  if (!result) return null;
  return <span className={`text-xs font-semibold ml-1 ${result === 'WON' ? 'text-emerald-600' : 'text-rose-500'}`}>{result === 'WON' ? '✓' : '✗'}</span>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`} />;
}

function CurrencyPill({ currency, detecting }: { currency: CurrencyInfo; detecting: boolean }) {
  if (detecting) return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 animate-pulse"><PublicIcon sx={{ fontSize: 12 }} /> Detecting…</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
      <PublicIcon sx={{ fontSize: 12 }} />
      <span className="font-bold text-slate-700 dark:text-slate-300">{currency.code}</span>
      {currency.code !== 'GHS' && <span className="text-slate-400">· GH₵</span>}
    </span>
  );
}

function GuestPrompt({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-600/10 flex items-center justify-center mb-4"><LoginIcon className="text-red-600" sx={{ fontSize: 28 }} /></div>
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{message}</p>
      <p className="text-sm text-slate-400 mb-6">Sign in to get started</p>
      <Link to="/login" className="px-6 py-2.5 text-sm rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"><LoginIcon fontSize="small" /> Log In</Link>
      <Link to="/register" className="mt-3 text-sm text-red-600 font-medium hover:underline">Create account</Link>
    </div>
  );
}

// ─── Share slip image ─────────────────────────────────────────────────────────
async function generateSlipImage(bet: Bet, isWin: boolean, currency: CurrencyInfo): Promise<string> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:380px;background:#0f0f0f;border-radius:24px;overflow:hidden;font-family:Inter,sans-serif;';
  const payoutGhs = bet.potentialReturn;
  const headline = isWin ? formatLocal(payoutGhs, currency) : formatLocal(bet.stake, currency);
  const sub = currency.code !== 'GHS' ? (isWin ? `(GH₵${payoutGhs.toFixed(2)})` : `(GH₵${bet.stake.toFixed(2)})`) : '';
  container.innerHTML = `
    <style>*{box-sizing:border-box;margin:0;padding:0}</style>
    <div style="background:linear-gradient(135deg,#0f0f0f,#1a0000,#0f0f0f)">
      <div style="background:linear-gradient(90deg,#7f1d1d,#dc2626,#7f1d1d);padding:6px 20px;display:flex;align-items:center">
        <span style="font-size:13px;font-weight:900;font-family:Georgia,serif;font-style:italic;color:#fff">Champion<span style="color:#ef4444">Bet</span></span>
      </div>
      <div style="padding:24px;text-align:center">
        <div style="font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#ef4444;margin-bottom:8px">${isWin ? '🏆 YOU WON!' : '😭 BETTER LUCK NEXT TIME'}</div>
        <div style="font-size:36px;font-weight:900;color:#fff">${headline}</div>
        ${sub ? `<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">${sub}</div>` : ''}
      </div>
      <div style="background:rgba(255,255,255,0.05);margin:0 16px;border-radius:12px;overflow:hidden">
        ${bet.selections.map((sel, i) => `
          <div style="display:grid;grid-template-columns:20px 1fr 50px 56px;gap:0;padding:10px 12px;border-top:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:12px;font-weight:800;color:#ef4444">${i + 1}</span>
            <div>
              <div style="font-size:12px;font-weight:700;color:#fff">${sel.selection}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.4)">${sel.homeTeam && sel.awayTeam ? `${sel.homeTeam} vs ${sel.awayTeam}` : sel.matchId ?? ''}</div>
              <div style="font-size:9px;color:rgba(239,68,68,0.5)">${sel.market}</div>
            </div>
            <span style="font-size:12px;font-weight:800;color:#fff">${sel.oddsLocked.toFixed(2)}</span>
            <span style="font-size:11px;font-weight:800;color:${sel.result === 'WON' ? '#22c55e' : sel.result === 'LOST' ? '#ef4444' : '#94a3b8'}">${sel.result === 'WON' ? 'WON ✓' : sel.result === 'LOST' ? 'LOST ✗' : '—'}</span>
          </div>
        `).join('')}
      </div>
      <div style="padding:16px 24px;display:flex;justify-content:space-between">
        <div style="text-align:center;flex:1"><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">ODDS</div><div style="font-size:14px;font-weight:900;color:#ef4444">${bet.totalOdds.toFixed(2)}</div></div>
        <div style="text-align:center;flex:1"><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">STAKE</div><div style="font-size:14px;font-weight:900;color:#fff">${formatLocal(bet.stake, currency)}</div></div>
        <div style="text-align:center;flex:1"><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">PAYOUT</div><div style="font-size:14px;font-weight:900;color:#fff">${formatLocal(bet.potentialReturn, currency)}</div></div>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:10px 24px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:rgba(255,255,255,0.3)">${new Date(bet.placedAt).toLocaleString()}</div>
        <span style="font-size:12px;font-weight:900;font-family:Georgia,serif;font-style:italic;color:#fff">Champion<span style="color:#ef4444">Bet</span></span>
      </div>
    </div>`;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
    return canvas.toDataURL('image/png');
  } finally { document.body.removeChild(container); }
}

// ─── Share image modal ────────────────────────────────────────────────────────
function ShareImageModal({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  const handleDownload = () => { const a = document.createElement('a'); a.href = imageUrl; a.download = `championbet-slip-${Date.now()}.png`; a.click(); };
  const handleShare = async () => {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'championbet-bet.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'My ChampionBet Bet Slip' });
      else handleDownload();
    } catch { handleDownload(); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-base">Your Bet Slip</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><CloseIcon fontSize="small" /></button>
        </div>
        <div className="p-4"><img src={imageUrl} alt="Bet slip" className="w-full rounded-2xl shadow-xl" /></div>
        <div className="px-4 pb-5 flex gap-3">
          <button onClick={handleDownload} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center gap-2"><DownloadIcon fontSize="small" /> Save</button>
          <button onClick={handleShare} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2"><ShareIcon fontSize="small" /> Share</button>
        </div>
      </div>
    </div>
  );
}

// ─── Confetti canvas ──────────────────────────────────────────────────────────
function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const cols = ['#FFD700','#FFC107','#FF6B35','#dc2626','#ffffff','#ef4444','#FBBF24','#F59E0B'];
    const ps = Array.from({ length: 110 }, () => ({
      x: Math.random() * c.width, y: -20 - Math.random() * 200,
      w: 5 + Math.random() * 9, h: 3 + Math.random() * 5,
      r: Math.random() * Math.PI * 2, dr: (Math.random() - 0.5) * 0.14,
      vy: 1.8 + Math.random() * 3.5, vx: (Math.random() - 0.5) * 1.8,
      color: cols[Math.floor(Math.random() * cols.length)], circ: Math.random() > 0.6,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        ctx.save(); ctx.globalAlpha = 0.85;
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.color;
        if (p.circ) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x += p.vx; p.y += p.vy; p.r += p.dr; p.vy += 0.035;
        if (p.y > c.height + 20) { p.y = -20; p.x = Math.random() * c.width; p.vy = 1.8 + Math.random() * 3.5; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.65 }} />;
}

// ─── Championship Trophy SVG ──────────────────────────────────────────────────
function ChampionshipTrophy({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 240 / 220)} viewBox="0 0 220 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gM" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FFF176"/><stop offset="20%" stopColor="#FFD700"/>
          <stop offset="45%"  stopColor="#F59E0B"/><stop offset="70%" stopColor="#D97706"/>
          <stop offset="100%" stopColor="#92400E"/>
        </linearGradient>
        <linearGradient id="gS" x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#FFFDE7" stopOpacity=".9"/>
          <stop offset="40%"  stopColor="#FFD700" stopOpacity=".4"/>
          <stop offset="100%" stopColor="#B45309" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gB" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#FFC107"/><stop offset="50%"  stopColor="#D97706"/>
          <stop offset="100%" stopColor="#78350F"/>
        </linearGradient>
        <linearGradient id="gSt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#B45309"/><stop offset="30%"  stopColor="#FFC107"/>
          <stop offset="60%"  stopColor="#FFD700"/><stop offset="100%" stopColor="#B45309"/>
        </linearGradient>
        <linearGradient id="gH" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FFF9C4"/><stop offset="50%"  stopColor="#F59E0B"/>
          <stop offset="100%" stopColor="#78350F"/>
        </linearGradient>
        <radialGradient id="gCI" cx="40%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#FFFDE7" stopOpacity=".55"/>
          <stop offset="60%"  stopColor="#FFD700" stopOpacity=".08"/>
          <stop offset="100%" stopColor="#92400E" stopOpacity="0"/>
        </radialGradient>
        <filter id="sh"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#B45309" floodOpacity=".4"/></filter>
      </defs>
      <ellipse cx="110" cy="232" rx="60" ry="7" fill="rgba(0,0,0,.2)"/>
      <rect x="46" y="216" width="128" height="14" rx="4" fill="url(#gB)" filter="url(#sh)"/>
      <rect x="50" y="216" width="58"  height="7"  rx="2" fill="url(#gS)" opacity=".45"/>
      <rect x="58" y="204" width="104" height="14" rx="3" fill="url(#gB)"/>
      <rect x="62" y="204" width="48"  height="6"  rx="2" fill="url(#gS)" opacity=".4"/>
      <rect x="70" y="194" width="80"  height="12" rx="3" fill="url(#gSt)"/>
      <rect x="58" y="208" width="104" height="5"  rx="2" fill="#dc2626" opacity=".92"/>
      <text x="110" y="213" textAnchor="middle" fontSize="4" fontWeight="900" fill="#FFD700" letterSpacing="1.5">WINNER</text>
      <rect x="96"  y="140" width="28" height="56" rx="4" fill="url(#gSt)"/>
      <rect x="100" y="140" width="10" height="56" rx="3" fill="url(#gS)" opacity=".5"/>
      <ellipse cx="110" cy="168" rx="16" ry="5" fill="url(#gB)"/>
      <ellipse cx="110" cy="168" rx="9"  ry="3" fill="url(#gS)" opacity=".4"/>
      <path d="M44 56 Q10 56 10 86 Q10 116 44 112"   stroke="url(#gH)" strokeWidth="14" fill="none" strokeLinecap="round" filter="url(#sh)"/>
      <path d="M44 64 Q20 64 20 86 Q20 108 44 104"   stroke="url(#gS)" strokeWidth="4"  fill="none" strokeLinecap="round" opacity=".55"/>
      <path d="M176 56 Q210 56 210 86 Q210 116 176 112" stroke="url(#gH)" strokeWidth="14" fill="none" strokeLinecap="round" filter="url(#sh)"/>
      <path d="M176 64 Q200 64 200 86 Q200 108 176 104" stroke="url(#gS)" strokeWidth="4"  fill="none" strokeLinecap="round" opacity=".55"/>
      <path d="M44 26 L176 26 L166 108 Q158 140 110 144 Q62 140 54 108 Z" fill="url(#gM)" filter="url(#sh)"/>
      <path d="M44 26 L176 26 L166 108 Q158 140 110 144 Q62 140 54 108 Z" fill="url(#gCI)"/>
      <path d="M60 30 L100 30 L92 100 Q86 128 70 134 Q55 120 54 108 Z"    fill="url(#gS)" opacity=".32"/>
      <path d="M40 26 L180 26" stroke="#FFF9C4" strokeWidth="5"   strokeLinecap="round"/>
      <path d="M40 26 L180 26" stroke="url(#gM)" strokeWidth="2.5" strokeLinecap="round"/>
      <text x="110" y="94" textAnchor="middle" fontSize="40" fill="#FFD700" opacity=".35">★</text>
      <text x="110" y="62" textAnchor="middle" fontSize="7"  fontWeight="900" fill="#78350F" letterSpacing="2"   opacity=".8">CHAMPION</text>
      <text x="110" y="75" textAnchor="middle" fontSize="9"  fontWeight="900" fill="#dc2626" letterSpacing="1.5">BET</text>
      <path d="M50 36 L170 36" stroke="#FFF9C4" strokeWidth="1.5" strokeOpacity=".35"/>
    </svg>
  );
}

// ─── Sparkle particles ────────────────────────────────────────────────────────
function Sparkles() {
  const [sparks] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i, x: 10 + Math.random() * 80, y: 5 + Math.random() * 85,
      size: 4 + Math.random() * 7, delay: Math.random() * 3, dur: 1.5 + Math.random() * 2,
      color: ['#FFD700','#FFC107','#ffffff','#ef4444','#FBBF24'][Math.floor(Math.random() * 5)],
    }))
  );
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {sparks.map(s => (
        <div key={s.id} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.color, boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
          animation: `cbSparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3)) * 100) / 100);
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ─── WIN PAGE ─────────────────────────────────────────────────────────────────
function WinPage({ bet, currency, onClose }: { bet: Bet; currency: CurrencyInfo; onClose: () => void }) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const animPayout = useCountUp(bet.potentialReturn, 2000);

  const payoutGhs = bet.potentialReturn;
  const grossWin  = payoutGhs - bet.stake;
  const bonus     = Math.max(0, payoutGhs - bet.stake * bet.totalOdds);
  const hasBonus  = bonus > 0.5;
  const tax       = 0;
  const netProfit = grossWin - tax;

  const shortId    = `CB${bet.id.slice(-8).toUpperCase()}`;
  const verifyCode = `CB-${bet.id.slice(-4).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const txRef      = `TXN${Date.now().toString().slice(-10)}`;
  const genDate    = new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
  const betType    = bet.selections.length > 1 ? 'Accumulator' : 'Single';

  const qrFilled    = [0,2,4,10,12,14,20,22,24,3,7,11,15,17,1,5,9,13,19,23];
  const barWidths   = [1,1,2,1,3,1,2,1,1,2,1,1,3,1,2,1,1,2,1,3,1,1,2,1,2,1,1,3,1,2,1,1,2,3,1,1,2,1,3,1,2,1,1,2,1,1,3,2,1,1];
  const barHeights  = [60,50,65,55,70,58,62,48,68,54,66,52,72,56,64,50,60,55,70,58,62,48,68,54,66,52,72,56,64,50,60,55,62,70,48,68,54,66,52,72,56,64,50,60,55,70,58,62,48,68];

  const handleShare = async () => {
    setGeneratingImage(true);
    try { const url = await generateSlipImage(bet, true, currency); setShareImageUrl(url); }
    catch (err) { logError('WinPage', err); }
    finally { setGeneratingImage(false); }
  };

  return (
    <>
      <style>{`
        @keyframes cbFloat    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
        @keyframes cbTrophyIn { 0%{opacity:0;transform:scale(0.2) rotate(-20deg) translateY(60px)} 65%{transform:scale(1.1) rotate(4deg) translateY(-10px)} 82%{transform:scale(0.95) rotate(-1deg) translateY(3px)} 100%{opacity:1;transform:scale(1) rotate(0deg) translateY(0)} }
        @keyframes cbGlow     { 0%,100%{opacity:0.5;transform:scale(1)}  50%{opacity:1;transform:scale(1.2)} }
        @keyframes cbShine    { 0%{left:-80%} 100%{left:200%} }
        @keyframes cbGoldShim { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes cbRedShim  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes cbSlideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cbFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes cbCountIn  { from{opacity:0;transform:scale(0.65) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cbRays     { from{transform:translateX(-50%) rotate(0deg)} to{transform:translateX(-50%) rotate(360deg)} }
        @keyframes cbSparkle  { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }

        .cbwp { min-height:100vh; background:radial-gradient(ellipse 130% 55% at 50% -5%,#3a0808 0%,#150000 45%,#000 100%); font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; color:#fff; position:relative; overflow-x:hidden; }
        .cbwp-rays { position:fixed; top:-20%; left:50%; transform:translateX(-50%); width:160vw; height:130vh; background:conic-gradient(from 0deg at 50% 0%,transparent 0deg,rgba(220,38,38,.04) 8deg,transparent 16deg,rgba(220,38,38,.05) 26deg,transparent 36deg); animation:cbRays 28s linear infinite; pointer-events:none; z-index:0; }
        .cbwp-wrap { position:relative; z-index:1; max-width:640px; margin:0 auto; padding:0 16px 100px; }
        .cbwp-hero { text-align:center; padding:44px 0 24px; animation:cbFadeIn .5s ease both; }
        .cbwp-you-won { font-size:clamp(42px,11vw,68px); font-weight:900; line-height:1; letter-spacing:.04em; margin-bottom:6px; background:linear-gradient(90deg,#dc2626 0%,#fff 32%,#dc2626 52%,#ef4444 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:cbRedShim 2s linear infinite; }
        .cbwp-payout { font-size:clamp(34px,9vw,52px); font-weight:900; letter-spacing:-.02em; line-height:1; background:linear-gradient(90deg,#FFD700 0%,#FFF9C4 28%,#F59E0B 48%,#FFF9C4 68%,#FFD700 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:cbGoldShim 2.5s linear .8s infinite, cbCountIn .6s cubic-bezier(.16,1,.3,1) .8s both; }
        .cbwp-payout-total { font-size:clamp(20px,6vw,30px); font-weight:900; background:linear-gradient(90deg,#FFD700,#FFF9C4 30%,#F59E0B 55%,#FFD700); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:cbGoldShim 2.5s linear infinite; }
        .cbwp-trophy-enter { animation:cbTrophyIn 1.1s cubic-bezier(.16,1,.3,1) .25s both; }
        .cbwp-trophy-float { animation:cbFloat 3.2s ease-in-out infinite; }
        .cbwp-glow { position:absolute; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle,rgba(255,215,0,.22) 0%,rgba(220,38,38,.1) 45%,transparent 70%); top:50%; left:50%; transform:translate(-50%,-50%); animation:cbGlow 2.8s ease-in-out infinite; pointer-events:none; }
        .cbwp-glass { background:rgba(255,255,255,.04); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:18px 20px; margin-bottom:14px; }
        .cbwp-gold  { background:linear-gradient(135deg,rgba(255,215,0,.07),rgba(180,83,9,.04)); border:1px solid rgba(255,215,0,.2); border-radius:16px; padding:18px 20px; margin-bottom:14px; }
        .cbwp-sh { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .cbwp-si { width:36px; height:36px; border-radius:10px; font-size:16px; background:linear-gradient(135deg,rgba(220,38,38,.3),rgba(220,38,38,.1)); border:1px solid rgba(220,38,38,.4); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cbwp-st { font-size:12px; font-weight:800; color:#fff; letter-spacing:.06em; text-transform:uppercase; }
        .cbwp-ss { font-size:11px; color:rgba(255,255,255,.4); margin-top:1px; }
        .cbwp-sg { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .cbwp-sc { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:12px; text-align:center; }
        .cbwp-ig { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .cbwp-ic { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:12px 14px; }
        .cbwp-wr { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.06); font-size:12px; }
        .cbwp-wr:last-child { border-bottom:none; }
        .cbwp-mc { border-radius:14px; padding:14px 16px; margin-bottom:10px; background:rgba(34,197,94,.05); border:1px solid rgba(34,197,94,.18); animation:cbSlideUp .5s ease both; }
        .cbwp-mc:last-child { margin-bottom:0; }
        .cbwp-notch { display:flex; align-items:center; margin:4px 0; }
        .cbwp-nc { width:20px; height:20px; border-radius:50%; background:#000; border:2px solid rgba(220,38,38,.25); flex-shrink:0; }
        .cbwp-nl { flex:1; border-top:2px dashed rgba(220,38,38,.2); }
        .cbwp-tr { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px dashed rgba(255,255,255,.08); font-size:11px; }
        .cbwp-tr:last-child { border-bottom:none; }
        .cbwp-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 18px; border-radius:14px; font-size:14px; font-weight:800; cursor:pointer; border:none; transition:transform .15s; flex:1; text-decoration:none; }
        .cbwp-btn:active { transform:scale(.97); }
        .cbwp-bg { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; box-shadow:0 4px 24px rgba(34,197,94,.3); }
        .cbwp-br { background:rgba(220,38,38,.2); color:#ef4444; border:1px solid rgba(220,38,38,.35) !important; }
        .cbwp-bo { background:rgba(255,255,255,.06); color:rgba(255,255,255,.7); border:1px solid rgba(255,255,255,.1) !important; }
        .cbwp-qr { width:66px; height:66px; border:2px solid rgba(255,215,0,.3); border-radius:8px; display:grid; grid-template-columns:repeat(5,1fr); gap:2px; padding:7px; flex-shrink:0; }
        .cbwp-bc { display:flex; gap:2px; height:38px; align-items:flex-end; justify-content:center; }
        .cbwp-bar { background:rgba(255,215,0,.6); border-radius:1px; }
        .cbwp-e1 { animation:cbSlideUp .6s ease .2s both; }
        .cbwp-e2 { animation:cbSlideUp .6s ease .3s both; }
        .cbwp-e3 { animation:cbSlideUp .6s ease .4s both; }
        .cbwp-e4 { animation:cbSlideUp .6s ease .5s both; }
        .cbwp-e5 { animation:cbSlideUp .6s ease .6s both; }
        .cbwp-e6 { animation:cbSlideUp .6s ease .7s both; }
      `}</style>

      <div className="cbwp">
        <div className="cbwp-rays" />
        <ConfettiCanvas />

        <div className="cbwp-wrap">

          {/* ── HERO ── */}
          <div className="cbwp-hero">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:22 }}>
              <ChampionBetLogoSvg size={24} /><ChampionBetWordmarkDark size={16} />
            </div>
            <div style={{ fontSize:12, letterSpacing:'.22em', fontWeight:700, color:'rgba(255,215,0,.75)', textTransform:'uppercase', marginBottom:5 }}>🏆 Congratulations 🏆</div>
            <div className="cbwp-you-won">YOU WON!</div>
            <p style={{ fontSize:14, color:'rgba(255,255,255,.45)', fontWeight:500 }}>Your bet was a success. Enjoy your winnings.</p>

            {/* Trophy */}
            <div style={{ position:'relative', display:'inline-block', margin:'28px auto 22px' }}>
              <div className="cbwp-glow" />
              <div className="cbwp-trophy-enter"><div className="cbwp-trophy-float"><ChampionshipTrophy size={200} /></div></div>
              <Sparkles />
              <div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'50%', pointerEvents:'none' }}>
                <div style={{ position:'absolute', top:0, bottom:0, width:'35%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)', animation:'cbShine 3.2s ease-in-out 1s infinite' }} />
              </div>
            </div>

            {/* Payout */}
            <div style={{ display:'inline-block', background:'linear-gradient(135deg,rgba(255,215,0,.12),rgba(180,83,9,.07))', border:'1px solid rgba(255,215,0,.25)', borderRadius:20, padding:'20px 36px', marginBottom:8 }}>
              <div style={{ fontSize:11, color:'rgba(255,215,0,.7)', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:5 }}>Total Winnings</div>
              <div className="cbwp-payout">{formatLocal(animPayout, currency)}</div>
              {currency.code !== 'GHS' && <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', marginTop:4 }}>GH₵{payoutGhs.toLocaleString('en',{minimumFractionDigits:2})}</div>}
            </div>
            <br />
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 18px', borderRadius:20, marginTop:12, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', color:'#22c55e', fontSize:13, fontWeight:800, letterSpacing:'.1em' }}>
              ✓ WON
            </div>
          </div>

          {/* ── SECTION 1: MATCH SUMMARY ── */}
          <div className="cbwp-glass cbwp-e1">
            <div className="cbwp-sh">
              <div className="cbwp-si">⚽</div>
              <div>
                <div className="cbwp-st">Match Summary</div>
                <div className="cbwp-ss">{bet.selections.length} selection{bet.selections.length !== 1 ? 's' : ''} · All won</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:14 }}>
              <div style={{ flex:1, textAlign:'center', padding:12, borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>🏟️</div>
                <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{bet.selections.length > 1 ? 'Multiple' : 'Single'}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Matches</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:900, color:'#dc2626' }}>×</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{bet.selections.length} {bet.selections.length === 1 ? 'LEG' : 'LEGS'}</div>
              </div>
              <div style={{ flex:1, textAlign:'center', padding:12, borderRadius:12, background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>🏆</div>
                <div style={{ fontSize:13, fontWeight:800, color:'#22c55e' }}>All Won</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Status</div>
              </div>
            </div>
            <div className="cbwp-sg">
              {[
                { label:'Bet Type',   value: betType },
                { label:'Total Odds', value: `${bet.totalOdds.toFixed(2)}×` },
                { label:'Date',       value: new Date(bet.placedAt).toLocaleDateString('en-GH',{day:'2-digit',month:'short'}) },
              ].map(i => (
                <div key={i.label} className="cbwp-sc">
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>{i.label}</div>
                  <div style={{ fontSize:12, fontWeight:800, color:'#fff' }}>{i.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 2: BET INFORMATION ── */}
          <div className="cbwp-glass cbwp-e2">
            <div className="cbwp-sh"><div className="cbwp-si">🎫</div><div><div className="cbwp-st">Bet Information</div></div></div>
            <div className="cbwp-ig">
              {([
                { icon:'🆔', label:'Bet ID',      value: shortId,    mono:true },
                { icon:'💰', label:'Stake',        value: formatLocal(bet.stake, currency) },
                { icon:'📊', label:'Total Odds',   value: `${bet.totalOdds.toFixed(2)}×`, color:'#FFD700' },
                { icon:'🎯', label:'Selections',   value: `${bet.selections.length} leg${bet.selections.length!==1?'s':''}` },
                { icon:'🏷️', label:'Bet Type',    value: betType },
                { icon:'📅', label:'Date Placed',  value: new Date(bet.placedAt).toLocaleDateString('en-GH',{day:'2-digit',month:'short',year:'numeric'}) },
              ] as any[]).map((item: any) => (
                <div key={item.label} className="cbwp-ic">
                  <div style={{ fontSize:15, marginBottom:5 }}>{item.icon}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:3 }}>{item.label}</div>
                  <div style={{ fontSize:12, fontWeight:800, color: item.color ?? '#fff', fontFamily: item.mono ? 'monospace' : undefined, wordBreak:'break-all' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {currency.code !== 'GHS' && (
              <div style={{ marginTop:12, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:7 }}>
                <PublicIcon sx={{ fontSize:13, color:'rgba(255,255,255,.4)', flexShrink:0 }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>Displaying in <strong style={{ color:'#fff' }}>{currency.code}</strong> · Bet settled in GH₵</span>
              </div>
            )}
          </div>

          {/* ── SECTION 3: WINNING SUMMARY ── */}
          <div className="cbwp-gold cbwp-e3">
            <div className="cbwp-sh">
              <div className="cbwp-si">💎</div>
              <div><div className="cbwp-st">Winning Summary</div><div className="cbwp-ss">Financial achievement card</div></div>
            </div>
            {([
              { label:'Stake',      value: formatLocal(bet.stake, currency),  color:'rgba(255,255,255,.8)' },
              { label:'Total Odds', value: `${bet.totalOdds.toFixed(2)}×`,    color:'#FFD700' },
              { label:'Gross Win',  value: formatLocal(grossWin, currency),   color:'#22c55e' },
              ...(hasBonus ? [{ label:'Bonus', value: formatLocal(bonus, currency), color:'#3b82f6' }] : []),
              { label:'Tax (0%)',   value: formatLocal(tax, currency),        color:'rgba(255,255,255,.5)' },
              { label:'Net Profit', value: formatLocal(netProfit + (hasBonus ? bonus : 0), currency), color:'#22c55e' },
            ] as any[]).map((row: any) => (
              <div key={row.label} className="cbwp-wr">
                <span style={{ color:'rgba(255,255,255,.45)', fontWeight:600 }}>{row.label}</span>
                <span style={{ fontWeight:800, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ marginTop:14, padding:'14px 16px', borderRadius:12, background:'linear-gradient(135deg,rgba(255,215,0,.14),rgba(180,83,9,.09))', border:'1px solid rgba(255,215,0,.28)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,215,0,.7)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:3 }}>Total Payout</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Credited to wallet</div>
                {currency.code !== 'GHS' && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2 }}>GH₵{payoutGhs.toFixed(2)}</div>}
              </div>
              <div className="cbwp-payout-total">{formatLocal(payoutGhs, currency)}</div>
            </div>
          </div>

          {/* ── SECTION 4: SELECTED PREDICTIONS ── */}
          <div className="cbwp-glass cbwp-e4">
            <div className="cbwp-sh">
              <div className="cbwp-si">✅</div>
              <div><div className="cbwp-st">Selected Predictions</div><div className="cbwp-ss">All predictions successful</div></div>
            </div>
            {bet.selections.map((sel, i) => {
              const isWon  = sel.result === 'WON';
              const isLost = sel.result === 'LOST';
              const home   = sel.homeTeam ?? (sel as any).home_team;
              const away   = sel.awayTeam ?? (sel as any).away_team;
              const matchLbl = buildMatchLabel(sel as unknown as Record<string,unknown>);
              return (
                <div key={sel.id ?? i} className="cbwp-mc" style={{ animationDelay:`${i*0.08}s` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center' }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:'rgba(220,38,38,.2)', border:'1px solid rgba(220,38,38,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#ef4444', marginRight:8, flexShrink:0 }}>{i+1}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>⚽ {sel.market}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background: isWon?'rgba(34,197,94,.14)':isLost?'rgba(239,68,68,.14)':'rgba(255,255,255,.08)', border:`1px solid ${isWon?'rgba(34,197,94,.3)':isLost?'rgba(239,68,68,.3)':'rgba(255,255,255,.15)'}`, fontSize:11, fontWeight:700, color: isWon?'#22c55e':isLost?'#ef4444':'#94a3b8' }}>
                      {isWon ? '✓ WON' : isLost ? '✗ LOST' : '— PENDING'}
                    </div>
                  </div>
                  {home && away ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ flex:1, textAlign:'center' }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{home}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Home</div>
                      </div>
                      <div style={{ padding:'4px 10px', borderRadius:8, background:'rgba(220,38,38,.14)', border:'1px solid rgba(220,38,38,.25)', fontSize:11, fontWeight:900, color:'#ef4444', flexShrink:0 }}>VS</div>
                      <div style={{ flex:1, textAlign:'center' }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{away}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Away</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.7)', marginBottom:10 }}>{matchLbl}</div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', fontSize:12, fontWeight:700, color:'#fff' }}>📍 {sel.selection}</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>ODDS</div>
                      <div style={{ fontSize:15, fontWeight:900, color:'#FFD700' }}>{sel.oddsLocked.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notch divider */}
          <div className="cbwp-notch">
            <div className="cbwp-nc" /><div className="cbwp-nl" />
            <div style={{ padding:'0 10px', fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:11, fontWeight:900, color:'rgba(255,255,255,.18)', whiteSpace:'nowrap' }}>
              Champion<span style={{ color:'rgba(239,68,68,.35)' }}>Bet</span>
            </div>
            <div className="cbwp-nl" /><div className="cbwp-nc" />
          </div>

          {/* ── SECTION 5: TICKET VERIFICATION ── */}
          <div className="cbwp-glass cbwp-e5">
            <div className="cbwp-sh">
              <div className="cbwp-si">🔐</div>
              <div><div className="cbwp-st">Ticket Verification</div><div className="cbwp-ss">Official championship certificate</div></div>
            </div>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:16 }}>
              <div className="cbwp-qr">
                {Array.from({ length:25 }).map((_,idx) => (
                  <div key={idx} style={{ borderRadius:1, background: qrFilled.includes(idx)?'rgba(255,215,0,.82)':'transparent', paddingTop:'100%' }} />
                ))}
              </div>
              <div style={{ flex:1 }}>
                {[
                  { label:'Bet Slip No.', value: shortId,    gold:true },
                  { label:'Verify Code', value: verifyCode, gold:true },
                  { label:'TX Ref',      value: txRef,      gold:false },
                  { label:'Generated',   value: genDate,    gold:false },
                ].map(r => (
                  <div key={r.label} className="cbwp-tr">
                    <span style={{ color:'rgba(255,255,255,.45)', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase' }}>{r.label}</span>
                    <span style={{ fontFamily: r.gold||r.label==='TX Ref'?'monospace':undefined, fontWeight: r.gold?900:600, color: r.gold?'#FFD700':'rgba(255,255,255,.7)', letterSpacing: r.gold?'.08em':undefined }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop:'1px dashed rgba(255,255,255,.08)', paddingTop:14 }}>
              <div className="cbwp-bc">
                {barWidths.map((w,idx) => <div key={idx} className="cbwp-bar" style={{ width:w, height:`${barHeights[idx%barHeights.length]}%` }} />)}
              </div>
              <div style={{ textAlign:'center', marginTop:6, fontFamily:'monospace', fontSize:10, color:'rgba(255,215,0,.45)', letterSpacing:'.14em' }}>
                {`CB${bet.id.slice(-12).toUpperCase()}`}
              </div>
            </div>
            <div style={{ marginTop:14, padding:'8px 14px', borderRadius:8, background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>🔒</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontWeight:600 }}>Cryptographically verified · ChampionBet Security v2</span>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="cbwp-e6">
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              <Link to="/wallet" onClick={onClose} className="cbwp-btn cbwp-bg">💳 Withdraw Funds</Link>
              <button onClick={handleShare} disabled={generatingImage} className="cbwp-btn cbwp-br" style={{ opacity: generatingImage?0.6:1 }}>
                {generatingImage ? '⏳ Generating…' : <><ShareIcon fontSize="small" /> Share Slip</>}
              </button>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onClose} className="cbwp-btn cbwp-bo">📋 View All Bets</button>
              <Link to="/" onClick={onClose} className="cbwp-btn cbwp-bo">🎯 Place New Bet</Link>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign:'center', paddingTop:28 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:4 }}>
              <ChampionBetLogoSvg size={14} /><ChampionBetWordmarkDark size={12} />
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.14)', letterSpacing:'.08em' }}>PLAY RESPONSIBLY · 18+ · LICENSED</div>
          </div>
        </div>
      </div>

      {shareImageUrl && <ShareImageModal imageUrl={shareImageUrl} onClose={() => setShareImageUrl(null)} />}
    </>
  );
}

// ─── Loss modal ───────────────────────────────────────────────────────────────
function LossModal({ bet, currency, onClose }: { bet: Bet; currency: CurrencyInfo; onClose: () => void }) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

  const handleShowOff = async () => {
    setGeneratingImage(true);
    try { const url = await generateSlipImage(bet, false, currency); setShareImageUrl(url); }
    catch (err) { logError('LossModal', err); }
    finally { setGeneratingImage(false); }
  };

  const placedDate = bet.placedAt
    ? new Date(bet.placedAt).toLocaleString('en-GH', { hour:'2-digit', minute:'2-digit', hour12:true, month:'numeric', day:'numeric', year:'numeric' })
    : '';

  return (
    <>
      <style>{`@keyframes stakeSlideUp{from{opacity:0;transform:translateY(32px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-20 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
          style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', animation:'stakeSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) both', paddingBottom:'calc(env(safe-area-inset-bottom) + 80px)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black px-2.5 py-1 rounded-md" style={{ background:'#dc2626', color:'#fff', letterSpacing:'0.05em' }}>Lost</span>
              <span className="text-sm text-slate-400">{placedDate}</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><CloseIcon sx={{ fontSize:17 }} /></button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight:'calc(85vh - 80px)' }}>
            {bet.selections.map((sel, i) => {
              const matchLabel = buildMatchLabel(sel as unknown as Record<string, unknown>);
              const settledAt = bet.settledAt ? new Date(bet.settledAt).toLocaleString('en-GH', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }) : '';
              const isWonSel = sel.result === 'WON';
              return (
                <div key={sel.id ?? i} className="px-4 pt-4 pb-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background:'rgba(255,255,255,0.08)' }}><SportsSoccerIcon sx={{ fontSize:15 }} className="text-slate-300" /></div>
                    <p className="text-sm font-bold text-white truncate">{matchLabel}</p>
                  </div>
                  {settledAt && <p className="text-xs text-slate-400 mb-3">{settledAt}</p>}
                  <div className="inline-flex items-center px-3 py-1.5 rounded-lg mb-2 text-sm font-bold text-white" style={{ border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.06)' }}>{sel.selection}</div>
                  <p className="text-xs text-slate-400 mb-3">{sel.market}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: isWonSel?'#22c55e':'#ef4444', fontSize:16 }}>{isWonSel?'✓':'✗'}</span>
                      <span className="text-sm font-bold text-white">{sel.selection}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{(sel.oddsLocked ?? bet.totalOdds).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.1)' }} />
              <div className="flex items-center gap-1.5"><ChampionBetLogoSvg size={14} /><ChampionBetWordmarkDark size={13} /></div>
              <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.1)' }} />
            </div>
            <div className="px-4 py-3 space-y-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Odds</span><span className="text-sm font-bold" style={{ color:'#ef4444' }}>{bet.totalOdds.toFixed(2)}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Stake</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{formatLocal(bet.stake, currency)}</span>
                  {currency.code !== 'GHS' && <p className="text-xs text-slate-500 mt-0.5">GH₵{bet.stake.toFixed(2)}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Payout</span><span className="text-base font-black" style={{ color:'#ef4444' }}>{formatLocal(0, currency)}</span></div>
            </div>
            <div className="px-4 py-4 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:'#dc2626', color:'#fff' }}>Try Again</button>
              <button onClick={handleShowOff} disabled={generatingImage} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{ background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.12)' }}>
                {generatingImage ? <CircularProgress fontSize="small" className="animate-spin" /> : <><ShareIcon fontSize="small" /> Share</>}
              </button>
            </div>
            <button onClick={onClose} className="w-full pb-5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">Back to Bets</button>
          </div>
        </div>
      </div>
      {shareImageUrl && <ShareImageModal imageUrl={shareImageUrl} onClose={() => setShareImageUrl(null)} />}
    </>
  );
}

// ─── Bet detail bottom sheet ──────────────────────────────────────────────────
// FIX: Use early returns to swap out the sheet entirely when win/loss screens
// are active, eliminating z-index conflicts with the sheet's backdrop overlay.
function BetDetailSheet({ bet, currency, onClose }: { bet: Bet; currency: CurrencyInfo; onClose: () => void }) {
  const { setModalOpen } = useAppStore();
  const [showWin, setShowWin]   = useState(false);
  const [showLoss, setShowLoss] = useState(false);

  if (showWin) {
    return <WinPage bet={bet} currency={currency} onClose={() => { setShowWin(false); setModalOpen(false); onClose(); }} />;
  }
  if (showLoss) {
    return <LossModal bet={bet} currency={currency} onClose={() => { setShowLoss(false); setModalOpen(false); onClose(); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-y-auto"
        style={{ maxHeight:'calc(100vh - 80px - env(safe-area-inset-bottom))', paddingBottom:'max(1.5rem, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 z-10">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Bet Details</h3>
            <p className="text-xs text-slate-400 mt-0.5">#{bet.id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={bet.status} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><CloseIcon fontSize="small" /></button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-2">
          {bet.selections.map((sel, i) => (
            <div key={sel.id ?? i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-xs text-slate-400 truncate">{buildMatchLabel(sel as unknown as Record<string,unknown>)}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sel.market}: {sel.selection}<SelectionResult result={sel.result} /></p>
              </div>
              <span className="font-bold text-red-600 text-sm shrink-0">{sel.oddsLocked.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 mx-5" />
        <div className="px-5 py-4 space-y-2.5">
          {[
            { label:`Stake (${currency.code})`,           value: formatLocal(bet.stake, currency),          sub: currency.code!=='GHS'?`GH₵${bet.stake.toFixed(2)}`:undefined },
            { label:'Total Odds',                          value: bet.totalOdds.toFixed(2) },
            { label:`Potential Return (${currency.code})`, value: formatLocal(bet.potentialReturn, currency), sub: currency.code!=='GHS'?`GH₵${bet.potentialReturn.toFixed(2)}`:undefined, highlight:true },
            { label:'Placed At',                           value: new Date(bet.placedAt).toLocaleString() },
            ...(bet.settledAt ? [{ label:'Settled At', value: new Date(bet.settledAt).toLocaleString() }] : []),
          ].map(({ label, value, sub, highlight }: any) => (
            <div key={label} className="flex justify-between items-start text-sm">
              <span className="text-slate-400 shrink-0">{label}</span>
              <div className="text-right ml-3">
                <span className={`font-semibold ${highlight ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>{value}</span>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>
        {(bet.status === 'WON' || bet.status === 'LOST') && (
          <div className="px-5 pt-1 pb-2">
            <button
              onClick={() => { if (bet.status==='WON') { setShowWin(true); setModalOpen(true); } else { setShowLoss(true); setModalOpen(true); } }}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${bet.status==='WON' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {bet.status==='WON' ? '🏆 View Winnings' : '😭 View Result'}
            </button>
          </div>
        )}
        {bet.status === 'VOID' && (
          <div className="px-5 pt-1 pb-2">
            <div className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-center">↩ Stake refunded to your wallet</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Booking code panel ───────────────────────────────────────────────────────
function BookingCodePanel() {
  const { clearBetSlip, addToBetSlip, showToast, user } = useAppStore();
  const navigate = useNavigate();
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleLoad = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(null); setPreview(null);
    try {
      const res = await booking.redeem({ code: code.trim().toUpperCase() });
      if (res.success && res.data) setPreview(res.data);
      else setError('Invalid or expired booking code.');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Invalid booking code.'); }
    finally { setLoading(false); }
  };

  const handleAddToSlip = () => {
    if (!preview) return;
    if (!user) { showToast('Log in to place this bet', 'info'); navigate('/login'); return; }
    const enriched: Record<string, unknown>[] = preview.enrichedSelections ?? [];
    const mapped = enriched.map(s => ({
      matchId:   String(s.matchId ?? s.match_id ?? s.fixtureId ?? s.fixture_id ?? ''),
      matchName: buildMatchLabel(s),
      market:    String(s.market ?? s.marketKey ?? ''),
      selection: String(s.selection ?? s.pick ?? s.name ?? s.label ?? ''),
      odd:       extractOdds(s),
    }));
    clearBetSlip();
    mapped.forEach((sel: any) => addToBetSlip(sel));
    showToast(`Booking code loaded — ${mapped.length} selections added!`, 'success');
    setPreview(null); setCode('');
  };

  const selectionCount = (preview?.enrichedSelections ?? []).length;
  const totalOdds = preview?.currentTotalOdds ?? preview?.booking?.totalOdds ?? 0;

  return (
    <div className="mt-2">
      {!expanded && !preview && (
        <button onClick={() => setExpanded(true)} className="w-full group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-red-500/40 hover:bg-red-600/[0.03] transition-all">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-red-600/10 flex items-center justify-center shrink-0"><QrCodeIcon sx={{ fontSize:16 }} className="text-slate-400 group-hover:text-red-600" /></div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white">Have a booking code?</p>
            <p className="text-xs text-slate-400">Tap to load selections instantly</p>
          </div>
          <svg className="ml-auto shrink-0 text-slate-300 group-hover:text-red-600" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      {(expanded || preview) && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-600/10 flex items-center justify-center"><QrCodeIcon sx={{ fontSize:13 }} className="text-red-600" /></div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Booking Code</span>
            </div>
            {!preview && <button onClick={() => { setExpanded(false); setError(null); setCode(''); }} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"><CloseIcon sx={{ fontSize:15 }} /></button>}
          </div>
          {!preview && (
            <div className="p-4">
              <div className="flex gap-2">
                <input type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }} placeholder="e.g. ABC12345"
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-mono tracking-widest uppercase bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 outline-none transition-all focus:ring-2 ${error ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-700 focus:ring-red-500/20 focus:border-red-500/50'}`}
                  disabled={loading} onKeyDown={e => e.key==='Enter' && handleLoad()} autoFocus />
                <button onClick={handleLoad} disabled={loading || !code.trim()} className="px-5 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold shrink-0 flex items-center gap-2">
                  {loading ? <CircularProgress sx={{ fontSize:16 }} className="animate-spin" /> : 'Load'}
                </button>
              </div>
              {error && <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-500"><InfoOutlinedIcon sx={{ fontSize:13 }} /><span>{error}</span></div>}
            </div>
          )}
          {preview && (
            <>
              <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-base font-black tracking-widest text-slate-800 dark:text-white">{preview.booking?.code ?? code}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Valid</span>
                  </div>
                  <p className="text-xs text-slate-400">{selectionCount} selection{selectionCount!==1?'s':''} · Odds: <span className="font-bold text-red-600">{totalOdds.toFixed(2)}x</span></p>
                </div>
                <button onClick={() => { setPreview(null); setCode(''); setExpanded(true); }} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 shrink-0"><CloseIcon sx={{ fontSize:16 }} /></button>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 px-1">
                {(preview.enrichedSelections ?? []).map((sel: Record<string,unknown>, i: number) => {
                  const odds = extractOdds(sel);
                  return (
                    <div key={i} className="px-3 py-2.5 flex justify-between items-center">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-[11px] text-slate-400 truncate mb-0.5">{buildMatchLabel(sel)}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{String(sel.market??'')} · {String(sel.selection??'')}</p>
                      </div>
                      <span className="text-xs font-black text-red-600 shrink-0 px-2 py-1 rounded-lg bg-red-600/10">{odds>1 ? odds.toFixed(2) : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 pb-4 pt-3">
                <button onClick={handleAddToSlip} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2">
                  <CheckCircleIcon sx={{ fontSize:17 }} />
                  {user ? `Add ${selectionCount} Selection${selectionCount!==1?'s':''} to Slip` : `Log in & Add ${selectionCount} Selection${selectionCount!==1?'s':''}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Slip tab ─────────────────────────────────────────────────────────────────
function SlipTab() {
  const { betSlip, removeFromBetSlip, clearBetSlip, showToast, user } = useAppStore();
  const navigate = useNavigate();
  const [stakeInput, setStakeInput]           = useState('');
  const [placing, setPlacing]                 = useState(false);
  const [placed, setPlaced]                   = useState(false);
  const [walletBalanceGhs, setWalletBalanceGhs] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading]   = useState(false);
  const [currency, setCurrency]               = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const stakeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrencyLoading(true); detectCurrencyInfo().then(setCurrency).finally(() => setCurrencyLoading(false)); }, []);

  const minStakeLocal = ghsToLocal(MIN_STAKE_GHS, currency);
  const QUICK_AMOUNTS = [minStakeLocal, minStakeLocal*2, minStakeLocal*5, minStakeLocal*10]
    .map(v => currency.code==='GHS' ? Math.round(v*100)/100 : Math.round(v));

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    setBalanceLoading(true);
    try {
      const res = await walletApi.getWallet();
      if (res.success && res.data) {
        const d = res.data as Record<string,unknown>;
        const b = typeof d.balance==='number' ? d.balance : typeof d.mainBalance==='number' ? d.mainBalance : typeof d.availableBalance==='number' ? d.availableBalance : null;
        setWalletBalanceGhs(b);
      }
    } catch (err) { logError('SlipTab', err); }
    finally { setBalanceLoading(false); }
  }, [user]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const totalOdds       = calculateTotalOdds(betSlip.map(s => s.odd));
  const parsedLocal     = parseFloat(stakeInput) || 0;
  const parsedGhs       = localToGhs(parsedLocal, currency);
  const potentialGhs    = calculatePotentialReturn(parsedGhs, totalOdds);
  const walletGhs       = walletBalanceGhs ?? 0;
  const belowMinStake   = parsedLocal > 0 && parsedLocal < minStakeLocal;
  const insufficientFunds = parsedLocal > 0 && walletBalanceGhs !== null && parsedGhs > walletGhs;
  const canPlace        = !!user && parsedLocal >= minStakeLocal && !insufficientFunds && betSlip.length > 0;

  const addToStake = (amount: number) => { const next = (parseFloat(stakeInput)||0)+amount; setStakeInput(currency.code==='GHS'?next.toFixed(2):String(Math.round(next))); };
  const setStakeToMin = () => { setStakeInput(currency.code==='GHS'?minStakeLocal.toFixed(2):String(Math.round(minStakeLocal))); stakeInputRef.current?.focus(); };
  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9.]/g,'').replace(/^(\d*\.?\d*).*$/,'$1');
    if (cleaned==='' || (!isNaN(Number(cleaned)) && Number(cleaned)>=0)) setStakeInput(cleaned);
  };
  const clearStake = () => { setStakeInput(''); stakeInputRef.current?.focus(); };

  const handlePlace = async () => {
    if (!user) { navigate('/login'); return; }
    if (parsedGhs < MIN_STAKE_GHS) { showToast(`Minimum stake is ${formatLocal(MIN_STAKE_GHS, currency)}`, 'error'); return; }
    setPlacing(true);
    try {
      const verified = await Promise.all(betSlip.map(async s => {
        if (!s.matchId) return { matchId:s.matchId, market:s.market, selection:s.selection, submittedOdds:Number(s.odd) };
        try {
          const res = await publicMatches.odds(s.matchId);
          if (res.success && Array.isArray(res.data)) {
            const m = res.data.find((o: any) => (o.market===s.market||o.marketKey===s.market) && (o.selection===s.selection||o.name===s.selection));
            return { matchId:s.matchId, market:s.market, selection:s.selection, submittedOdds: m?Number(m.value??m.odds??s.odd):Number(s.odd) };
          }
        } catch {}
        return { matchId:s.matchId, market:s.market, selection:s.selection, submittedOdds:Number(s.odd) };
      }));
      const res = await betsApi.place({
        stake:parsedGhs, currency:'GHS',
        selections: verified.map(s=>({ matchId:s.matchId, fixtureId:s.matchId, market:s.market, selection:s.selection, submittedOdds:s.submittedOdds })) as any,
      });
      if (res.success) { clearBetSlip(); setStakeInput(''); setPlaced(true); showToast('Bet placed successfully!','success'); fetchBalance(); }
      else throw new Error((res as any).message ?? 'Failed to place bet.');
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed to place bet.','error'); }
    finally { setPlacing(false); }
  };

  if (placed) return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4"><CheckCircleIcon className="text-emerald-600" sx={{ fontSize:36 }} /></div>
      <p className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">Bet Placed!</p>
      <p className="text-sm text-slate-400 mb-6">Check My Bets for updates.</p>
      <button onClick={() => setPlaced(false)} className="px-6 py-2.5 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white font-bold">New Bet</button>
    </div>
  );

  if (betSlip.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"><ReceiptLongIcon className="text-slate-400" sx={{ fontSize:28 }} /></div>
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Your slip is empty</p>
      <p className="text-sm text-slate-400 mb-6">Tap any odds on the matches page to add selections</p>
      <Link to="/" className="px-5 py-2.5 text-sm rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"><SportsSoccerIcon fontSize="small" /> Browse Matches</Link>
      <div className="w-full mt-6"><BookingCodePanel /></div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {betSlip.map(sel => (
          <div key={`${sel.matchId}-${sel.market}-${sel.selection}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate leading-tight flex-1 mr-2">{sel.matchName}</p>
              <button onClick={() => removeFromBetSlip(sel.matchId, sel.market, sel.selection)} className="p-1.5 text-slate-300 hover:text-rose-500 active:scale-90 transition-all rounded-lg shrink-0"><DeleteIcon sx={{ fontSize:16 }} /></button>
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate flex-1 mr-3">{sel.market}{sel.selection && <span className="text-slate-400 font-normal"> · {sel.selection}</span>}</p>
              <div className="shrink-0 flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Odds</span>
                <span className="inline-flex items-center text-sm font-black text-white bg-red-600 px-3 py-1 rounded-xl tracking-wide">{sel.odd.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-600/10 flex items-center justify-center"><AccountBalanceWalletIcon sx={{ fontSize:13 }} className="text-red-600" /></div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Stake</p>
          </div>
          <div className="flex items-center gap-2">
            {user && walletBalanceGhs!==null && !balanceLoading && <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{formatLocal(walletGhs, currency)}</span>}
            {user && balanceLoading && <span className="inline-block w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />}
            <CurrencyPill currency={currency} detecting={currencyLoading} />
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none select-none z-10" style={{ width:'52px' }}>
              <span className="text-base font-black text-slate-500 dark:text-slate-400 leading-none">{currency.symbol}</span>
            </div>
            <input ref={stakeInputRef} type="text" inputMode="decimal" value={stakeInput} onChange={handleStakeChange} placeholder="0"
              className={['w-full rounded-2xl border-2 text-2xl font-black','bg-slate-50 dark:bg-slate-800','text-slate-800 dark:text-slate-100','placeholder:text-slate-300 dark:placeholder:text-slate-600','outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80',stakeInput?'pr-10':'pr-4','pl-14 py-4',
                belowMinStake?'border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-amber-200/50':insufficientFunds?'border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-200/50':parsedLocal>=minStakeLocal?'border-red-500/60 focus:ring-2 focus:ring-red-500/20':'border-slate-200 dark:border-slate-700 focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10',
              ].join(' ')} />
            {stakeInput && <button onClick={clearStake} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-300 active:scale-90"><CloseIcon sx={{ fontSize:14 }} /></button>}
            {!stakeInput && <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><span className="text-xs text-slate-300 dark:text-slate-600 font-medium">min {currency.symbol}{Math.round(minStakeLocal).toLocaleString()}</span></div>}
          </div>
          {belowMinStake && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><InfoOutlinedIcon sx={{ fontSize:13 }} />Min stake: {formatLocal(MIN_STAKE_GHS, currency)}{currency.code!=='GHS'&&<span className="text-amber-500/70 ml-1">(GH₵{MIN_STAKE_GHS})</span>}</p>
              <button onClick={setStakeToMin} className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 ml-3 shrink-0 underline underline-offset-2">Use min</button>
            </div>
          )}
          {insufficientFunds && !belowMinStake && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
              <InfoOutlinedIcon sx={{ fontSize:13 }} className="text-rose-500 shrink-0" />
              <p className="text-xs text-rose-600 dark:text-rose-400">Insufficient balance · available <span className="font-bold">{formatLocal(walletGhs, currency)}</span>{currency.code!=='GHS'&&<span className="text-rose-400/70 ml-1">(GH₵{walletGhs.toFixed(2)})</span>}</p>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amount, idx) => (
              <button key={idx} type="button" onClick={() => addToStake(amount)} className="py-2.5 text-[12px] font-bold bg-slate-50 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-slate-600 dark:text-slate-400 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700 hover:border-red-600">
                +{currency.symbol}{amount>=1000?`${(amount/1000).toFixed(amount%1000===0?0:1)}k`:amount}
              </button>
            ))}
          </div>
          {!currencyLoading && currency.code!=='GHS' && parsedLocal>0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <PublicIcon sx={{ fontSize:14 }} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500">{formatLocal(parsedGhs,currency)} ≈ <span className="font-bold text-slate-700 dark:text-slate-300">GH₵{parsedGhs.toFixed(2)}</span><span className="text-slate-400 ml-1">· bet settled in GH₵</span></p>
            </div>
          )}
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">{betSlip.length} selection{betSlip.length!==1?'s':''}{betSlip.length>1&&<span className="ml-1.5 text-[11px] text-slate-300 dark:text-slate-600">{betSlip.map(s=>s.odd.toFixed(2)).join(' × ')}</span>}</span>
              <span className="font-black text-red-600 bg-red-600/10 px-2.5 py-1 rounded-xl text-sm">{totalOdds.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center gap-2"><TrendingUpIcon sx={{ fontSize:16 }} className="text-emerald-600" /><span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Potential return</span></div>
              <div className="text-right">
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{parsedLocal>0 ? formatLocal(potentialGhs,currency) : '—'}</span>
                {parsedLocal>0 && currency.code!=='GHS' && <p className="text-xs text-slate-400 mt-0.5">GH₵{potentialGhs.toFixed(2)}</p>}
              </div>
            </div>
            {user && (
              <div className="flex justify-between items-center text-xs pt-0.5">
                <span className="text-slate-400 flex items-center gap-1.5"><AccountBalanceWalletIcon sx={{ fontSize:13 }} />Wallet balance</span>
                <div className="text-right">
                  {balanceLoading ? <span className="inline-block w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  : walletBalanceGhs!==null ? (
                    <><span className="text-slate-500 font-semibold">{formatLocal(walletGhs,currency)}</span>{currency.code!=='GHS'&&<p className="text-slate-400 mt-0.5">GH₵{walletGhs.toFixed(2)}</p>}</>
                  ) : <span className="text-slate-400">–</span>}
                </div>
              </div>
            )}
          </div>
          {user ? (
            <button onClick={handlePlace} disabled={!canPlace||placing}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${canPlace&&!placing?'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/25':'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}>
              {placing ? <><CircularProgress fontSize="small" className="animate-spin" /> Placing Bet…</>
              : parsedLocal>0&&canPlace ? <>Place Bet · {formatLocal(parsedGhs,currency)}{currency.code!=='GHS'&&<span className="font-normal opacity-60"> (GH₵{parsedGhs.toFixed(2)})</span>}</>
              : <>Place Bet{belowMinStake?` · min ${currency.symbol}${Math.round(minStakeLocal).toLocaleString()}`:parsedLocal===0?' · enter stake':''}</>}
            </button>
          ) : (
            <Link to="/login" className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"><LoginIcon fontSize="small" /> Log In to Bet</Link>
          )}
          <button onClick={clearBetSlip} className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors">Clear slip</button>
        </div>
      </div>
      <BookingCodePanel />
    </div>
  );
}

// ─── My Bets tab ──────────────────────────────────────────────────────────────
type BetsFilter = 'ALL' | 'PENDING' | 'WON' | 'LOST' | 'VOID';
const EMPTY_STATE: Record<BetsFilter, { emoji: string; label: string; sub: string }> = {
  ALL:     { emoji:'🏟️', label:'No bets yet',   sub:'Your bets will appear here once you start playing.' },
  PENDING: { emoji:'⏳', label:'No active bets', sub:'Placed bets appear here while they are in progress.' },
  WON:     { emoji:'🏆', label:'No wins yet',    sub:'Your winning slips will land here.' },
  LOST:    { emoji:'👋', label:'No losses',      sub:"Bets that didn't hit show here." },
  VOID:    { emoji:'↩️', label:'No voided bets', sub:'Refunded bets appear here.' },
};

function MyBetsTab() {
  const { user, setModalOpen } = useAppStore();
  const [apiBets, setApiBets]   = useState<Bet[]>([]);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter]     = useState<BetsFilter>('ALL');
  const [detailBet, setDetailBet] = useState<Bet | null>(null);
  const [unseenWins, setUnseenWins] = useState<Bet[]>([]);
  const [winPopup, setWinPopup] = useState<Bet | null>(null);
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const didCheckUnseen = useRef(false);

  useEffect(() => { setCurrencyLoading(true); detectCurrencyInfo().then(setCurrency).finally(() => setCurrencyLoading(false)); }, []);

  const normalisedBets  = apiBets.map(normaliseBet);
  const totalStakedGhs  = normalisedBets.reduce((s,b) => s+(b.stake??0), 0);
  const totalWonGhs     = normalisedBets.filter(b=>b.status==='WON').reduce((s,b) => s+(b.potentialReturn??0), 0);
  const settledBets     = normalisedBets.filter(b=>b.status!=='PENDING');
  const winRate         = settledBets.length ? Math.round((normalisedBets.filter(b=>b.status==='WON').length/settledBets.length)*100) : 0;

  const fetchBets = useCallback(async (p = 0) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await betsApi.getMyBets(p, 10);
      if (res.success) { setApiBets(prev => p===0 ? res.data.content : [...prev,...res.data.content]); setTotalPages(res.data.totalPages); setPage(p); }
    } catch (err) { logError('MyBets', err); }
    finally { setLoading(false); }
  }, [user]);

  const checkUnseenWins = useCallback(async () => {
    if (!user || didCheckUnseen.current) return;
    didCheckUnseen.current = true;
    try {
      const res = await betsApi.getUnseenWins();
      if (res.success && res.data.length>0) { setUnseenWins(res.data); setWinPopup(res.data[0]); setModalOpen(true); }
    } catch {}
  }, [user]);

  useEffect(() => { fetchBets(0); checkUnseenWins(); }, [fetchBets, checkUnseenWins]);

  const dismissWin = async (bet: Bet) => {
    try { await betsApi.dismissWin(bet.id); } catch {}
    const remaining = unseenWins.filter(b=>b.id!==bet.id);
    setUnseenWins(remaining); setWinPopup(remaining[0]??null);
    if (!remaining[0]) setModalOpen(false);
  };

  if (!user) return <GuestPrompt message="Log in to view your bets" />;

  const filtered = filter==='ALL' ? normalisedBets : normalisedBets.filter(b=>b.status===filter);
  const FILTERS: { key: BetsFilter; label: string }[] = [
    { key:'ALL',     label:`All (${normalisedBets.length})` },
    { key:'PENDING', label:'Open' },
    { key:'WON',     label:'Won' },
    { key:'LOST',    label:'Lost' },
    { key:'VOID',    label:'Void' },
  ];

  return (
    <div className="space-y-3">
      {normalisedBets.length>0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label:'Staked',   value: formatLocal(totalStakedGhs,currency), color:'text-slate-800 dark:text-slate-100', raw: totalStakedGhs },
            { label:'Won',      value: formatLocal(totalWonGhs,currency),    color:'text-emerald-600',                   raw: totalWonGhs },
            { label:'Win Rate', value: winRate?`${winRate}%`:'—',            color:'text-red-600',                       raw: null },
          ].map(({ label, value, color, raw }) => (
            <div key={label} className="shrink-0 flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
              <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
              {currency.code!=='GHS' && raw!==null && !currencyLoading && <p className="text-[10px] text-slate-400 mt-0.5">GH₵{(raw as number).toFixed(2)}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter===f.key?'bg-red-600 text-white':'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-500/40'}`}>{f.label}</button>
        ))}
        <button onClick={() => fetchBets(0)} className="shrink-0 ml-auto p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600"><RefreshIcon sx={{ fontSize:16 }} /></button>
      </div>
      {loading && apiBets.length===0 && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
              <div className="flex justify-between mb-3"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-14" /></div>
              <Skeleton className="h-3 w-full mb-1.5" /><Skeleton className="h-3 w-3/4 mb-3" />
              <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length===0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">{EMPTY_STATE[filter].emoji}</span>
          <p className="font-semibold text-slate-500">{EMPTY_STATE[filter].label}</p>
          <p className="text-sm text-slate-400 mt-1">{EMPTY_STATE[filter].sub}</p>
          {filter==='ALL' && <Link to="/" className="mt-6 px-5 py-2.5 text-sm rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"><SportsSoccerIcon fontSize="small" /> Browse Matches</Link>}
        </div>
      )}
      {filtered.map(bet => {
        const isWon  = bet.status==='WON';
        const isLost = bet.status==='LOST';
        const isVoid = bet.status==='VOID';
        return (
          <button key={bet.id} onClick={() => { setDetailBet(bet); setModalOpen(true); }}
            className={`w-full text-left bg-white dark:bg-slate-900 rounded-2xl border transition-all active:scale-[0.98] p-4 ${isWon?'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10':isLost?'border-slate-100 dark:border-slate-800 opacity-70':isVoid?'border-blue-100 dark:border-blue-900/40 opacity-70':'border-slate-100 dark:border-slate-800 hover:border-red-500/20'}`}>
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <p className="text-xs text-slate-400">{new Date(bet.placedAt).toLocaleDateString('en-GH',{day:'2-digit',month:'short'})}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{bet.selections.length} selection{bet.selections.length!==1?'s':''}</p>
              </div>
              <StatusBadge status={bet.status} />
            </div>
            <div className="space-y-1 mb-3">
              {bet.selections.slice(0,2).map((sel: BetSelection, i: number) => (
                <p key={sel.id??i} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {buildMatchLabel(sel as unknown as Record<string,unknown>)} · <span className="font-medium text-slate-700 dark:text-slate-300">{sel.market}</span>{' · '}<span className="font-bold text-red-600">{(sel.oddsLocked??0).toFixed(2)}</span><SelectionResult result={sel.result} />
                </p>
              ))}
              {bet.selections.length>2 && <p className="text-xs text-slate-400">+{bet.selections.length-2} more</p>}
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Stake</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatLocal(bet.stake,currency)}</p>
                {currency.code!=='GHS' && !currencyLoading && <p className="text-[10px] text-slate-400">GH₵{bet.stake.toFixed(2)}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Return</p>
                <p className={`text-sm font-bold ${isWon?'text-emerald-600':isVoid?'text-blue-500':'text-slate-500'}`}>
                  {isVoid ? formatLocal(bet.stake,currency) : formatLocal(bet.potentialReturn,currency)}
                </p>
                {currency.code!=='GHS' && !currencyLoading && <p className="text-[10px] text-slate-400">GH₵{(isVoid?bet.stake:bet.potentialReturn).toFixed(2)}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Odds</p>
                <p className="text-sm font-bold text-red-600">{bet.totalOdds.toFixed(2)}x</p>
              </div>
            </div>
          </button>
        );
      })}
      {page<totalPages-1 && !loading && <button onClick={() => fetchBets(page+1)} className="w-full py-3 text-sm font-semibold text-red-600 border border-red-600/20 rounded-2xl hover:bg-red-600/5">Load More</button>}
      {loading && apiBets.length>0 && <div className="flex justify-center py-4"><CircularProgress className="text-red-600 animate-spin" fontSize="small" /></div>}
      {detailBet && <BetDetailSheet bet={detailBet} currency={currency} onClose={() => { setDetailBet(null); setModalOpen(false); }} />}
      {/* Unseen winning bets auto-trigger the premium WinPage */}
      {winPopup && <WinPage bet={winPopup} currency={currency} onClose={() => dismissWin(winPopup)} />}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function BetSlipPage() {
  const { betSlip, user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'slip' | 'bets'>('slip');
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-2 pt-3 pb-1">
            <ChampionBetLogoSvg size={18} />
            <ChampionBetWordmarkDark size={13} />
          </div>
          <div className="flex">
            <button onClick={() => setActiveTab('slip')} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab==='slip'?'border-red-600 text-red-600':'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <ReceiptLongIcon sx={{ fontSize:18 }} /> Bet Slip
              {betSlip.length>0 && <span className="bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{betSlip.length}</span>}
            </button>
            <button onClick={() => setActiveTab('bets')} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab==='bets'?'border-red-600 text-red-600':'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <HistoryIcon sx={{ fontSize:18 }} /> My Bets
              {!user && <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-medium">Login</span>}
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-4">
        {activeTab==='slip' ? <SlipTab /> : <MyBetsTab />}
      </div>
    </div>
  );
}
