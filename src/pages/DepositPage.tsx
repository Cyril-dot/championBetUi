import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';
import AddCardIcon from '@mui/icons-material/AddCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'form' | 'payment' | 'awaiting' | 'success' | 'error';

const MIN_GHS = 300;
const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

const TX_SUCCESS   = 1;
const TX_FAILED    = 2;
const TX_NOT_FOUND = 3;

const API_BASE = 'https://futballbackend-production-aefb.up.railway.app';

const NETWORKS = [
  { id: 'mtn',     label: 'MTN MoMo',  color: '#FFCC00', bg: 'rgba(255,204,0,0.10)',   border: 'rgba(255,204,0,0.35)'  },
  { id: 'telecel', label: 'Telecel',   color: '#E2001A', bg: 'rgba(226,0,26,0.08)',    border: 'rgba(226,0,26,0.28)'   },
  { id: 'at',      label: 'AirtelTigo',color: '#0072BC', bg: 'rgba(0,114,188,0.10)',   border: 'rgba(0,114,188,0.28)'  },
];

// ── API helpers ───────────────────────────────────────────────────────────────

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
    credited:  Boolean(inner?.credited),
    txstatus:  Number(inner?.txstatus ?? -1),
    message:   String(inner?.message  ?? ''),
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

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

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function PrimaryBtn({
  children, onClick, disabled = false, loading = false,
}: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; loading?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled || loading}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8, padding: '14px 16px',
        borderRadius: 12, border: 'none',
        backgroundColor: 'var(--primary)', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1, transition: 'opacity 0.15s',
      }}
    >
      {loading
        ? <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, padding: '12px 16px',
        borderRadius: 12, border: '1px solid var(--border-light)',
        backgroundColor: 'transparent', color: 'var(--text-muted)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-light)',
      borderRadius: 16, padding: '14px 14px 16px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: 'var(--card-alt)', padding: 16,
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: 20, padding: '28px 22px',
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', gap: 18,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}>
        {children}
      </div>
    </div>
  );
}

function IconCircle({ color, children, pulse = false }: {
  color: string; children: React.ReactNode; pulse?: boolean;
}) {
  return (
    <div style={{
      width: 60, height: 60, borderRadius: '50%', backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      animation: pulse ? 'pulse 2s ease-in-out infinite' : undefined,
    }}>
      {children}
    </div>
  );
}

// ── Custom Payment Overlay ────────────────────────────────────────────────────
// Shows over the hidden Moolre iframe. Collects MoMo number + network,
// then injects values into the iframe and clicks Confirm.

