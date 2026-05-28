import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step      = 'amount' | 'awaiting' | 'success' | 'error';
type Network   = 'MTN' | 'Telecel' | 'AirtelTigo' | '';

const MIN_GHS       = 300;
const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];
const TX_SUCCESS    = 1;
const TX_FAILED     = 2;
const API_BASE      = 'https://futballbackend-production-aefb.up.railway.app';

// ── Network config ─────────────────────────────────────────────────────────────

const NETWORKS: { id: Network; label: string; color: string; placeholder: string }[] = [
  { id: 'MTN',       label: 'MTN MoMo',   color: '#FFCC00', placeholder: '024 or 054 …' },
  { id: 'Telecel',   label: 'Telecel',    color: '#E2001A', placeholder: '020 or 050 …' },
  { id: 'AirtelTigo',label: 'AirtelTigo', color: '#0072BC', placeholder: '026 or 056 …' },
];

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
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn   { 0% { transform: scale(0.88); opacity: 0; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes pulse   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.75; transform:scale(1.06); } }
  @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes sheetUp  { from { opacity: 0; transform: translateY(40px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .deposit-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
  .deposit-root input[type=number]::-webkit-inner-spin-button,
  .deposit-root input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .deposit-root input[type=number] { -moz-appearance: textfield; }

  .deposit-root .btn-primary {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 15px 20px; border-radius: 14px; border: none;
    background: linear-gradient(135deg, #1a56ff 0%, #0f3fd6 100%);
    color: #fff; font-size: 14px; font-weight: 800; letter-spacing: 0.01em;
    cursor: pointer; transition: opacity 0.15s, transform 0.12s;
    box-shadow: 0 4px 18px rgba(26,86,255,0.32);
  }
  .deposit-root .btn-primary:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.93; }
  .deposit-root .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .deposit-root .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .deposit-root .btn-ghost {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px 20px; border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.45);
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .deposit-root .btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.65); }

  .deposit-root .card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 18px;
  }

  .deposit-root .field-label {
    font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
    text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 10px;
  }

  .deposit-root .spinner {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
    animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0;
  }

  .deposit-root .step-screen { animation: fadeUp 0.28s ease both; }

  .deposit-root .quick-btn {
    padding: 8px 4px; border-radius: 10px;
    border: 1.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.12s; text-align: center;
  }
  .deposit-root .quick-btn:hover { border-color: rgba(26,86,255,0.4); color: #fff; }
  .deposit-root .quick-btn.active {
    border-color: #1a56ff; background: rgba(26,86,255,0.15); color: #fff;
  }

  .deposit-root .amount-input {
    flex: 1; height: 60px; padding: 0 16px;
    font-size: 28px; font-weight: 900;
    background: transparent; border: none; outline: none; color: #fff;
    font-family: 'DM Mono', monospace;
  }
  .deposit-root .amount-input::placeholder { color: rgba(255,255,255,0.2); }

  .deposit-root .input-row {
    display: flex; align-items: center;
    border-radius: 12px; overflow: hidden;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    transition: border-color 0.15s;
  }
  .deposit-root .input-row:focus-within { border-color: rgba(26,86,255,0.5); }
  .deposit-root .input-row.error { border-color: rgba(239,68,68,0.5); }

  .deposit-root .input-prefix {
    padding: 0 14px; height: 60px; display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.08);
    font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
    color: rgba(255,255,255,0.35); flex-shrink: 0;
  }

  .deposit-root .tip-box {
    padding: 12px 14px; border-radius: 12px;
    background: rgba(251,146,60,0.07); border: 1px solid rgba(251,146,60,0.18);
    display: flex; gap: 10px; align-items: flex-start;
    font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.65;
  }

  .deposit-root .err-box {
    padding: 11px 14px; border-radius: 12px;
    background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
    font-size: 12px; color: #f87171; line-height: 1.55;
  }

  .deposit-root .info-box {
    padding: 11px 14px; border-radius: 12px;
    background: rgba(26,86,255,0.07); border: 1px solid rgba(26,86,255,0.18);
    font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.55;
  }

  .deposit-root .step-pills { display: flex; align-items: center; gap: 6px; }
  .deposit-root .step-pill  { height: 3px; border-radius: 2px; transition: all 0.25s; }

  /* ── Payment Overlay ─────────────────────────────────────────────────────── */

  .momo-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex; align-items: flex-end; justify-content: center;
    animation: overlayIn 0.2s ease both;
  }

  @media (min-width: 480px) {
    .momo-overlay { align-items: center; }
  }

  .momo-sheet {
    width: 100%; max-width: 440px;
    background: #0f1424;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px 24px 0 0;
    padding: 28px 24px 36px;
    animation: sheetUp 0.32s cubic-bezier(0.22,1,0.36,1) both;
    display: flex; flex-direction: column; gap: 18px;
    max-height: 92vh; overflow-y: auto;
  }

  @media (min-width: 480px) {
    .momo-sheet { border-radius: 24px; }
  }

  .momo-sheet .drag-pill {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.12);
    margin: 0 auto -4px;
  }

  @media (min-width: 480px) {
    .momo-sheet .drag-pill { display: none; }
  }

  .momo-sheet .momo-header {
    display: flex; align-items: flex-start; justify-content: space-between;
  }

  .momo-sheet .close-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s;
    color: rgba(255,255,255,0.4); font-size: 16px; line-height: 1;
    flex-shrink: 0;
  }
  .momo-sheet .close-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); }

  .momo-sheet .amount-badge {
    display: inline-flex; align-items: center;
    padding: 5px 14px; border-radius: 100px;
    background: rgba(26,86,255,0.14);
    border: 1px solid rgba(26,86,255,0.3);
    font-size: 22px; font-weight: 900;
    color: #6b9aff; letter-spacing: -0.02em;
    font-family: 'DM Mono', monospace;
  }

  .momo-sheet .network-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  }

  .momo-sheet .net-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 5px; padding: 10px 6px; border-radius: 12px; cursor: pointer;
    border: 1.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    transition: all 0.14s;
  }
  .momo-sheet .net-btn:hover { border-color: rgba(255,255,255,0.18); }
  .momo-sheet .net-btn.selected { background: rgba(255,255,255,0.06); }

  .momo-sheet .net-dot {
    width: 10px; height: 10px; border-radius: 50%;
  }

  .momo-sheet .net-label {
    font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
  }

  .momo-sheet .momo-input-wrap {
    display: flex; align-items: center;
    border-radius: 12px;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    overflow: hidden; transition: border-color 0.15s;
  }
  .momo-sheet .momo-input-wrap:focus-within { border-color: rgba(26,86,255,0.5); }
  .momo-sheet .momo-input-wrap.has-error   { border-color: rgba(239,68,68,0.5); }

  .momo-sheet .net-flag {
    height: 44px; padding: 0 12px;
    display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0; gap: 6px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.05em;
  }

  .momo-sheet .momo-number-input {
    flex: 1; height: 44px; padding: 0 14px;
    background: transparent; border: none; outline: none;
    color: #fff; font-size: 16px; font-weight: 600;
    font-family: 'DM Mono', monospace; letter-spacing: 0.05em;
  }
  .momo-sheet .momo-number-input::placeholder { color: rgba(255,255,255,0.2); }

  .momo-sheet .confirm-btn {
    width: 100%; padding: 14px 20px; border-radius: 14px; border: none;
    background: linear-gradient(135deg, #1a56ff 0%, #0f3fd6 100%);
    color: #fff; font-size: 14px; font-weight: 800;
    cursor: pointer; transition: opacity 0.15s, transform 0.12s;
    box-shadow: 0 4px 18px rgba(26,86,255,0.3);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .momo-sheet .confirm-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
  .momo-sheet .confirm-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .momo-sheet .security-row {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font-size: 11px; color: rgba(255,255,255,0.22);
  }
`;

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepPills({ step }: { step: Step }) {
  const map: Record<Step, number> = { amount: 1, awaiting: 2, success: 3, error: 3 };
  const current = map[step];
  return (
    <div className="step-pills">
      {[1, 2, 3].map(i => (
        <div key={i} className="step-pill" style={{
          width: i === current ? 20 : 12,
          background: i <= current ? '#1a56ff' : 'rgba(255,255,255,0.12)',
        }} />
      ))}
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="deposit-root" style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0b0e1a 0%, #0d1325 60%, #0a0f20 100%)',
      color: '#fff',
    }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px 48px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared buttons ─────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled = false, loading = false }: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; loading?: boolean;
}) {
  return (
    <button className="btn-primary" onClick={onClick} disabled={disabled || loading}>
      {loading
        ? <span className="spinner" />
        : children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button className="btn-ghost" onClick={onClick}>{children}</button>;
}

// ── MoMo Payment Overlay ───────────────────────────────────────────────────────

interface MomoOverlayProps {
  amount: number;
  loading: boolean;
  error: string;
  onConfirm: (phone: string, network: Network) => void;
  onClose: () => void;
}

function MomoOverlay({ amount, loading, error, onConfirm, onClose }: MomoOverlayProps) {
  const [phone,   setPhone]   = useState('');
  const [network, setNetwork] = useState<Network>('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const phoneClean  = phone.replace(/\s/g, '');
  const phoneValid  = /^0[0-9]{9}$/.test(phoneClean);
  const networkValid = network !== '';
  const canSubmit   = phoneValid && networkValid && !loading;

  const selectedNet = NETWORKS.find(n => n.id === network);

  const handleConfirm = () => {
    setTouched(true);
    if (!canSubmit) return;
    onConfirm(phoneClean, network);
  };

  return (
    <div className="momo-overlay" onClick={handleBackdrop}>
      <div className="momo-sheet" role="dialog" aria-modal="true" aria-label="Mobile Money Payment">

        {/* Drag pill (mobile) */}
        <div className="drag-pill" />

        {/* Header row */}
        <div className="momo-header">
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              Mobile Money Payment
            </div>
            <div className="amount-badge">{fmtGHS(amount)}</div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Network selector */}
        <div>
          <div className="field-label">Select Network</div>
          <div className="network-grid">
            {NETWORKS.map(n => (
              <button
                key={n.id}
                className={`net-btn${network === n.id ? ' selected' : ''}`}
                style={network === n.id ? { borderColor: n.color } : {}}
                onClick={() => setNetwork(n.id)}
              >
                <div className="net-dot" style={{
                  background: n.color,
                  boxShadow: network === n.id ? `0 0 8px ${n.color}88` : 'none',
                  transition: 'box-shadow 0.15s',
                }} />
                <span className="net-label" style={{ color: network === n.id ? n.color : 'rgba(255,255,255,0.5)' }}>
                  {n.label}
                </span>
              </button>
            ))}
          </div>
          {touched && !networkValid && (
            <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>Please select a network.</div>
          )}
        </div>

        {/* Phone number input */}
        <div>
          <div className="field-label">MoMo Number</div>
          <div className={`momo-input-wrap${touched && !phoneValid ? ' has-error' : ''}`}>
            {selectedNet ? (
              <div className="net-flag" style={{ color: selectedNet.color }}>
                <div className="net-dot" style={{ background: selectedNet.color, width: 8, height: 8 }} />
                {selectedNet.id}
              </div>
            ) : (
              <div className="net-flag" style={{ color: 'rgba(255,255,255,0.25)' }}>🇬🇭 GH</div>
            )}
            <input
              ref={inputRef}
              className="momo-number-input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9\s]/g, ''))}
              onBlur={() => setTouched(true)}
              placeholder={selectedNet?.placeholder ?? '0XX 000 0000'}
            />
          </div>
          {touched && !phoneValid && phone.length > 0 && (
            <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>
              Enter a valid 10-digit Ghanaian MoMo number starting with 0.
            </div>
          )}
          {touched && phone.length === 0 && (
            <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>Phone number is required.</div>
          )}
        </div>

        {/* Reference info */}
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>📲</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            You'll receive a prompt on your phone to approve the payment of{' '}
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtGHS(amount)}</strong>.
            Make sure your phone is nearby and MoMo PIN is ready.
          </span>
        </div>

        {/* API / server error */}
        {error && <div className="err-box">{error}</div>}

        {/* Confirm button */}
        <button
          className="confirm-btn"
          onClick={handleConfirm}
          disabled={!canSubmit}
        >
          {loading
            ? <><span className="spinner" /> Processing…</>
            : <>Confirm Payment · {fmtGHS(amount)}</>}
        </button>

        {/* Security note */}
        <div className="security-row">
          🔒 Secured by Moolre · Your details are encrypted
        </div>
      </div>
    </div>
  );
}

// ── STEP 1: Amount ─────────────────────────────────────────────────────────────

function AmountStep({
  amount, setAmount, onPay, loading, error, walletBalance, step,
}: {
  amount: string; setAmount: (v: string) => void;
  onPay: () => void; loading: boolean; error: string;
  walletBalance: number | null; step: Step;
}) {
  const parsed      = parseFloat(amount);
  const amountValid = !isNaN(parsed) && parsed >= MIN_GHS;

  return (
    <div className="step-screen" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Deposit</div>
          <StepPills step={step} />
        </div>
        {walletBalance !== null && (
          <div style={{
            padding: '6px 12px', borderRadius: 100,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
          }}>
            💳 {fmtGHS(walletBalance)}
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="card">
        <div className="field-label">Amount (GHS)</div>
        <div className={`input-row${amount && !amountValid ? ' error' : ''}`}>
          <div className="input-prefix">GHS</div>
          <input
            className="amount-input"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Min ${MIN_GHS}`}
            min={MIN_GHS}
          />
        </div>
        <div style={{
          fontSize: 11, marginTop: 6, fontWeight: 500,
          color: amount && !amountValid ? '#f87171' : 'rgba(255,255,255,0.3)',
        }}>
          {amount && !amountValid ? `Minimum deposit is ${fmtGHS(MIN_GHS)}` : `Min: ${fmtGHS(MIN_GHS)}`}
        </div>

        {/* Quick amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginTop: 12 }}>
          {QUICK_AMOUNTS.map(qa => (
            <button
              key={qa}
              className={`quick-btn${amount === qa.toString() ? ' active' : ''}`}
              onClick={() => setAmount(qa.toString())}
            >
              {fmtQuick(qa)}
            </button>
          ))}
        </div>
      </div>

      {/* Supported networks */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {NETWORKS.map(n => (
          <div key={n.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 100,
            background: `${n.color}14`, border: `1px solid ${n.color}44`,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: n.color }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: n.color }}>{n.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="err-box">{error}</div>}

      <PrimaryBtn onClick={onPay} disabled={!amountValid} loading={loading}>
        Pay with MoMo · {amountValid ? fmtGHS(parsed) : ''}
      </PrimaryBtn>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
        🔒 Secured by Moolre
      </div>
    </div>
  );
}

// ── STEP 2: Awaiting ───────────────────────────────────────────────────────────

function AwaitingStep({
  amount, verifyMsg, verifyLoading, onVerify, onCancel,
}: {
  amount: number;
  verifyMsg: string; verifyLoading: boolean;
  onVerify: () => void; onCancel: () => void;
}) {
  return (
    <div className="step-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'popIn 0.35s ease both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(26,86,255,0.12)',
          border: '2px solid rgba(26,86,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2.2s ease-in-out infinite', fontSize: 28,
        }}>
          📲
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
            Awaiting Approval
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#1a56ff', letterSpacing: '-0.02em' }}>
            {fmtGHS(amount)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.6 }}>
            Check your phone and approve the MoMo prompt, then tap <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Check Payment</strong> below.
          </div>
        </div>

        {verifyMsg && (
          <div className="info-box" style={{ width: '100%' }}>{verifyMsg}</div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
            🔄 Check Payment
          </PrimaryBtn>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3a: Success ───────────────────────────────────────────────────────────

function SuccessStep({
  amount, externalRef, onWallet, onAgain,
}: {
  amount: number; externalRef: string; onWallet: () => void; onAgain: () => void;
}) {
  return (
    <div className="step-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'popIn 0.35s ease both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(16,185,129,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
        }}>✅</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>Deposit Confirmed</div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em' }}>{fmtGHS(amount)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>Your wallet has been credited.</div>
          {externalRef && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Mono, monospace', marginTop: 10, wordBreak: 'break-all' }}>
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

function ErrorStep({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="step-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'popIn 0.35s ease both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>✕</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Payment Failed</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
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
  const [errorMsg,      setErrorMsg]      = useState('');
  const [initLoading,   setInitLoading]   = useState(false);
  const [initError,     setInitError]     = useState('');
  const [verifyMsg,     setVerifyMsg]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Controls whether the MoMo overlay is open
  const [showMomoOverlay, setShowMomoOverlay] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/deposit' } });
  }, [currentUser, navigate]);

  // Load wallet balance
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
    if (savedRef && savedAmount) {
      setExternalRef(savedRef);
      setAmount(savedAmount);
      setStep('awaiting');
    }
  }, []);

  const parsedAmount = parseFloat(amount);

  // Step 1 — user taps "Pay with MoMo": open our custom overlay
  const handleOpenOverlay = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < MIN_GHS) return;
    setInitError('');
    setShowMomoOverlay(true);
  };

  // Overlay confirmed — user has chosen network + phone; call /init
  const handleOverlayConfirm = async (phone: string, network: Network) => {
    setInitLoading(true);
    setInitError('');
    try {
      // Pass phone + network alongside amount so Moolre can route the push prompt.
      // Adjust the body fields to match whatever your backend expects.
      const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        credentials: 'include',
        body: JSON.stringify({ amount, phone, network }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
      const inner = (json?.data ?? json) as Record<string, unknown>;
      const externalref = (inner?.externalref ?? '') as string;
      if (!externalref) throw new Error('No transaction reference returned. Please try again.');

      // Persist so the user can resume if they reload
      localStorage.setItem('moolre_externalref', externalref);
      localStorage.setItem('moolre_amount',      amount);

      setExternalRef(externalref);
      setShowMomoOverlay(false);
      setStep('awaiting');
    } catch (e: unknown) {
      setInitError(e instanceof Error ? e.message : 'Could not start payment. Please try again.');
    } finally {
      setInitLoading(false);
    }
  };

  // Step 2 → verify
  const handleVerify = async () => {
    if (!externalRef) return;
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const { credited, txstatus, message } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) {
        localStorage.removeItem('moolre_externalref');
        localStorage.removeItem('moolre_amount');
        setStep('success');
      } else if (txstatus === TX_FAILED) {
        localStorage.removeItem('moolre_externalref');
        localStorage.removeItem('moolre_amount');
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else {
        setVerifyMsg(message || 'Payment still pending. Approve the MoMo prompt on your phone, then tap Check Payment.');
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
    setStep('amount'); setAmount(''); setExternalRef('');
    setErrorMsg(''); setVerifyMsg(''); setInitError('');
    setShowMomoOverlay(false);
  };

  return (
    <Shell>
      {step === 'amount' && (
        <AmountStep
          amount={amount}
          setAmount={setAmount}
          onPay={handleOpenOverlay}       // opens overlay instead of redirect
          loading={false}                 // initLoading only matters inside the overlay
          error={initError}
          walletBalance={walletBalance}
          step={step}
        />
      )}
      {step === 'awaiting' && (
        <AwaitingStep
          amount={parsedAmount || parseFloat(localStorage.getItem('moolre_amount') ?? '0')}
          verifyMsg={verifyMsg}
          verifyLoading={verifyLoading}
          onVerify={handleVerify}
          onCancel={resetAll}
        />
      )}
      {step === 'success' && (
        <SuccessStep
          amount={parsedAmount}
          externalRef={externalRef}
          onWallet={() => navigate('/wallet')}
          onAgain={resetAll}
        />
      )}
      {step === 'error' && (
        <ErrorStep msg={errorMsg} onRetry={resetAll} />
      )}

      {/* ── Custom MoMo Payment Overlay ── */}
      {showMomoOverlay && (
        <MomoOverlay
          amount={parsedAmount}
          loading={initLoading}
          error={initError}
          onConfirm={handleOverlayConfirm}
          onClose={() => { setShowMomoOverlay(false); setInitError(''); }}
        />
      )}
    </Shell>
  );
}
