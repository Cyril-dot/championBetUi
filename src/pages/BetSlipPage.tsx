import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { formatCurrency, calculateTotalOdds, calculatePotentialReturn } from '../utils';
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
  code: string;
  symbol: string;
  name: string;
  countryCode: string;
  rateFromGhs: number;
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
  code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi',
  countryCode: 'GH', rateFromGhs: 1,
};

let _currencyCache: CurrencyInfo | null = null;
let _currencyInflight: Promise<CurrencyInfo> | null = null;

async function detectCurrencyInfo(): Promise<CurrencyInfo> {
  if (_currencyCache) return _currencyCache;
  if (_currencyInflight) return _currencyInflight;

  _currencyInflight = (async (): Promise<CurrencyInfo> => {
    let countryCode = '';
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (res.ok) countryCode = (await res.json()).country_code ?? '';
    } catch { }
    if (!countryCode) {
      try {
        const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) });
        if (res.ok) countryCode = (await res.json()).countryCode ?? '';
      } catch { }
    }
    if (!countryCode) {
      try {
        const res = await fetch('https://ip.guide/', { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } });
        if (res.ok) countryCode = (await res.json()).location?.country_code ?? '';
      } catch { }
    }
    const localMeta = countryCode ? COUNTRY_CURRENCY[countryCode] : undefined;
    if (!localMeta) { _currencyCache = DEFAULT_CURRENCY; return _currencyCache; }
    let rateFromGhs = 1;
    if (localMeta.code !== 'GHS') {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(5000) });
        if (res.ok) { const d = await res.json(); rateFromGhs = d.rates?.[localMeta.code] ?? 1; }
      } catch { }
      if (rateFromGhs === 1) {
        try {
          const res = await fetch(`https://api.exchangerate.host/convert?from=GHS&to=${localMeta.code}&amount=1`, { signal: AbortSignal.timeout(5000) });
          if (res.ok) { const d = await res.json(); if (d.success && d.result) rateFromGhs = d.result; }
        } catch { }
      }
    }
    _currencyCache = { code: localMeta.code, symbol: localMeta.symbol, name: localMeta.name, countryCode, rateFromGhs };
    return _currencyCache;
  })();
  return _currencyInflight;
}

function formatLocal(amountInGhs: number, currency: CurrencyInfo): string {
  const converted = amountInGhs * currency.rateFromGhs;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency.code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
  } catch {
    return `${currency.symbol}${converted.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function localToGhs(localAmount: number, currency: CurrencyInfo): number {
  if (!currency.rateFromGhs) return localAmount;
  return localAmount / currency.rateFromGhs;
}

function ghsToLocal(ghsAmount: number, currency: CurrencyInfo): number {
  return ghsAmount * currency.rateFromGhs;
}

const MIN_STAKE_GHS = 300;

const DEBUG = (() => { try { return localStorage.getItem('WINNINGBET_DEBUG') === 'true'; } catch { return false; } })();
function log(area: string, ...args: unknown[]) { if (!DEBUG) return; console.log(`%c[WinningBet:${area}]`, 'color:#dc2626;font-weight:bold', ...args); }
function logError(area: string, ...args: unknown[]) { console.error(`[WinningBet:${area}]`, ...args); }

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
    if (!isNaN(n) && n > 1) { log('extractOdds', `✅ using "${key}" =`, n); return n; }
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

// ─── WinningBet Logo SVG ──────────────────────────────────────────────────────

function WinningBetLogoSvg({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="28" cy="28" r="26" fill="#dc2626" />
      <circle cx="28" cy="28" r="20" fill="none" stroke="white" strokeWidth="3" />
      <text x="28" y="31" textAnchor="middle" fontSize="9" fontWeight="900"
        fontFamily="Georgia,serif" fill="white" letterSpacing="-0.5">WIN</text>
    </svg>
  );
}

/** Inline wordmark for dark backgrounds */
function WinningBetWordmarkDark({ size = 14 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', lineHeight: 1 }}>
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 900, fontStyle: 'italic',
        fontSize: size, letterSpacing: '-0.02em', color: '#ffffff',
      }}>Winning</span>
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 900, fontStyle: 'italic',
        fontSize: size, letterSpacing: '-0.02em', color: '#ef4444',
      }}>Bet</span>
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
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${cfg[s] ?? cfg.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function SelectionResult({ result }: { result?: string }) {
  if (!result) return null;
  const isWon = result === 'WON';
  return (
    <span className={`text-xs font-semibold ml-1 ${isWon ? 'text-emerald-600' : 'text-rose-500'}`}>
      {isWon ? '✓' : '✗'}
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`} />;
}

function CurrencyPill({ currency, detecting }: { currency: CurrencyInfo; detecting: boolean }) {
  if (detecting) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 animate-pulse">
        <PublicIcon sx={{ fontSize: 12 }} /> Detecting…
      </span>
    );
  }
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
      <div className="w-14 h-14 rounded-2xl bg-red-600/10 flex items-center justify-center mb-4">
        <LoginIcon className="text-red-600" sx={{ fontSize: 28 }} />
      </div>
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{message}</p>
      <p className="text-sm text-slate-400 mb-6">Sign in to get started</p>
      <Link to="/login" className="btn-primary px-6 py-2.5 text-sm rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white">
        <LoginIcon fontSize="small" /> Log In
      </Link>
      <Link to="/register" className="mt-3 text-sm text-red-600 font-medium hover:underline">
        Create account
      </Link>
    </div>
  );
}

// ─── Share slip image generator ───────────────────────────────────────────────

