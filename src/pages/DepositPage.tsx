import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'amount' | 'awaiting' | 'success' | 'error';

const MIN_GHS       = 300;
const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];
const TX_SUCCESS    = 1;
const TX_FAILED     = 2;
const API_BASE      = 'https://futballbackend-production-aefb.up.railway.app';

// ── API helpers ────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function moolreInit(amount: string): Promise<{ authorizationUrl: string; externalref: string }> {
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    credentials: 'include',
    body: JSON.stringify({ amount }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  const inner = (json?.data ?? json) as Record<string, unknown>;
  const authorizationUrl = (inner?.authorizationUrl ?? '') as string;
  const externalref      = (inner?.externalref      ?? '') as string;
  if (!authorizationUrl) throw new Error('No payment URL returned. Please try again.');
  if (!externalref)      throw new Error('No transaction reference returned. Please try again.');
  return { authorizationUrl, externalref };
}

async function moolreVerify(externalref: string): Promise<{
  credited: boolean; txstatus: number; message: string;
}> {
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    credentials: 'include',
    body: JSON.stringify({ externalref }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  const inner = (json?.data ?? json) as Record<string, unknown>;
  return {
    credited: Boolean(inner?.credited),
    txstatus: Number(inner?.txstatus ?? -1),
    message:  String(inner?.message  ?? ''),
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtGHS(n: number): string {
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency', currency: 'GHS', maximumFractionDigits: 2,
    }).format(n);
  } catch { return `GHS ${n.toFixed(2)}`; }
}