function PaymentOverlay({
  amount,
  authUrl,
  externalRef,
  onSuccess,
  onFailed,
  onCancel,
}: {
  amount: number;
  authUrl: string;
  externalRef: string;
  onSuccess: () => void;
  onFailed: () => void;
  onCancel: () => void;
}) {
  const iframeRef        = useRef<HTMLIFrameElement>(null);
  const [momoNumber, setMomoNumber]   = useState('');
  const [network, setNetwork]         = useState('');
  const [reference, setReference]     = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [injectError, setInjectError] = useState('');

  const momoValid    = /^0[0-9]{9}$/.test(momoNumber);
  const networkValid = network !== '';
  const canSubmit    = momoValid && networkValid && !submitting;

  // Give the iframe time to load
  useEffect(() => {
    const t = setTimeout(() => setIframeReady(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setInjectError('');

    try {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) throw new Error('iframe_cors');

      const doc = iframe.contentDocument;

      // ── Fill MoMo number ──────────────────────────────────────────
      const phoneInput = doc.querySelector<HTMLInputElement>(
        'input[placeholder*="050"], input[type="tel"], input[name*="phone"], input[name*="mobile"], input[name*="number"]'
      );
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.value = momoNumber;
        phoneInput.dispatchEvent(new Event('input',  { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // ── Select network provider ────────────────────────────────────
      // Try <select> first
      const selectEl = doc.querySelector<HTMLSelectElement>('select');
      if (selectEl) {
        const opt = Array.from(selectEl.options).find(o =>
          o.text.toLowerCase().includes(network.toLowerCase()) ||
          o.value.toLowerCase().includes(network.toLowerCase())
        );
        if (opt) {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        // Try clickable provider buttons / list items
        const providerEls = doc.querySelectorAll<HTMLElement>(
          '[class*="provider"], [class*="network"], [data-value], li, button'
        );
        providerEls.forEach(el => {
          if (el.textContent?.toLowerCase().includes(network.toLowerCase())) {
            el.click();
          }
        });
      }

      // ── Fill reference (optional) ──────────────────────────────────
      if (reference) {
        const refInput = doc.querySelector<HTMLInputElement>(
          'input[placeholder*="Reference"], input[name*="ref"], input[name*="reference"]'
        );
        if (refInput) {
          refInput.value = reference;
          refInput.dispatchEvent(new Event('input',  { bubbles: true }));
          refInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Small delay so React inside Moolre re-renders
      await new Promise(r => setTimeout(r, 400));

      // ── Click Confirm ──────────────────────────────────────────────
      const confirmBtn = doc.querySelector<HTMLButtonElement>(
        'button[type="submit"], button:not([type="button"])'
      );
      if (confirmBtn) {
        confirmBtn.click();
      } else {
        // Fallback: find by text content
        doc.querySelectorAll<HTMLButtonElement>('button').forEach(btn => {
          if (btn.textContent?.trim().toLowerCase() === 'confirm') btn.click();
        });
      }

      // Move to awaiting — user should approve on phone
      setTimeout(() => {
        setSubmitting(false);
        onSuccess(); // transitions to 'awaiting'
      }, 800);

    } catch (err: unknown) {
      setSubmitting(false);
      // CORS block: Moolre is cross-origin — fall back to opening in new tab
      if (
        err instanceof Error && err.message === 'iframe_cors' ||
        err instanceof DOMException
      ) {
        // Open Moolre in new tab and go straight to awaiting
        window.open(authUrl, '_blank');
        onSuccess();
      } else {
        setInjectError('Could not connect to payment page. Please try again.');
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px) } to { opacity:1; transform:translateY(0) } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Moolre iframe fills entire screen behind overlay ── */}
      <iframe
        ref={iframeRef}
        src={authUrl}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        title="moolre-payment"
        onLoad={() => setIframeReady(true)}
      />

      {/* ── Dark backdrop over iframe ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }} />

      {/* ── Custom overlay card — centred, floats above everything ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div style={{ maxWidth: 420, width: '100%', animation: 'slideUp 0.3s ease' }}>

        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 20,
          padding: '20px 18px 22px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>Mobile Money</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 16, width: 30, height: 30,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Amount summary */}
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
                  You are depositing
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                  {fmtGHS(amount)}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 100,
                backgroundColor: 'rgba(var(--primary-rgb,59,130,246),0.08)',
                border: '1px solid rgba(var(--primary-rgb,59,130,246),0.18)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>🔒 Secured</span>
              </div>
            </div>
          </Card>

          {/* MoMo Number */}
          <Card>
            <FieldLabel>Mobile Money Number</FieldLabel>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 10, overflow: 'hidden',
              border: `1.5px solid ${momoNumber && !momoValid ? '#ef4444' : 'var(--border-light)'}`,
              backgroundColor: 'var(--card-alt)',
            }}>
              <div style={{
                padding: '0 12px', height: 52,
                display: 'flex', alignItems: 'center',
                borderRight: '1.5px solid var(--border-light)',
                fontSize: 13, fontWeight: 800,
                color: 'var(--text-muted)', flexShrink: 0,
              }}>
                🇬🇭 +233
              </div>
              <input
                type="tel"
                value={momoNumber}
                onChange={e => setMomoNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="050 000 0000"
                style={{
                  flex: 1, height: 52, padding: '0 12px',
                  fontSize: 18, fontWeight: 700, letterSpacing: '0.04em',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: momoNumber && !momoValid ? '#ef4444' : 'var(--text-main)',
                } as React.CSSProperties}
              />
            </div>
            {momoNumber && !momoValid && (
              <div style={{ fontSize: 11, marginTop: 5, color: '#ef4444', fontWeight: 500 }}>
                Enter a valid 10-digit Ghana MoMo number (e.g. 0551234567)
              </div>
            )}
          </Card>

          {/* Network */}
          <Card>
            <FieldLabel>Choose Network</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {NETWORKS.map(n => {
                const active = network === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNetwork(n.id)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: 10,
                      border: `2px solid ${active ? n.color : 'var(--border-light)'}`,
                      backgroundColor: active ? n.bg : 'transparent',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: n.color }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: active ? n.color : 'var(--text-muted)' }}>
                      {n.label}
                    </span>
                    {active && (
                      <span style={{ fontSize: 9, color: n.color, fontWeight: 700 }}>✓ Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Reference (optional) */}
          <Card>
            <FieldLabel>Reference <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. Deposit for ZynoBet"
              style={{
                width: '100%', height: 46, padding: '0 12px',
                borderRadius: 10, border: '1.5px solid var(--border-light)',
                backgroundColor: 'var(--card-alt)',
                fontSize: 13, fontWeight: 500, color: 'var(--text-main)',
                outline: 'none', boxSizing: 'border-box',
              } as React.CSSProperties}
            />
          </Card>

          {injectError && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: '#ef4444', fontSize: 12, lineHeight: 1.5,
            }}>
              {injectError}
            </div>
          )}

          {!iframeReady && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: 'rgba(var(--primary-rgb,59,130,246),0.05)',
              border: '1px solid rgba(var(--primary-rgb,59,130,246),0.12)',
              color: 'var(--text-muted)', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(var(--primary-rgb,59,130,246),0.3)', borderTopColor: 'var(--primary)', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
              Connecting to payment gateway…
            </div>
          )}

          <PrimaryBtn onClick={handleConfirm} disabled={!canSubmit} loading={submitting}>
            Confirm Payment · {fmtGHS(amount)}
          </PrimaryBtn>

          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>

          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
            🔒 Secured by Moolre · MTN · Telecel · AirtelTigo
          </div>

        </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Awaiting Screen ───────────────────────────────────────────────────────────

function AwaitingScreen({
  amount, verifyMsg, verifyLoading, onVerify, onOpenAgain, authorizationUrl, onCancel,
}: {
  amount: number;
  verifyMsg: string; verifyLoading: boolean;
  onVerify: () => void;
  onOpenAgain: () => void;
  authorizationUrl: string;
  onCancel: () => void;
}) {
  return (
    <CenteredCard>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.7; transform:scale(1.05) } }
      `}</style>

      <IconCircle color="rgba(var(--primary-rgb,59,130,246),0.10)" pulse>
        <RefreshIcon style={{ color: 'var(--primary)', fontSize: 28 }} />
      </IconCircle>

      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
          Complete your payment
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--primary)', marginBottom: 8 }}>
          {fmtGHS(amount)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Approve the MoMo prompt on your phone, then tap{' '}
          <strong style={{ color: 'var(--text-main)' }}>Check Payment</strong>.
        </div>
      </div>

      <div style={{
        width: '100%', padding: '12px 14px', borderRadius: 12,
        backgroundColor: 'rgba(251,146,60,0.07)',
        border: '1px solid rgba(251,146,60,0.22)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Check your phone for a MoMo prompt from your network provider and approve it.
          Once done, tap <strong style={{ color: 'var(--text-main)' }}>Check Payment</strong> below.
        </div>
      </div>

      {verifyMsg && (
        <div style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          backgroundColor: 'rgba(var(--primary-rgb,59,130,246),0.06)',
          border: '1px solid rgba(var(--primary-rgb,59,130,246),0.15)',
          color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5,
        }}>
          {verifyMsg}
        </div>
      )}

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
          <RefreshIcon fontSize="small" /> Check Payment
        </PrimaryBtn>

        <button
          type="button"
          onClick={onOpenAgain}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6, padding: '12px 16px',
            borderRadius: 12, border: '1px solid var(--border-light)',
            backgroundColor: 'transparent', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <OpenInNewIcon fontSize="small" /> Open Payment Page Again
        </button>

        <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
      </div>
    </CenteredCard>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  amount, externalRef, onWallet, onAgain,
}: {
  amount: number; externalRef: string; onWallet: () => void; onAgain: () => void;
}) {
  return (
    <CenteredCard>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <IconCircle color="rgba(16,185,129,0.10)">
        <CheckCircleIcon style={{ color: '#10b981', fontSize: 32 }} />
      </IconCircle>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981', marginBottom: 4 }}>
          Deposit Confirmed
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-main)', marginBottom: 4 }}>
          {fmtGHS(amount)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Your wallet has been credited successfully.
        </div>
        {externalRef && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace',
            marginTop: 8, opacity: 0.55, wordBreak: 'break-all' as const,
          }}>
            Ref: {externalRef}
          </div>
        )}
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn onClick={onWallet}>
          <AccountBalanceWalletIcon fontSize="small" /> Go to Wallet
        </PrimaryBtn>
        <GhostBtn onClick={onAgain}>Make Another Deposit</GhostBtn>
      </div>
    </CenteredCard>
  );
}

// ── Error Screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <CenteredCard>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <IconCircle color="rgba(239,68,68,0.08)">
        <span style={{ fontSize: 26, fontWeight: 900, color: '#ef4444' }}>✕</span>
      </IconCircle>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444', marginBottom: 6 }}>
          Payment Failed
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {msg || 'Something went wrong. Please try again.'}
        </div>
      </div>
      <PrimaryBtn onClick={onRetry}>Try Again</PrimaryBtn>
    </CenteredCard>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  const [amount,        setAmount]        = useState('');
  const [step,          setStep]          = useState<Step>('form');
  const [loading,       setLoading]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [externalRef,   setExternalRef]   = useState('');
  const [authUrl,       setAuthUrl]       = useState('');
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

  // On return from Moolre redirect (fallback path)
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
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= MIN_GHS;

  // Step 1: init payment → get authUrl → show custom overlay (not redirect)
  const handleInit = async () => {
    if (!amountValid) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { authorizationUrl, externalref } = await moolreInit(parsedAmount.toString());

      localStorage.setItem('moolre_externalref', externalref);
      localStorage.setItem('moolre_amount',      parsedAmount.toString());
      localStorage.setItem('moolre_authurl',     authorizationUrl);

      setExternalRef(externalref);
      setAuthUrl(authorizationUrl);

      // Show custom overlay instead of redirecting
      setStep('payment');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to create payment. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: verify after user approves MoMo prompt
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
      } else if (txstatus === TX_NOT_FOUND) {
        setVerifyMsg('Payment not found yet. Please approve the MoMo prompt on your phone first, then tap Check Payment.');
      } else {
        setVerifyMsg(message || 'Payment is still pending. Please approve the MoMo prompt on your phone, then tap Check Payment.');
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify payment. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetAll = () => {
    localStorage.removeItem('moolre_externalref');
    localStorage.removeItem('moolre_amount');
    localStorage.removeItem('moolre_authurl');
    setStep('form'); setAmount(''); setExternalRef('');
    setAuthUrl(''); setErrorMsg(''); setVerifyMsg('');
  };

  // ── Sub-screens ───────────────────────────────────────────────────────────

  if (step === 'payment') return (
    <PaymentOverlay
      amount={parsedAmount}
      authUrl={authUrl}
      externalRef={externalRef}
      onSuccess={() => setStep('awaiting')}  // custom form submitted → go to awaiting
      onFailed={() => { setErrorMsg('Payment was declined.'); setStep('error'); }}
      onCancel={resetAll}
    />
  );

  if (step === 'awaiting') return (
    <AwaitingScreen
      amount={parsedAmount || parseFloat(localStorage.getItem('moolre_amount') ?? '0')}
      verifyMsg={verifyMsg} verifyLoading={verifyLoading}
      onVerify={handleVerify}
      onOpenAgain={() => { if (authUrl) window.open(authUrl, '_blank'); }}
      authorizationUrl={authUrl}
      onCancel={resetAll}
    />
  );

  if (step === 'success') return (
    <SuccessScreen
      amount={parsedAmount} externalRef={externalRef}
      onWallet={() => navigate('/wallet')} onAgain={resetAll}
    />
  );

  if (step === 'error') return (
    <ErrorScreen msg={errorMsg} onRetry={resetAll} />
  );

  // ── Amount Form ───────────────────────────────────────────────────────────

  const ctaLabel = !amount
    ? `Enter amount (min ${fmtGHS(MIN_GHS)})`
    : !amountValid
      ? `Minimum is ${fmtGHS(MIN_GHS)}`
      : `Continue · ${fmtGHS(parsedAmount)}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--card-alt)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 14px 40px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AddCardIcon style={{ color: 'var(--primary)', fontSize: 22 }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              Deposit
            </span>
          </div>
          {walletBalance !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 100,
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-light)',
            }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                {fmtGHS(walletBalance)}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Amount */}
          <Card>
            <FieldLabel>Amount (GHS)</FieldLabel>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 10, overflow: 'hidden',
              border: `1.5px solid ${amount && !amountValid ? '#ef4444' : 'var(--border-light)'}`,
              backgroundColor: 'var(--card-alt)',
            }}>
              <div style={{
                padding: '0 12px', height: 54,
                display: 'flex', alignItems: 'center',
                borderRight: '1.5px solid var(--border-light)',
                fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                color: 'var(--text-muted)', flexShrink: 0,
              }}>
                GHS
              </div>
              <input
                type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Min ${MIN_GHS}`}
                min={MIN_GHS}
                style={{
                  flex: 1, height: 54, padding: '0 12px',
                  fontSize: 24, fontWeight: 800,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: amount && !amountValid ? '#ef4444' : 'var(--text-main)',
                } as React.CSSProperties}
              />
            </div>
            <div style={{
              fontSize: 11, marginTop: 5, fontWeight: 500,
              color: amount && !amountValid ? '#ef4444' : 'var(--text-muted)',
            }}>
              {amount && !amountValid
                ? `Minimum deposit is ${fmtGHS(MIN_GHS)}`
                : `Minimum: ${fmtGHS(MIN_GHS)}`}
            </div>

            {/* Quick amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginTop: 10 }}>
              {QUICK_AMOUNTS.map(qa => {
                const active = amount === qa.toString();
                return (
                  <button
                    key={qa} type="button" onClick={() => setAmount(qa.toString())}
                    style={{
                      padding: '7px 2px', borderRadius: 8,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                      backgroundColor: active ? 'var(--primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-main)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {fmtQuick(qa)}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Provider badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {[
              { short: 'MTN',     color: '#FFCC00', bg: 'rgba(255,204,0,0.10)'  },
              { short: 'Telecel', color: '#E2001A', bg: 'rgba(226,0,26,0.08)'   },
              { short: 'AT',      color: '#0072BC', bg: 'rgba(0,114,188,0.10)'  },
            ].map(({ short, color, bg }) => (
              <div key={short} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 100,
                backgroundColor: bg, border: `1px solid ${color}44`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{short}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <PrimaryBtn onClick={handleInit} disabled={!amountValid} loading={loading}>
            {loading ? null : (
              <>
                <OpenInNewIcon fontSize="small" />
                {ctaLabel}
              </>
            )}
          </PrimaryBtn>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
            🔒 Secured by Moolre · MTN · Telecel · AT · Min GHS {MIN_GHS}
          </div>

        </div>
      </div>
    </div>
  );
}