async function generateSlipImage(bet: Bet, isWin: boolean, currency: CurrencyInfo): Promise<string> {
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:380px;background:#0f0f0f;border-radius:24px;overflow:hidden;font-family:'Inter',sans-serif;`;

  const payoutGhs = bet.potentialReturn;
  const headlineAmount = isWin ? formatLocal(payoutGhs, currency) : formatLocal(bet.stake, currency);
  const headlineSubGhs = currency.code !== 'GHS' ? (isWin ? `(GH₵${payoutGhs.toFixed(2)})` : `(GH₵${bet.stake.toFixed(2)})`) : '';

  container.innerHTML = `
    <style>* { box-sizing: border-box; margin: 0; padding: 0; }</style>
    <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a0000 50%, #0f0f0f 100%);">
      <div style="background: linear-gradient(90deg, #7f1d1d, #dc2626, #7f1d1d); padding:6px 20px; display:flex; align-items:center; justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:6px;">
          <span style="width:18px;height:18px;background:#dc2626;border:2px solid white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:6px;font-weight:900;color:white;font-family:Georgia,serif;">WIN</span>
          <span style="font-size:13px;font-weight:900;font-family:Georgia,serif;font-style:italic;color:#fff;">Winning<span style="color:#ef4444;">Bet</span></span>
        </span>
        <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.7);">Bet Slip</span>
      </div>
      <div style="padding:24px 24px 16px;text-align:center;">
        <div style="font-size:14px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#ef4444;margin-bottom:8px;">${isWin ? '🏆 YOU WON!' : '😭 BETTER LUCK NEXT TIME'}</div>
        <div style="font-size:38px;font-weight:900;color:#ffffff;line-height:1.1;">${headlineAmount}</div>
        ${headlineSubGhs ? `<div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:4px;">${headlineSubGhs}</div>` : ''}
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">Your bet on WinningBet.</div>
      </div>
      <div style="background:rgba(255,255,255,0.05);margin:0 16px;border-radius:12px;overflow:hidden;">
        <div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:0;padding:8px 12px;background:rgba(220,38,38,0.4);">
          <span style="font-size:10px;font-weight:800;color:#ffffff;text-transform:uppercase;padding-right:12px;">#</span>
          <span style="font-size:10px;font-weight:800;color:#ffffff;text-transform:uppercase;">SELECTION</span>
          <span style="font-size:10px;font-weight:800;color:#ffffff;text-transform:uppercase;padding:0 12px;">ODDS</span>
          <span style="font-size:10px;font-weight:800;color:#ffffff;text-transform:uppercase;">RESULT</span>
        </div>
        ${bet.selections.map((sel, i) => `
          <div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:0;padding:10px 12px;border-top:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:12px;font-weight:800;color:#ef4444;padding-right:12px;">${i + 1}</span>
            <div>
              <div style="font-size:12px;font-weight:700;color:#fff;">${sel.selection}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.4);">${sel.homeTeam && sel.awayTeam ? `${sel.homeTeam} vs ${sel.awayTeam}` : sel.matchId}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.5);">${sel.market}</div>
            </div>
            <span style="font-size:12px;font-weight:800;color:#fff;padding:0 12px;">${sel.oddsLocked.toFixed(2)}</span>
            <span style="font-size:12px;font-weight:800;color:${sel.result === 'WON' ? '#22c55e' : sel.result === 'LOST' ? '#ef4444' : '#94a3b8'};">${sel.result === 'WON' ? 'WON ✓' : sel.result === 'LOST' ? 'LOST ✗' : '—'}</span>
          </div>
        `).join('')}
      </div>
      <div style="padding:16px 24px;display:flex;justify-content:space-between;gap:8px;margin-top:8px;">
        <div style="text-align:center;flex:1;">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">TOTAL ODDS</div>
          <div style="font-size:14px;font-weight:900;color:#ef4444;">${bet.totalOdds.toFixed(2)}</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">STAKE</div>
          <div style="font-size:14px;font-weight:900;color:#fff;">${formatLocal(bet.stake, currency)}</div>
          ${currency.code !== 'GHS' ? `<div style="font-size:10px;color:rgba(255,255,255,0.3);">GH₵${bet.stake.toFixed(2)}</div>` : ''}
        </div>
        <div style="text-align:center;flex:1;">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">TOTAL WINNINGS</div>
          <div style="font-size:14px;font-weight:900;color:#ffffff;">${formatLocal(bet.potentialReturn, currency)}</div>
          ${currency.code !== 'GHS' ? `<div style="font-size:10px;color:rgba(255,255,255,0.3);">GH₵${bet.potentialReturn.toFixed(2)}</div>` : ''}
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:10px 24px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:10px;color:rgba(255,255,255,0.3);">${new Date(bet.placedAt).toLocaleString()}</div>
        <span style="font-size:12px;font-weight:900;font-family:Georgia,serif;font-style:italic;color:#fff;">Winning<span style="color:#ef4444;">Bet</span></span>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(container);
  }
}

// ─── Share image modal ────────────────────────────────────────────────────────