function fmtQuick(n: number): string {
  return n >= 1000 ? `${n / 1000}k` : String(n);
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes fadeUp   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn    { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes shimmer  { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes breathe  { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,116,0.3); } 50% { box-shadow: 0 0 0 10px rgba(34,211,116,0); } }

  .dr * { box-sizing: border-box; font-family: 'Sora', sans-serif; }
  .dr input[type=number]::-webkit-inner-spin-button,
  .dr input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  .dr input[type=number] { -moz-appearance: textfield; }

  .dr .screen { animation: fadeUp 0.26s ease both; }

  /* ── Layout ── */
  .dr .page-inner {
    max-width: 420px; margin: 0 auto; padding: 0 16px 60px;
  }

  /* ── Top bar ── */
  .dr .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0 24px;
  }
  .dr .topbar-title {
    font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #fff;
  }
  .dr .balance-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 100px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.55);
  }
  .dr .balance-dot { width: 6px; height: 6px; border-radius: 50%; background: #22d374; }

  /* ── Progress bar ── */
  .dr .progress-track {
    height: 2px; border-radius: 1px; background: rgba(255,255,255,0.07);
    margin-bottom: 28px; overflow: hidden;
  }
  .dr .progress-fill {
    height: 100%; border-radius: 1px;
    background: linear-gradient(90deg, #1a56ff, #22d374);
    transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Section label ── */
  .dr .section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.28);
    margin-bottom: 8px;
  }

  /* ── Amount display ── */
  .dr .amount-display-wrap {
    border-radius: 20px; padding: 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 10px;
  }
  .dr .amount-row {
    display: flex; align-items: center;
    border-radius: 12px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.08);
    overflow: hidden; transition: border-color 0.15s;
  }
  .dr .amount-row:focus-within { border-color: rgba(26,86,255,0.6); }
  .dr .amount-row.err { border-color: rgba(239,68,68,0.5); }
  .dr .amount-currency {
    padding: 0 14px; height: 64px;
    display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.07);
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    color: rgba(255,255,255,0.3); flex-shrink: 0;
  }
  .dr .amount-input {
    flex: 1; height: 64px; padding: 0 16px;
    background: transparent; border: none; outline: none;
    font-size: 30px; font-weight: 800; color: #fff;
    font-family: 'JetBrains Mono', monospace; letter-spacing: -0.02em;
  }
  .dr .amount-input::placeholder { color: rgba(255,255,255,0.15); }
  .dr .amount-hint {
    font-size: 11px; font-weight: 500; margin-top: 8px;
    transition: color 0.15s;
  }

  /* ── Quick amounts ── */
  .dr .quick-grid {
    display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; margin-top: 14px;
  }
  .dr .quick-chip {
    padding: 7px 4px; border-radius: 8px; text-align: center;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.025);
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5);
    cursor: pointer; transition: all 0.12s;
  }
  .dr .quick-chip:hover { border-color: rgba(26,86,255,0.35); color: rgba(255,255,255,0.8); }
  .dr .quick-chip.on {
    border-color: rgba(26,86,255,0.6); background: rgba(26,86,255,0.12); color: #fff;
  }

  /* ── Network badges ── */
  .dr .networks-row {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    margin-bottom: 10px;
  }
  .dr .net-badge {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 11px; border-radius: 100px;
    font-size: 11px; font-weight: 700;
  }
  .dr .net-dot { width: 5px; height: 5px; border-radius: 50%; }

  /* ── Tip box ── */
  .dr .tip {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 11px 13px; border-radius: 12px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    font-size: 11.5px; color: rgba(255,255,255,0.38); line-height: 1.7;
    margin-bottom: 10px;
  }

  /* ── Error / info boxes ── */
  .dr .box-err  { padding: 11px 14px; border-radius: 12px; background: rgba(239,68,68,0.07);  border: 1px solid rgba(239,68,68,0.2);  font-size: 12px; color: #f87171; line-height: 1.55; }
  .dr .box-info { padding: 11px 14px; border-radius: 12px; background: rgba(26,86,255,0.07);  border: 1px solid rgba(26,86,255,0.18); font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.55; }

  /* ── Buttons ── */
  .dr .btn-primary {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 15px 20px; border-radius: 14px; border: none;
    background: linear-gradient(135deg, #1a56ff 0%, #0f3fd6 100%);
    color: #fff; font-size: 14px; font-weight: 800; letter-spacing: 0.01em;
    cursor: pointer; transition: opacity 0.15s, transform 0.12s;
    box-shadow: 0 6px 20px rgba(26,86,255,0.3);
  }
  .dr .btn-primary:hover:not(:disabled) { opacity: 0.91; transform: translateY(-1px); }
  .dr .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .dr .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

  .dr .btn-ghost {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px 20px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent; color: rgba(255,255,255,0.35);
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .dr .btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }

  .dr .btn-outline-blue {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px 20px; border-radius: 14px;
    border: 1.5px solid rgba(26,86,255,0.35);
    background: rgba(26,86,255,0.08); color: #6b9aff;
    font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
    text-decoration: none;
  }
  .dr .btn-outline-blue:hover { background: rgba(26,86,255,0.14); border-color: rgba(26,86,255,0.5); }

  .dr .spinner {
    width: 17px; height: 17px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff;
    animation: spin 0.65s linear infinite; flex-shrink: 0;
  }

  /* ── Awaiting card ── */
  .dr .await-card {
    border-radius: 24px; padding: 32px 24px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex; flex-direction: column; align-items: center; gap: 22px;
    animation: popIn 0.3s ease both;
  }
  .dr .await-icon {
    width: 68px; height: 68px; border-radius: 50%;
    background: rgba(26,86,255,0.1);
    border: 2px solid rgba(26,86,255,0.22);
    display: flex; align-items: center; justify-content: center;
    font-size: 30px;
  }

  /* ── Result cards ── */
  .dr .result-card {
    border-radius: 24px; padding: 32px 24px;
    display: flex; flex-direction: column; align-items: center; gap: 20px;
    animation: popIn 0.3s ease both;
  }
  .dr .result-icon {
    width: 68px; height: 68px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 30px;
  }

  .dr .security-note {
    text-align: center; font-size: 11px; color: rgba(255,255,255,0.18);
  }

  /* ── Moolre step indicator ── */
  .dr .step-indicator {
    display: flex; align-items: center; gap: 0; margin-bottom: 28px;
  }
  .dr .step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; flex-shrink: 0;
    transition: all 0.25s;
  }
  .dr .step-dot.done  { background: #1a56ff; color: #fff; }
  .dr .step-dot.active { background: #fff; color: #0d1325; }
  .dr .step-dot.idle  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.3); }
  .dr .step-line {
    flex: 1; height: 2px; background: rgba(255,255,255,0.07); transition: background 0.25s;
  }
  .dr .step-line.done { background: #1a56ff; }
  .dr .step-label-row {
    display: flex; justify-content: space-between; margin-top: 6px; margin-bottom: 24px;
  }
  .dr .step-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    text-align: center; flex: 1;
  }
`;

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const idx = { amount: 0, awaiting: 1, success: 2, error: 2 }[step];
  const labels = ['Amount', 'Payment', 'Done'];
  return (
    <>
      <div className="step-indicator">
        {[0, 1, 2].map(i => (
          <>
            <div key={`dot-${i}`} className={`step-dot ${i < idx ? 'done' : i === idx ? 'active' : 'idle'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            {i < 2 && <div key={`line-${i}`} className={`step-line ${i < idx ? 'done' : ''}`} />}
          </>
        ))}
      </div>
      <div className="step-label-row">
        {labels.map((l, i) => (
          <div key={l} className="step-label" style={{
            color: i === idx ? '#fff' : i < idx ? '#1a56ff' : 'rgba(255,255,255,0.25)',
          }}>{l}</div>
        ))}
      </div>
    </>
  );
}