function ShareImageModal({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl; a.download = `winningbet-slip-${Date.now()}.png`; a.click();
  };
  const handleShare = async () => {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'winningbet-bet.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My WinningBet Bet Slip' });
      } else { handleDownload(); }
    } catch { handleDownload(); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-base">Your Bet Slip</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"><CloseIcon fontSize="small" /></button>
        </div>
        <div className="p-4"><img src={imageUrl} alt="Bet slip" className="w-full rounded-2xl shadow-xl" /></div>
        <div className="px-4 pb-5 flex gap-3">
          <button onClick={handleDownload} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            <DownloadIcon fontSize="small" /> Save
          </button>
          <button onClick={handleShare} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            <ShareIcon fontSize="small" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WIN MODAL ────────────────────────────────────────────────────────────────

function WinModal({ bet, currency, onClose }: { bet: Bet; currency: CurrencyInfo; onClose: () => void }) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [sparkles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      color: ['#dc2626','#ef4444','#ffffff','#b91c1c','#f87171','#fca5a5'][Math.floor(Math.random() * 6)],
      shape: Math.random() > 0.5 ? '50%' : '2px',
    }))
  );

  const payoutGhs = bet.potentialReturn;
  const payoutLocal = ghsToLocal(payoutGhs, currency);
  const bonusGhs = payoutGhs - (bet.stake * bet.totalOdds);
  const hasBonus = bonusGhs > 0.5;

  const placedDate = bet.placedAt
    ? new Date(bet.placedAt).toLocaleString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: false, month: '2-digit', day: '2-digit', year: 'numeric' }).replace(',', '')
    : '';

  const handleShowOff = async () => {
    setGeneratingImage(true);
    try { const url = await generateSlipImage(bet, true, currency); setShareImageUrl(url); }
    catch (err) { logError('WinModal', err); }
    finally { setGeneratingImage(false); }
  };

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
        @keyframes winSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-6px) scale(1.03); }
        }
        @keyframes rayRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmerRed {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseRed {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        .win-modal-enter { animation: winSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .trophy-anim { animation: trophyBounce 2.5s ease-in-out infinite; }
        .rays-anim { animation: rayRotate 14s linear infinite; }
        .shimmer-red-text {
          background: linear-gradient(90deg, #dc2626 0%, #ffffff 40%, #dc2626 60%, #ef4444 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerRed 2.5s linear infinite;
        }
        .win-amount-anim { animation: countUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
      `}</style>

      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/90" onClick={onClose} />

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          {sparkles.map(s => (
            <div key={s.id} style={{
              position: 'absolute', left: `${s.left}%`, top: '-16px',
              width: `${s.size}px`, height: `${s.size * (Math.random() > 0.5 ? 1.5 : 1)}px`,
              backgroundColor: s.color, borderRadius: s.shape, opacity: 0,
              animation: `confettiFall ${s.duration}s ease-in ${s.delay}s forwards`,
            }} />
          ))}
        </div>

        {/* Modal card */}
        <div
          className="relative z-20 w-full sm:max-w-md overflow-hidden win-modal-enter"
          style={{
            background: 'linear-gradient(180deg, #0a0000 0%, #1a0000 40%, #0a0000 100%)',
            borderTop: '1px solid rgba(220,38,38,0.5)',
            borderLeft: '1px solid rgba(220,38,38,0.2)',
            borderRight: '1px solid rgba(220,38,38,0.2)',
            borderRadius: '24px 24px 0 0',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
            maxHeight: '95vh',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>

          {/* ── HERO SECTION ── */}
          <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a0000 0%, #0d0000 100%)', paddingTop: '32px', paddingBottom: '24px' }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 60%, rgba(220,38,38,0.2) 0%, rgba(185,28,28,0.08) 40%, transparent 70%)',
            }} />

            {/* Rotating rays — subtle red */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '10%' }}>
              <div className="rays-anim" style={{ width: '280px', height: '280px', opacity: 0.1 }}>
                <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {Array.from({ length: 16 }, (_, i) => {
                    const angle = (i * 360) / 16;
                    const rad = (angle * Math.PI) / 180;
                    const x1 = 140 + 50 * Math.cos(rad); const y1 = 140 + 50 * Math.sin(rad);
                    const x2 = 140 + 140 * Math.cos(rad); const y2 = 140 + 140 * Math.sin(rad);
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#dc2626" strokeWidth="2" />;
                  })}
                </svg>
              </div>
            </div>

            {/* WinningBet branding */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <WinningBetLogoSvg size={22} />
              <WinningBetWordmarkDark size={16} />
            </div>

            {/* YOU WON */}
            <div className="text-center mb-3">
              <h1 className="shimmer-red-text font-black" style={{ fontSize: '42px', letterSpacing: '0.05em', lineHeight: 1 }}>
                YOU WON!
              </h1>
            </div>

            {/* Trophy SVG */}
            <div className="flex justify-center mb-3">
              <div className="trophy-anim relative">
                <div style={{
                  position: 'absolute', inset: '-20px', borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(220,38,38,0.18) 0%, transparent 70%)',
                  animation: 'pulseRed 2.5s ease-in-out infinite',
                }} />
                <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="trophyGradWB" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e2e8f0"/>
                      <stop offset="30%" stopColor="#cbd5e1"/>
                      <stop offset="60%" stopColor="#94a3b8"/>
                      <stop offset="100%" stopColor="#64748b"/>
                    </linearGradient>
                    <linearGradient id="trophyShineWB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2"/>
                    </linearGradient>
                    <radialGradient id="cupGlowWB" cx="50%" cy="30%" r="60%">
                      <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.5"/>
                      <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0"/>
                    </radialGradient>
                    <filter id="glowWB">
                      <feGaussianBlur stdDeviation="2" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <rect x="52" y="138" width="56" height="8" rx="4" fill="url(#trophyGradWB)" filter="url(#glowWB)"/>
                  <rect x="44" y="134" width="72" height="8" rx="4" fill="url(#trophyGradWB)" filter="url(#glowWB)"/>
                  <rect x="68" y="112" width="24" height="24" rx="3" fill="url(#trophyGradWB)" filter="url(#glowWB)"/>
                  <rect x="72" y="112" width="16" height="24" rx="2" fill="url(#trophyShineWB)" opacity="0.4"/>
                  <path d="M36 28 L124 28 L116 92 Q110 116 80 116 Q50 116 44 92 Z" fill="url(#trophyGradWB)" filter="url(#glowWB)"/>
                  <path d="M46 28 L90 28 L84 85 Q78 108 60 112 Q44 100 44 92 Z" fill="url(#cupGlowWB)" opacity="0.4"/>
                  <path d="M50 35 L110 35 L103 88 Q98 108 80 110 Q62 108 57 88 Z" fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
                  <path d="M36 38 Q16 38 16 58 Q16 76 36 76" stroke="url(#trophyGradWB)" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#glowWB)"/>
                  <path d="M36 44 Q22 44 22 58 Q22 72 36 70" stroke="url(#trophyShineWB)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
                  <path d="M124 38 Q144 38 144 58 Q144 76 124 76" stroke="url(#trophyGradWB)" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#glowWB)"/>
                  <path d="M124 44 Q138 44 138 58 Q138 72 124 70" stroke="url(#trophyShineWB)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
                  <text x="80" y="82" textAnchor="middle" fontSize="28" fill="#e2e8f0" opacity="0.7">★</text>
                  <text x="80" y="58" textAnchor="middle" fontSize="7" fontWeight="900" fill="#475569" letterSpacing="1" opacity="0.9">WINNING</text>
                  <text x="80" y="70" textAnchor="middle" fontSize="8" fontWeight="900" fill="#dc2626" letterSpacing="1" opacity="0.9">BET</text>
                  <rect x="48" y="120" width="64" height="16" rx="3" fill="#dc2626"/>
                  <text x="80" y="131" textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff" letterSpacing="2">WINNER</text>
                </svg>
              </div>
            </div>

            {/* Payout amount */}
            <div className="text-center win-amount-anim">
              <div className="font-black" style={{ fontSize: '32px', color: '#ffffff', letterSpacing: '-0.5px' }}>
                {formatLocal(payoutGhs, currency)}
              </div>
              {currency.code !== 'GHS' && (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  GH₵{payoutGhs.toFixed(2)}
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'rgba(239,68,68,0.8)', marginTop: '4px', fontWeight: 600 }}>
                Congrats! Your bet was successful.
              </div>
            </div>
          </div>

          {/* ── TICKET DETAILS ── */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 380px)' }}>

            <div className="grid grid-cols-3 gap-0 mx-4 mt-4 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(220,38,38,0.2)' }}>
              {[
                { icon: '🎫', label: 'TICKET ID', value: `WB${bet.id.slice(-8).toUpperCase()}` },
                { icon: '📅', label: 'DATE', value: placedDate },
                { icon: '🏆', label: 'BET TYPE', value: bet.selections.length > 1 ? 'MULTIPLE' : 'SINGLE' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-3 px-2 text-center" style={{ background: 'rgba(255,255,255,0.03)', borderRight: i < 2 ? '1px solid rgba(220,38,38,0.1)' : 'none' }}>
                  <span style={{ fontSize: '14px', marginBottom: '3px' }}>{item.icon}</span>
                  <span style={{ fontSize: '9px', color: 'rgba(220,38,38,0.7)', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '2px' }}>{item.label}</span>
                  <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-3 mx-4">
              <div className="flex items-center gap-2 px-5 py-2 rounded-xl border" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e' }} />
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#22c55e', letterSpacing: '2px' }}>WON</span>
              </div>
            </div>

            {/* Selections table */}
            <div className="mx-4 mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(220,38,38,0.2)' }}>
              <div className="grid gap-0 px-3 py-2" style={{ gridTemplateColumns: '20px 1fr 50px 56px', background: 'rgba(220,38,38,0.4)' }}>
                {['#', 'SELECTION', 'ODDS', 'RESULT'].map(h => (
                  <span key={h} style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {bet.selections.map((sel, i) => {
                const isWon = sel.result === 'WON';
                const isLost = sel.result === 'LOST';
                const matchLabel = buildMatchLabel(sel as unknown as Record<string, unknown>);
                return (
                  <div
                    key={sel.id ?? i}
                    className="grid gap-0 px-3 py-3"
                    style={{
                      gridTemplateColumns: '20px 1fr 50px 56px',
                      borderTop: '1px solid rgba(220,38,38,0.1)',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', paddingTop: '2px' }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                        {sel.selection || sel.market}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px', lineHeight: 1.3 }}>
                        {matchLabel}
                      </div>
                      <div style={{ fontSize: '9px', color: 'rgba(239,68,68,0.5)', marginTop: '1px' }}>
                        {sel.market}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', paddingTop: '2px' }}>
                      {sel.oddsLocked.toFixed(2)}
                    </span>
                    <div style={{ paddingTop: '2px' }}>
                      {sel.result ? (
                        <span style={{
                          fontSize: '10px', fontWeight: 800,
                          color: isWon ? '#22c55e' : isLost ? '#ef4444' : '#94a3b8',
                          display: 'flex', alignItems: 'center', gap: '3px',
                        }}>
                          {isWon ? '✓' : isLost ? '✗' : '—'} {sel.result}
                        </span>
                      ) : <span style={{ fontSize: '10px', color: '#94a3b8' }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dashed separator */}
            <div className="mx-4 my-3 relative flex items-center">
              <div style={{ flex: 1, borderTop: '1.5px dashed rgba(220,38,38,0.25)' }} />
              <div className="mx-2"><WinningBetLogoSvg size={14} /></div>
              <div style={{ flex: 1, borderTop: '1.5px dashed rgba(220,38,38,0.25)' }} />
            </div>

            {/* Summary rows */}
            <div className="mx-4 space-y-2.5 pb-3">
              {[
                { label: 'TOTAL ODDS:', value: bet.totalOdds.toFixed(2), valueColor: '#ef4444' },
                { label: 'STAKE:', value: formatLocal(bet.stake, currency), sub: currency.code !== 'GHS' ? `GH₵${bet.stake.toFixed(2)}` : undefined, valueColor: '#fff' },
                ...(hasBonus ? [{ label: 'BONUS:', value: formatLocal(bonusGhs, currency), sub: currency.code !== 'GHS' ? `GH₵${bonusGhs.toFixed(2)}` : undefined, valueColor: '#22c55e' }] : []),
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>{row.label}</span>
                  <div className="text-right">
                    <span style={{ fontSize: '14px', fontWeight: 800, color: row.valueColor }}>{row.value}</span>
                    {(row as any).sub && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{(row as any).sub}</p>}
                  </div>
                </div>
              ))}

              <div className="flex items-start justify-between pt-2 mt-1" style={{ borderTop: '1.5px solid rgba(220,38,38,0.3)' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.5px' }}>TOTAL WINNINGS:</span>
                <div className="text-right">
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                    {formatLocal(payoutGhs, currency)}
                  </span>
                  {currency.code !== 'GHS' && (
                    <p style={{ fontSize: '11px', color: 'rgba(239,68,68,0.6)', marginTop: '2px' }}>GH₵{payoutGhs.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {currency.code !== 'GHS' && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
                  <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(239,68,68,0.7)', flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                    GH₵{payoutGhs.toFixed(2)} credited to your wallet · displayed as{' '}
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{formatLocal(payoutGhs, currency)}</span> in {currency.code}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="px-4 pt-2 pb-2 flex gap-3">
              <button
                onClick={handleShowOff}
                disabled={generatingImage}
                className="flex-1 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', boxShadow: '0 4px 20px rgba(34,197,94,0.25)' }}
              >
                {generatingImage ? <><CircularProgress fontSize="small" className="animate-spin" /> Generating…</> : <><ShareIcon fontSize="small" /> Share Slip</>}
              </button>
              <Link
                to="/wallet"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl font-black text-sm flex items-center justify-center transition-all active:scale-[0.97]"
                style={{ background: 'rgba(220,38,38,0.2)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                Withdraw
              </Link>
            </div>

            <button onClick={onClose} className="w-full pb-4 text-xs font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Continue Betting
            </button>
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
    ? new Date(bet.placedAt).toLocaleString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true, month: 'numeric', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <>
      <style>{`
        @keyframes stakeSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative z-20 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', animation: 'stakeSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) both', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black px-2.5 py-1 rounded-md" style={{ background: '#dc2626', color: '#fff', letterSpacing: '0.05em' }}>Lost</span>
              <span className="text-sm text-slate-400">{placedDate}</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <CloseIcon sx={{ fontSize: 17 }} />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            {bet.selections.map((sel, i) => {
              const matchLabel = buildMatchLabel(sel as unknown as Record<string, unknown>);
              const settledAt = bet.settledAt ? new Date(bet.settledAt).toLocaleString('en-GH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
              const isWonSel = sel.result === 'WON';
              return (
                <div key={sel.id ?? i} className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <SportsSoccerIcon sx={{ fontSize: 15 }} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-white truncate">{matchLabel}</p>
                  </div>
                  {settledAt && <p className="text-xs text-slate-400 mb-3">{settledAt}</p>}
                  <div className="inline-flex items-center px-3 py-1.5 rounded-lg mb-2 text-sm font-bold text-white" style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
                    {sel.selection}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{sel.market}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: isWonSel ? '#22c55e' : '#ef4444', fontSize: 16 }}>{isWonSel ? '✓' : '✗'}</span>
                      <span className="text-sm font-bold text-white">{sel.selection}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{(sel.oddsLocked ?? bet.totalOdds).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}

            {/* WinningBet divider */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="flex items-center gap-1.5">
                <WinningBetLogoSvg size={14} />
                <WinningBetWordmarkDark size={13} />
              </div>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <div className="px-4 py-3 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Odds</span><span className="text-sm font-bold" style={{ color: '#ef4444' }}>{bet.totalOdds.toFixed(2)}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Stake</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{formatLocal(bet.stake, currency)}</span>
                  {currency.code !== 'GHS' && <p className="text-xs text-slate-500 mt-0.5">GH₵{bet.stake.toFixed(2)}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Payout</span><span className="text-base font-black" style={{ color: '#ef4444' }}>{formatLocal(0, currency)}</span></div>
            </div>
            <div className="px-4 py-4 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]" style={{ background: '#dc2626', color: '#fff' }}>Try Again</button>
              <button onClick={handleShowOff} disabled={generatingImage} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}>
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

function BetDetailSheet({ bet, currency, onClose }: { bet: Bet; currency: CurrencyInfo; onClose: () => void }) {
  const { setModalOpen } = useAppStore();
  const [showWin, setShowWin] = useState(false);
  const [showLoss, setShowLoss] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 80px - env(safe-area-inset-bottom))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
          <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 z-10">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Bet Details</h3>
              <p className="text-xs text-slate-400 mt-0.5">#{bet.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={bet.status} />
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><CloseIcon fontSize="small" /></button>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            {bet.selections.map((sel, i) => (
              <div key={sel.id ?? i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-xs text-slate-400 truncate">{buildMatchLabel(sel as unknown as Record<string, unknown>)}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sel.market}: {sel.selection}<SelectionResult result={sel.result} /></p>
                </div>
                <span className="font-bold text-red-600 text-sm shrink-0">{sel.oddsLocked.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 mx-5" />
          <div className="px-5 py-4 space-y-2.5">
            {[
              { label: `Stake (${currency.code})`, value: formatLocal(bet.stake, currency), sub: currency.code !== 'GHS' ? `GH₵${bet.stake.toFixed(2)}` : undefined },
              { label: 'Total Odds', value: bet.totalOdds.toFixed(2) },
              { label: `Potential Return (${currency.code})`, value: formatLocal(bet.potentialReturn, currency), sub: currency.code !== 'GHS' ? `GH₵${bet.potentialReturn.toFixed(2)}` : undefined, highlight: true },
              { label: 'Placed At', value: new Date(bet.placedAt).toLocaleString() },
              ...(bet.settledAt ? [{ label: 'Settled At', value: new Date(bet.settledAt).toLocaleString() }] : []),
            ].map(({ label, value, sub, highlight }) => (
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
                onClick={() => {
                  if (bet.status === 'WON') { setShowWin(true); setModalOpen(true); }
                  else { setShowLoss(true); setModalOpen(true); }
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${bet.status === 'WON' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                {bet.status === 'WON' ? '🏆 View Winnings' : '😭 View Result'}
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
      {showWin  && <WinModal  bet={bet} currency={currency} onClose={() => { setShowWin(false); setModalOpen(false); onClose(); }} />}
      {showLoss && <LossModal bet={bet} currency={currency} onClose={() => { setShowLoss(false); setModalOpen(false); onClose(); }} />}
    </>
  );
}

// ─── Booking code panel ───────────────────────────────────────────────────────

function BookingCodePanel() {
  const { clearBetSlip, addToBetSlip, showToast, user } = useAppStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleLoad = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(null); setPreview(null);
    try {
      const res = await booking.redeem({ code: code.trim().toUpperCase() });
      if (res.success && res.data) { setPreview(res.data); }
      else { setError('Invalid or expired booking code.'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid booking code.');
    } finally { setLoading(false); }
  };

  const handleAddToSlip = () => {
    if (!preview) return;
    if (!user) { showToast('Log in to place this bet', 'info'); navigate('/login'); return; }
    const enriched: Record<string, unknown>[] = preview.enrichedSelections ?? [];
    const mapped = enriched.map(s => ({
      matchId: String(s.matchId ?? s.match_id ?? s.fixtureId ?? s.fixture_id ?? ''),
      matchName: buildMatchLabel(s),
      market: String(s.market ?? s.marketKey ?? ''),
      selection: String(s.selection ?? s.pick ?? s.name ?? s.label ?? ''),
      odd: extractOdds(s),
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
        <button
          onClick={() => setExpanded(true)}
          className="w-full group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-red-500/40 dark:hover:border-red-500/40 hover:bg-red-600/[0.03] transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-red-600/10 flex items-center justify-center transition-colors shrink-0">
            <QrCodeIcon sx={{ fontSize: 16 }} className="text-slate-400 group-hover:text-red-600 transition-colors" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">Have a booking code?</p>
            <p className="text-xs text-slate-400">Tap to load selections instantly</p>
          </div>
          <svg className="ml-auto shrink-0 text-slate-300 group-hover:text-red-600 transition-colors" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {(expanded || preview) && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-600/10 flex items-center justify-center"><QrCodeIcon sx={{ fontSize: 13 }} className="text-red-600" /></div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Booking Code</span>
            </div>
            {!preview && (
              <button onClick={() => { setExpanded(false); setError(null); setCode(''); }} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <CloseIcon sx={{ fontSize: 15 }} />
              </button>
            )}
          </div>
          {!preview && (
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  type="text" value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="e.g. ABC12345"
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-mono tracking-widest uppercase bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${error ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-700 focus:ring-red-500/20 focus:border-red-500/50'}`}
                  disabled={loading} onKeyDown={e => e.key === 'Enter' && handleLoad()} autoFocus
                />
                <button onClick={handleLoad} disabled={loading || !code.trim()} className="px-5 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all active:scale-95 shrink-0 flex items-center gap-2">
                  {loading ? <CircularProgress sx={{ fontSize: 16 }} className="animate-spin" /> : 'Load'}
                </button>
              </div>
              {error && <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-500"><InfoOutlinedIcon sx={{ fontSize: 13 }} /><span>{error}</span></div>}
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
                  <p className="text-xs text-slate-400">{selectionCount} selection{selectionCount !== 1 ? 's' : ''} · Odds: <span className="font-bold text-red-600">{totalOdds.toFixed(2)}x</span></p>
                </div>
                <button onClick={() => { setPreview(null); setCode(''); setExpanded(true); }} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors shrink-0"><CloseIcon sx={{ fontSize: 16 }} /></button>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 px-1">
                {(preview.enrichedSelections ?? []).map((sel: Record<string, unknown>, i: number) => {
                  const odds = extractOdds(sel);
                  return (
                    <div key={i} className="px-3 py-2.5 flex justify-between items-center">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-[11px] text-slate-400 truncate mb-0.5">{buildMatchLabel(sel)}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{String(sel.market ?? '')}<span className="text-slate-400 font-normal mx-1">·</span>{String(sel.selection ?? '')}</p>
                      </div>
                      <span className="text-xs font-black text-red-600 shrink-0 bg-red-600/8 dark:bg-red-600/15 px-2 py-1 rounded-lg">{odds > 1 ? odds.toFixed(2) : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 pb-4 pt-3">
                <button onClick={handleAddToSlip} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-red-600/20">
                  <CheckCircleIcon sx={{ fontSize: 17 }} />
                  {user ? `Add ${selectionCount} Selection${selectionCount !== 1 ? 's' : ''} to Slip` : `Log in & Add ${selectionCount} Selection${selectionCount !== 1 ? 's' : ''}`}
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
  const [stakeInput, setStakeInput] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [walletBalanceGhs, setWalletBalanceGhs] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const stakeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrencyLoading(true);
    detectCurrencyInfo().then(setCurrency).finally(() => setCurrencyLoading(false));
  }, []);

  const minStakeLocal = ghsToLocal(MIN_STAKE_GHS, currency);
  const QUICK_AMOUNTS = [minStakeLocal, minStakeLocal * 2, minStakeLocal * 5, minStakeLocal * 10]
    .map(v => currency.code === 'GHS' ? Math.round(v * 100) / 100 : Math.round(v));

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    setBalanceLoading(true);
    try {
      const res = await walletApi.getWallet();
      if (res.success && res.data) {
        const d = res.data as Record<string, unknown>;
        const balGhs = typeof d.balance === 'number' ? d.balance : typeof d.mainBalance === 'number' ? d.mainBalance : typeof d.availableBalance === 'number' ? d.availableBalance : null;
        setWalletBalanceGhs(balGhs);
      }
    } catch (err) { logError('SlipTab', err); }
    finally { setBalanceLoading(false); }
  }, [user]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const totalOdds = calculateTotalOdds(betSlip.map(s => s.odd));
  const parsedLocal = parseFloat(stakeInput) || 0;
  const parsedGhs = localToGhs(parsedLocal, currency);
  const potentialGhs = calculatePotentialReturn(parsedGhs, totalOdds);

  const walletGhs = walletBalanceGhs ?? 0;

  const belowMinStake = parsedLocal > 0 && parsedLocal < minStakeLocal;
  const insufficientFunds = parsedLocal > 0 && walletBalanceGhs !== null && parsedGhs > walletGhs;
  const canPlace = !!user && parsedLocal >= minStakeLocal && !insufficientFunds && betSlip.length > 0;

  const addToStake = (amount: number) => {
    const next = (parseFloat(stakeInput) || 0) + amount;
    setStakeInput(currency.code === 'GHS' ? next.toFixed(2) : String(Math.round(next)));
  };

  const setStakeToMin = () => {
    setStakeInput(currency.code === 'GHS' ? minStakeLocal.toFixed(2) : String(Math.round(minStakeLocal)));
    stakeInputRef.current?.focus();
  };

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
    if (cleaned === '' || (!isNaN(Number(cleaned)) && Number(cleaned) >= 0)) setStakeInput(cleaned);
  };

  const clearStake = () => { setStakeInput(''); stakeInputRef.current?.focus(); };

  const handlePlace = async () => {
    if (!user) { navigate('/login'); return; }
    if (parsedGhs < MIN_STAKE_GHS) { showToast(`Minimum stake is ${formatLocal(MIN_STAKE_GHS, currency)}`, 'error'); return; }
    setPlacing(true);
    try {
      const verifiedSelections = await Promise.all(betSlip.map(async s => {
        if (!s.matchId) return { matchId: s.matchId, market: s.market, selection: s.selection, submittedOdds: Number(s.odd) };
        try {
          const res = await publicMatches.odds(s.matchId);
          if (res.success && Array.isArray(res.data)) {
            const match = res.data.find((o: any) => (o.market === s.market || o.marketKey === s.market) && (o.selection === s.selection || o.name === s.selection));
            return { matchId: s.matchId, market: s.market, selection: s.selection, submittedOdds: match ? Number(match.value ?? match.odds ?? s.odd) : Number(s.odd) };
          }
        } catch { }
        return { matchId: s.matchId, market: s.market, selection: s.selection, submittedOdds: Number(s.odd) };
      }));
      const payload = {
        stake: parsedGhs, currency: 'GHS',
        selections: verifiedSelections.map(s => ({ matchId: s.matchId, fixtureId: s.matchId, market: s.market, selection: s.selection, submittedOdds: s.submittedOdds })) as any,
      };
      const res = await betsApi.place(payload);
      if (res.success) { clearBetSlip(); setStakeInput(''); setPlaced(true); showToast('Bet placed successfully!', 'success'); fetchBalance(); }
      else { throw new Error((res as any).message ?? 'Failed to place bet.'); }
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed to place bet.', 'error'); }
    finally { setPlacing(false); }
  };

  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
          <CheckCircleIcon className="text-emerald-600" sx={{ fontSize: 36 }} />
        </div>
        <p className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">Bet Placed!</p>
        <p className="text-sm text-slate-400 mb-6">Check My Bets for updates.</p>
        <button onClick={() => setPlaced(false)} className="px-6 py-2.5 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white font-bold">New Bet</button>
      </div>
    );
  }

  if (betSlip.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <ReceiptLongIcon className="text-slate-400" sx={{ fontSize: 28 }} />
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Your slip is empty</p>
        <p className="text-sm text-slate-400 mb-6">Tap any odds on the matches page to add selections</p>
        <Link to="/" className="px-5 py-2.5 text-sm rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold">
          <SportsSoccerIcon fontSize="small" /> Browse Matches
        </Link>
        <div className="w-full mt-6"><BookingCodePanel /></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {betSlip.map(sel => (
          <div key={`${sel.matchId}-${sel.market}-${sel.selection}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate leading-tight flex-1 mr-2">{sel.matchName}</p>
              <button onClick={() => removeFromBetSlip(sel.matchId, sel.market, sel.selection)} className="p-1.5 text-slate-300 hover:text-rose-500 active:scale-90 transition-all rounded-lg shrink-0">
                <DeleteIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{sel.market}{sel.selection && <span className="text-slate-400 font-normal"> · {sel.selection}</span>}</p>
              </div>
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
            <div className="w-6 h-6 rounded-lg bg-red-600/10 flex items-center justify-center"><AccountBalanceWalletIcon sx={{ fontSize: 13 }} className="text-red-600" /></div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Stake</p>
          </div>
          <div className="flex items-center gap-2">
            {user && walletBalanceGhs !== null && !balanceLoading && (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{formatLocal(walletGhs, currency)}</span>
            )}
            {user && balanceLoading && <span className="inline-block w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />}
            <CurrencyPill currency={currency} detecting={currencyLoading} />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none select-none z-10" style={{ width: '52px' }}>
              <span className="text-base font-black text-slate-500 dark:text-slate-400 leading-none">{currency.symbol}</span>
            </div>
            <input
              ref={stakeInputRef}
              type="text" inputMode="decimal" value={stakeInput}
              onChange={handleStakeChange} placeholder="0"
              className={['w-full rounded-2xl border-2 text-2xl font-black', 'bg-slate-50 dark:bg-slate-800', 'text-slate-800 dark:text-slate-100', 'placeholder:text-slate-300 dark:placeholder:text-slate-600', 'outline-none transition-all', 'focus:bg-white dark:focus:bg-slate-800/80', stakeInput ? 'pr-10' : 'pr-4', 'pl-14 py-4',
                belowMinStake ? 'border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-amber-200/50'
                : insufficientFunds ? 'border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-200/50'
                : parsedLocal >= minStakeLocal ? 'border-red-500/60 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10',
              ].join(' ')}
            />
            {stakeInput && (
              <button onClick={clearStake} type="button" aria-label="Clear stake" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-90">
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            )}
            {!stakeInput && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-xs text-slate-300 dark:text-slate-600 font-medium">min {currency.symbol}{Math.round(minStakeLocal).toLocaleString()}</span>
              </div>
            )}
          </div>

          {belowMinStake && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><InfoOutlinedIcon sx={{ fontSize: 13 }} />Min stake: {formatLocal(MIN_STAKE_GHS, currency)}{currency.code !== 'GHS' && <span className="text-amber-500/70 ml-1">(GH₵{MIN_STAKE_GHS})</span>}</p>
              <button onClick={setStakeToMin} className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 ml-3 shrink-0 underline underline-offset-2">Use min</button>
            </div>
          )}
          {insufficientFunds && !belowMinStake && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
              <InfoOutlinedIcon sx={{ fontSize: 13 }} className="text-rose-500 shrink-0" />
              <p className="text-xs text-rose-600 dark:text-rose-400">Insufficient balance · available <span className="font-bold">{formatLocal(walletGhs, currency)}</span>{currency.code !== 'GHS' && <span className="text-rose-400/70 ml-1">(GH₵{walletGhs.toFixed(2)})</span>}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amount, idx) => (
              <button key={idx} type="button" onClick={() => addToStake(amount)} className="py-2.5 text-[12px] font-bold bg-slate-50 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-slate-600 dark:text-slate-400 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700 hover:border-red-600">
                +{currency.symbol}{amount >= 1000 ? `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k` : amount}
              </button>
            ))}
          </div>

          {!currencyLoading && currency.code !== 'GHS' && parsedLocal > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <PublicIcon sx={{ fontSize: 14 }} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500">{formatLocal(parsedGhs, currency)} ≈ <span className="font-bold text-slate-700 dark:text-slate-300">GH₵{parsedGhs.toFixed(2)}</span><span className="text-slate-400 ml-1">· bet settled in GH₵</span></p>
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800" />

          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">{betSlip.length} selection{betSlip.length !== 1 ? 's' : ''}{betSlip.length > 1 && <span className="ml-1.5 text-[11px] text-slate-300 dark:text-slate-600">{betSlip.map(s => s.odd.toFixed(2)).join(' × ')}</span>}</span>
              <span className="font-black text-red-600 bg-red-600/10 px-2.5 py-1 rounded-xl text-sm">{totalOdds.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center gap-2"><TrendingUpIcon sx={{ fontSize: 16 }} className="text-emerald-600" /><span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Potential return</span></div>
              <div className="text-right">
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{parsedLocal > 0 ? formatLocal(potentialGhs, currency) : '—'}</span>
                {parsedLocal > 0 && currency.code !== 'GHS' && <p className="text-xs text-slate-400 mt-0.5">GH₵{potentialGhs.toFixed(2)}</p>}
              </div>
            </div>
            {user && (
              <div className="flex justify-between items-center text-xs pt-0.5">
                <span className="text-slate-400 flex items-center gap-1.5"><AccountBalanceWalletIcon sx={{ fontSize: 13 }} />Wallet balance</span>
                <div className="text-right">
                  {balanceLoading ? <span className="inline-block w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  : walletBalanceGhs !== null ? (
                    <><span className="text-slate-500 font-semibold">{formatLocal(walletGhs, currency)}</span>{currency.code !== 'GHS' && <p className="text-slate-400 mt-0.5">GH₵{walletGhs.toFixed(2)}</p>}</>
                  ) : <span className="text-slate-400">–</span>}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <button
              onClick={handlePlace} disabled={!canPlace || placing}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${canPlace && !placing ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
            >
              {placing ? <><CircularProgress fontSize="small" className="animate-spin" /> Placing Bet…</>
              : parsedLocal > 0 && canPlace ? <>Place Bet · {formatLocal(parsedGhs, currency)}{currency.code !== 'GHS' && <span className="font-normal opacity-60"> (GH₵{parsedGhs.toFixed(2)})</span>}</>
              : <>Place Bet{belowMinStake ? ` · min ${currency.symbol}${Math.round(minStakeLocal).toLocaleString()}` : parsedLocal === 0 ? ' · enter stake' : ''}</>}
            </button>
          ) : (
            <Link to="/login" className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white">
              <LoginIcon fontSize="small" /> Log In to Bet
            </Link>
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
  ALL:     { emoji: '🏟️', label: 'No bets yet',    sub: 'Your bets will appear here once you start playing.' },
  PENDING: { emoji: '⏳', label: 'No active bets',  sub: 'Placed bets appear here while they are in progress.' },
  WON:     { emoji: '🏆', label: 'No wins yet',     sub: 'Your winning slips will land here.' },
  LOST:    { emoji: '👋', label: 'No losses',       sub: "Bets that didn't hit show here." },
  VOID:    { emoji: '↩️', label: 'No voided bets',  sub: 'Refunded bets appear here.' },
};

function MyBetsTab() {
  const { user, setModalOpen } = useAppStore();
  const [apiBets, setApiBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<BetsFilter>('ALL');
  const [detailBet, setDetailBet] = useState<Bet | null>(null);
  const [unseenWins, setUnseenWins] = useState<Bet[]>([]);
  const [winPopup, setWinPopup] = useState<Bet | null>(null);
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const didCheckUnseen = useRef(false);

  useEffect(() => {
    setCurrencyLoading(true);
    detectCurrencyInfo().then(setCurrency).finally(() => setCurrencyLoading(false));
  }, []);

  const normalisedBets = apiBets.map(normaliseBet);
  const totalStakedGhs = normalisedBets.reduce((s, b) => s + (b.stake ?? 0), 0);
  const totalWonGhs = normalisedBets.filter(b => b.status === 'WON').reduce((s, b) => s + (b.potentialReturn ?? 0), 0);
  const settledBets = normalisedBets.filter(b => b.status !== 'PENDING');
  const winRate = settledBets.length ? Math.round((normalisedBets.filter(b => b.status === 'WON').length / settledBets.length) * 100) : 0;

  const fetchBets = useCallback(async (p = 0) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await betsApi.getMyBets(p, 10);
      if (res.success) { setApiBets(prev => p === 0 ? res.data.content : [...prev, ...res.data.content]); setTotalPages(res.data.totalPages); setPage(p); }
    } catch (err) { logError('MyBets', err); }
    finally { setLoading(false); }
  }, [user]);

  const checkUnseenWins = useCallback(async () => {
    if (!user || didCheckUnseen.current) return;
    didCheckUnseen.current = true;
    try {
      const res = await betsApi.getUnseenWins();
      if (res.success && res.data.length > 0) {
        setUnseenWins(res.data);
        setWinPopup(res.data[0]);
        setModalOpen(true);
      }
    } catch { }
  }, [user]);

  useEffect(() => { fetchBets(0); checkUnseenWins(); }, [fetchBets, checkUnseenWins]);

  const dismissWin = async (bet: Bet) => {
    try { await betsApi.dismissWin(bet.id); } catch { }
    const remaining = unseenWins.filter(b => b.id !== bet.id);
    setUnseenWins(remaining);
    setWinPopup(remaining[0] ?? null);
    if (!remaining[0]) setModalOpen(false);
  };

  if (!user) return <GuestPrompt message="Log in to view your bets" />;

  const filtered = filter === 'ALL' ? normalisedBets : normalisedBets.filter(b => b.status === filter);
  const FILTERS: { key: BetsFilter; label: string }[] = [
    { key: 'ALL', label: `All (${normalisedBets.length})` },
    { key: 'PENDING', label: 'Open' },
    { key: 'WON', label: 'Won' },
    { key: 'LOST', label: 'Lost' },
    { key: 'VOID', label: 'Void' },
  ];

  return (
    <div className="space-y-3">
      {normalisedBets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label: 'Staked', value: formatLocal(totalStakedGhs, currency), color: 'text-slate-800 dark:text-slate-100' },
            { label: 'Won', value: formatLocal(totalWonGhs, currency), color: 'text-emerald-600' },
            { label: 'Win Rate', value: winRate ? `${winRate}%` : '—', color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="shrink-0 flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
              <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
              {currency.code !== 'GHS' && label !== 'Win Rate' && !currencyLoading && (
                <p className="text-[10px] text-slate-400 mt-0.5">GH₵{(label === 'Staked' ? totalStakedGhs : totalWonGhs).toFixed(2)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === f.key ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-500/40'}`}>{f.label}</button>
        ))}
        <button onClick={() => fetchBets(0)} className="shrink-0 ml-auto p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 transition-colors"><RefreshIcon sx={{ fontSize: 16 }} /></button>
      </div>

      {loading && apiBets.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
              <div className="flex justify-between mb-3"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-14" /></div>
              <Skeleton className="h-3 w-full mb-1.5" /><Skeleton className="h-3 w-3/4 mb-3" />
              <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">{EMPTY_STATE[filter].emoji}</span>
          <p className="font-semibold text-slate-500">{EMPTY_STATE[filter].label}</p>
          <p className="text-sm text-slate-400 mt-1">{EMPTY_STATE[filter].sub}</p>
          {filter === 'ALL' && (
            <Link to="/" className="mt-6 px-5 py-2.5 text-sm rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold">
              <SportsSoccerIcon fontSize="small" /> Browse Matches
            </Link>
          )}
        </div>
      )}

      {filtered.map(bet => {
        const isWon = bet.status === 'WON';
        const isLost = bet.status === 'LOST';
        const isVoid = bet.status === 'VOID';
        return (
          <button
            key={bet.id}
            onClick={() => { setDetailBet(bet); setModalOpen(true); }}
            className={`w-full text-left bg-white dark:bg-slate-900 rounded-2xl border transition-all active:scale-[0.98] p-4 ${isWon ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10' : isLost ? 'border-slate-100 dark:border-slate-800 opacity-70' : isVoid ? 'border-blue-100 dark:border-blue-900/40 opacity-70' : 'border-slate-100 dark:border-slate-800 hover:border-red-500/20'}`}
          >
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <p className="text-xs text-slate-400">{new Date(bet.placedAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' })}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{bet.selections.length} selection{bet.selections.length !== 1 ? 's' : ''}</p>
              </div>
              <StatusBadge status={bet.status} />
            </div>
            <div className="space-y-1 mb-3">
              {bet.selections.slice(0, 2).map((sel: BetSelection, i: number) => (
                <p key={sel.id ?? i} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {buildMatchLabel(sel as unknown as Record<string, unknown>)} · <span className="font-medium text-slate-700 dark:text-slate-300">{sel.market}</span>{' · '}<span className="font-bold text-red-600">{(sel.oddsLocked ?? 0).toFixed(2)}</span><SelectionResult result={sel.result} />
                </p>
              ))}
              {bet.selections.length > 2 && <p className="text-xs text-slate-400">+{bet.selections.length - 2} more</p>}
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Stake</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatLocal(bet.stake, currency)}</p>
                {currency.code !== 'GHS' && !currencyLoading && <p className="text-[10px] text-slate-400">GH₵{bet.stake.toFixed(2)}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Return</p>
                <p className={`text-sm font-bold ${isWon ? 'text-emerald-600' : isVoid ? 'text-blue-500' : 'text-slate-500'}`}>
                  {isVoid ? formatLocal(bet.stake, currency) : formatLocal(bet.potentialReturn, currency)}
                </p>
                {currency.code !== 'GHS' && !currencyLoading && <p className="text-[10px] text-slate-400">GH₵{(isVoid ? bet.stake : bet.potentialReturn).toFixed(2)}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Odds</p>
                <p className="text-sm font-bold text-red-600">{bet.totalOdds.toFixed(2)}x</p>
              </div>
            </div>
          </button>
        );
      })}

      {page < totalPages - 1 && !loading && (
        <button onClick={() => fetchBets(page + 1)} className="w-full py-3 text-sm font-semibold text-red-600 border border-red-600/20 rounded-2xl hover:bg-red-600/5 transition-colors">Load More</button>
      )}
      {loading && apiBets.length > 0 && (
        <div className="flex justify-center py-4"><CircularProgress className="text-red-600 animate-spin" fontSize="small" /></div>
      )}

      {detailBet && <BetDetailSheet bet={detailBet} currency={currency} onClose={() => { setDetailBet(null); setModalOpen(false); }} />}
      {winPopup && <WinModal bet={winPopup} currency={currency} onClose={() => dismissWin(winPopup)} />}
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
          {/* Header branding strip */}
          <div className="flex items-center justify-center gap-2 pt-3 pb-1">
            <WinningBetLogoSvg size={18} />
            <WinningBetWordmarkDark size={13} />
          </div>
          <div className="flex">
            <button
              onClick={() => setActiveTab('slip')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'slip' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ReceiptLongIcon sx={{ fontSize: 18 }} />
              Bet Slip
              {betSlip.length > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{betSlip.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('bets')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bets' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <HistoryIcon sx={{ fontSize: 18 }} />
              My Bets
              {!user && <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-medium">Login</span>}
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-4">
        {activeTab === 'slip' ? <SlipTab /> : <MyBetsTab />}
      </div>
    </div>
  );
}