// ── Network badges ─────────────────────────────────────────────────────────────

const NETS = [
  { label: 'MTN MoMo',   color: '#FFCC00' },
  { label: 'Telecel',    color: '#E2001A' },
  { label: 'AirtelTigo', color: '#0072BC' },
];

function NetworkBadges() {
  return (
    <div className="networks-row">
      {NETS.map(n => (
        <div key={n.label} className="net-badge" style={{
          background: `${n.color}12`, border: `1px solid ${n.color}38`,
        }}>
          <div className="net-dot" style={{ background: n.color }} />
          <span style={{ color: n.color }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children, step }: { children: React.ReactNode; step: Step }) {
  const progress = { amount: 33, awaiting: 66, success: 100, error: 100 }[step];
  return (
    <div className="dr" style={{
      minHeight: '100vh',
      background: 'linear-gradient(155deg, #090c18 0%, #0c1122 55%, #080d1c 100%)',
      color: '#fff',
    }}>
      <style>{GLOBAL_CSS}</style>
      <div className="page-inner">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled = false, loading = false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <button className="btn-primary" onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button className="btn-ghost" onClick={onClick}>{children}</button>;
}

// ── STEP 1: Amount ─────────────────────────────────────────────────────────────

function AmountStep({ amount, setAmount, onPay, loading, error, walletBalance, step }: {
  amount: string; setAmount: (v: string) => void; onPay: () => void;
  loading: boolean; error: string; walletBalance: number | null; step: Step;
}) {
  const parsed      = parseFloat(amount);
  const amountValid = !isNaN(parsed) && parsed >= MIN_GHS;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-title">Add Funds</div>
        {walletBalance !== null && (
          <div className="balance-pill">
            <div className="balance-dot" />
            {fmtGHS(walletBalance)}
          </div>
        )}
      </div>

      <StepIndicator step={step} />

      {/* Amount card */}
      <div className="amount-display-wrap">
        <div className="section-label">Enter Amount</div>
        <div className={`amount-row${amount && !amountValid ? ' err' : ''}`}>
          <div className="amount-currency">GHS</div>
          <input
            className="amount-input"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min={MIN_GHS}
            autoFocus
          />
        </div>
        <div className="amount-hint" style={{
          color: amount && !amountValid ? '#f87171' : 'rgba(255,255,255,0.25)',
        }}>
          {amount && !amountValid
            ? `Minimum deposit is ${fmtGHS(MIN_GHS)}`
            : `Minimum: ${fmtGHS(MIN_GHS)}`}
        </div>

        {/* Quick amounts */}
        <div className="quick-grid">
          {QUICK_AMOUNTS.map(qa => (
            <button
              key={qa}
              className={`quick-chip${amount === qa.toString() ? ' on' : ''}`}
              onClick={() => setAmount(qa.toString())}
            >
              {fmtQuick(qa)}
            </button>
          ))}
        </div>
      </div>

      {/* Networks */}
      <NetworkBadges />

      {/* Tip */}
      <div className="tip">
        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
        <span>
          Tapping <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Open Payment Page</strong> will
          launch the Moolre checkout in a new tab. Complete payment there, then return here and
          tap <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Check Payment</strong>.
        </span>
      </div>

      {error && <div className="box-err">{error}</div>}

      <PrimaryBtn onClick={onPay} disabled={!amountValid} loading={loading}>
        {!loading && (amountValid
          ? `Open Payment Page · ${fmtGHS(parsed)}`
          : `Enter amount (min ${fmtGHS(MIN_GHS)})`)}
      </PrimaryBtn>

      <div className="security-note">🔒 Secured by Moolre</div>
    </div>
  );
}

// ── STEP 2: Awaiting ───────────────────────────────────────────────────────────

function AwaitingStep({ amount, authUrl, verifyMsg, verifyLoading, onVerify, onCancel, step }: {
  amount: number; authUrl: string; verifyMsg: string;
  verifyLoading: boolean; onVerify: () => void; onCancel: () => void; step: Step;
}) {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>

      <div className="topbar">
        <div className="topbar-title">Add Funds</div>
        <div style={{
          padding: '5px 12px', borderRadius: 100,
          background: 'rgba(26,86,255,0.1)', border: '1px solid rgba(26,86,255,0.25)',
          fontSize: 12, fontWeight: 700, color: '#6b9aff',
          fontFamily: 'JetBrains Mono, monospace',
        }}>{fmtGHS(amount)}</div>
      </div>

      <StepIndicator step={step} />

      <div className="await-card">
        <div className="await-icon" style={{ animation: 'breathe 2.4s ease-in-out infinite' }}>
          📲
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
            Awaiting Payment
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtGHS(amount)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 8, lineHeight: 1.65 }}>
            Complete your payment on the Moolre page, then tap{' '}
            <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Check Payment</strong>.
          </div>
        </div>

        {/* Re-open link */}
        <a
          href={authUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-blue"
        >
          🔗 Re-open Moolre Payment Page
        </a>

        {verifyMsg && <div className="box-info" style={{ width: '100%' }}>{verifyMsg}</div>}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
            {!verifyLoading && '🔄 Check Payment'}
          </PrimaryBtn>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3a: Success ───────────────────────────────────────────────────────────

function SuccessStep({ amount, externalRef, onWallet, onAgain, step }: {
  amount: number; externalRef: string; onWallet: () => void; onAgain: () => void; step: Step;
}) {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <div className="topbar-title">Add Funds</div>
      </div>
      <StepIndicator step={step} />

      <div className="result-card" style={{ background: 'rgba(34,211,116,0.04)', border: '1px solid rgba(34,211,116,0.18)' }}>
        <div className="result-icon" style={{ background: 'rgba(34,211,116,0.1)' }}>✅</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#22d374', marginBottom: 6 }}>Payment Confirmed</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtGHS(amount)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>
            Your wallet has been credited.
          </div>
          {externalRef && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace', marginTop: 10, wordBreak: 'break-all' }}>
              Ref: {externalRef}
            </div>
          )}
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryBtn onClick={onWallet}>💳 Go to Wallet</PrimaryBtn>
          <GhostBtn onClick={onAgain}>Make Another Deposit</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3b: Error ─────────────────────────────────────────────────────────────

function ErrorStep({ msg, onRetry, step }: { msg: string; onRetry: () => void; step: Step }) {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <div className="topbar-title">Add Funds</div>
      </div>
      <StepIndicator step={step} />

      <div className="result-card" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="result-icon" style={{ background: 'rgba(239,68,68,0.1)', fontSize: 26 }}>✕</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Payment Failed</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
            {msg || 'Something went wrong. Please try again.'}
          </div>
        </div>
        <PrimaryBtn onClick={onRetry}>Try Again</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  const [step,          setStep]          = useState<Step>('amount');
  const [amount,        setAmount]        = useState('');
  const [externalRef,   setExternalRef]   = useState('');
  const [authUrl,       setAuthUrl]       = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [initLoading,   setInitLoading]   = useState(false);
  const [initError,     setInitError]     = useState('');
  const [verifyMsg,     setVerifyMsg]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/deposit' } });
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    walletApi.getWallet()
      .then(res => {
        const bal = (res.data as { balance?: number }).balance ?? null;
        if (bal !== null) setWalletBalance(bal);
      })
      .catch(() => {});
  }, [currentUser]);

  // Resume in-progress payment on page reload
  useEffect(() => {
    const savedRef    = localStorage.getItem('moolre_externalref');
    const savedAmount = localStorage.getItem('moolre_amount');
    const savedUrl    = localStorage.getItem('moolre_authurl');
    if (savedRef && savedAmount && savedUrl) {
      setExternalRef(savedRef);
      setAmount(savedAmount);
      setAuthUrl(savedUrl);
      setStep('awaiting');
    }
  }, []);

  const parsedAmount = parseFloat(amount);

  const handlePay = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < MIN_GHS) return;
    setInitLoading(true);
    setInitError('');
    try {
      const { authorizationUrl, externalref } = await moolreInit(amount);
      localStorage.setItem('moolre_externalref', externalref);
      localStorage.setItem('moolre_amount',      amount);
      localStorage.setItem('moolre_authurl',     authorizationUrl);
      setExternalRef(externalref);
      setAuthUrl(authorizationUrl);
      setStep('awaiting');
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setInitError(e instanceof Error ? e.message : 'Could not start payment. Please try again.');
    } finally {
      setInitLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!externalRef) return;
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const { credited, txstatus, message } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) {
        localStorage.removeItem('moolre_externalref');
        localStorage.removeItem('moolre_amount');
        localStorage.removeItem('moolre_authurl');
        setStep('success');
      } else if (txstatus === TX_FAILED) {
        localStorage.removeItem('moolre_externalref');
        localStorage.removeItem('moolre_amount');
        localStorage.removeItem('moolre_authurl');
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else {
        setVerifyMsg(message || 'Payment still pending. Complete payment on Moolre, then tap Check Payment.');
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetAll = () => {
    localStorage.removeItem('moolre_externalref');
    localStorage.removeItem('moolre_amount');
    localStorage.removeItem('moolre_authurl');
    setStep('amount'); setAmount(''); setExternalRef(''); setAuthUrl('');
    setErrorMsg(''); setVerifyMsg(''); setInitError('');
  };

  return (
    <Shell step={step}>
      {step === 'amount' && (
        <AmountStep
          amount={amount} setAmount={setAmount}
          onPay={handlePay} loading={initLoading} error={initError}
          walletBalance={walletBalance} step={step}
        />
      )}
      {step === 'awaiting' && (
        <AwaitingStep
          amount={parsedAmount || parseFloat(localStorage.getItem('moolre_amount') ?? '0')}
          authUrl={authUrl || localStorage.getItem('moolre_authurl') || ''}
          verifyMsg={verifyMsg} verifyLoading={verifyLoading}
          onVerify={handleVerify} onCancel={resetAll} step={step}
        />
      )}
      {step === 'success' && (
        <SuccessStep
          amount={parsedAmount} externalRef={externalRef}
          onWallet={() => navigate('/wallet')} onAgain={resetAll} step={step}
        />
      )}
      {step === 'error' && (
        <ErrorStep msg={errorMsg} onRetry={resetAll} step={step} />
      )}
    </Shell>
  );
}
