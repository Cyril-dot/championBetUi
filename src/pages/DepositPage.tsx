import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';
import AddCardIcon from '@mui/icons-material/AddCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'form' | 'otp' | 'awaiting' | 'success' | 'error';

interface MoolreChannel {
  id: string;
  name: string;
  short: string;
  color: string;
  bg: string;
}

const CHANNELS: MoolreChannel[] = [
  { id: '13', name: 'MTN MoMo',     short: 'MTN',     color: '#FFCC00', bg: 'rgba(255,204,0,0.10)' },
  { id: '6',  name: 'Telecel Cash', short: 'Telecel', color: '#E2001A', bg: 'rgba(226,0,26,0.08)'  },
  { id: '7',  name: 'AT Money',     short: 'AT',      color: '#0072BC', bg: 'rgba(0,114,188,0.10)' },
];

const MIN_GHS = 300;

const OTP_REQUIRED_CODES = new Set(['OTP_REQ', 'TP14']);

/**
 * TP17 = OTP accepted. After this we must call init again (same ref, no OTP)
 * to actually trigger the USSD push to the customer's phone.
 */
const OTP_ACCEPTED_CODE = 'TR099'; // code after the second init that confirms USSD sent — but we also handle TP17+second call
const OTP_VERIFIED_CODE = 'TP17';

const TX_SUCCESS   = 1;
const TX_FAILED    = 2;
const TX_NOT_FOUND = 3;

const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

// ── API helpers ───────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function moolreInit(body: {
  amount: string; phone: string; channel: string;
  otpcode?: string; externalref?: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch(
    'https://futballbackend-production-aefb.up.railway.app/api/wallet/deposit/moolre/init',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      credentials: 'include',
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
}

async function moolreVerify(externalref: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    'https://futballbackend-production-aefb.up.railway.app/api/wallet/deposit/moolre/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      credentials: 'include',
      body: JSON.stringify({ externalref }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
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
        justifyContent: 'center', gap: 8, padding: '13px 16px',
        borderRadius: 12, border: 'none',
        backgroundColor: 'var(--primary)', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1, transition: 'opacity 0.15s',
      }}
    >
      {loading
        ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
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
      width: 56, height: 56, borderRadius: '50%', backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      animation: pulse ? 'pulse 2s ease-in-out infinite' : undefined,
    }}>
      {children}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      width: '100%', padding: '10px 14px', borderRadius: 10,
      backgroundColor: 'rgba(225,29,72,0.07)',
      border: '1px solid rgba(225,29,72,0.2)',
      color: '#e11d48', fontSize: 13, fontWeight: 500, lineHeight: 1.4,
    }}>
      {msg}
    </div>
  );
}

// ── OTP Screen ────────────────────────────────────────────────────────────────

function OtpScreen({
  phone, otp, setOtp, errorMsg, setErrorMsg, loading, onSubmit, onCancel,
}: {
  phone: string; otp: string; setOtp: (v: string) => void;
  errorMsg: string; setErrorMsg: (v: string) => void;
  loading: boolean; onSubmit: () => void; onCancel: () => void;
}) {
  return (
    <CenteredCard>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>

      <IconCircle color="rgba(var(--primary-rgb,59,130,246),0.10)">
        <PhoneAndroidIcon style={{ color: 'var(--primary)', fontSize: 26 }} />
      </IconCircle>

      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
          Enter OTP
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Moolre sent a one-time PIN to{' '}
          <strong style={{ color: 'var(--text-main)' }}>{phone}</strong>
        </div>
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} />}

      <div style={{
        width: '100%', display: 'flex', alignItems: 'center',
        borderRadius: 12, overflow: 'hidden',
        border: '1.5px solid var(--border-light)',
        backgroundColor: 'var(--card-alt)',
      }}>
        <div style={{
          padding: '0 14px', height: 50,
          display: 'flex', alignItems: 'center',
          borderRight: '1.5px solid var(--border-light)',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.07em',
          color: 'var(--text-muted)', flexShrink: 0,
        }}>
          OTP
        </div>
        <input
          type="number" value={otp} autoFocus
          onChange={e => { setOtp(e.target.value); setErrorMsg(''); }}
          placeholder="e.g. 123456"
          style={{
            flex: 1, height: 50, padding: '0 14px',
            fontSize: 20, fontWeight: 800,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-main)',
          } as React.CSSProperties}
        />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn onClick={onSubmit} disabled={!otp.trim()} loading={loading}>
          Verify OTP
        </PrimaryBtn>
        <GhostBtn onClick={onCancel}>
          <ArrowBackIcon fontSize="small" /> Cancel
        </GhostBtn>
      </div>
    </CenteredCard>
  );
}

// ── Awaiting Screen ───────────────────────────────────────────────────────────

function AwaitingScreen({
  phone, amount, channel, verifyMsg, verifyLoading, onVerify, onCancel,
}: {
  phone: string; amount: number; channel: MoolreChannel;
  verifyMsg: string; verifyLoading: boolean;
  onVerify: () => void; onCancel: () => void;
}) {
  return (
    <CenteredCard>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.04)}}`}</style>

      <IconCircle color="rgba(var(--primary-rgb,59,130,246),0.10)" pulse>
        <PhoneAndroidIcon style={{ color: 'var(--primary)', fontSize: 26 }} />
      </IconCircle>

      {/* Channel badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 100,
        backgroundColor: channel.bg,
        border: `1px solid ${channel.color}33`,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: channel.color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: channel.color }}>{channel.name}</span>
      </div>

      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
          Approve on your phone
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)', marginBottom: 6 }}>
          {fmtGHS(amount)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          A USSD prompt has been sent to{' '}
          <strong style={{ color: 'var(--text-main)' }}>{phone}</strong>.
        </div>
      </div>

      {/* ── Approval notice ── */}
      <div style={{
        width: '100%', padding: '12px 14px', borderRadius: 12,
        backgroundColor: 'rgba(251,146,60,0.08)',
        border: '1px solid rgba(251,146,60,0.25)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ea580c', marginBottom: 3 }}>
            Approve the prompt first
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Check your phone for the USSD prompt from {channel.name} and approve the payment of{' '}
            <strong style={{ color: 'var(--text-main)' }}>{fmtGHS(amount)}</strong>.
            Only tap <em>Check Payment</em> after approving.
          </div>
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
      <IconCircle color="rgba(16,185,129,0.10)">
        <CheckCircleIcon style={{ color: '#10b981', fontSize: 30 }} />
      </IconCircle>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981', marginBottom: 4 }}>
          Deposit Confirmed
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-main)', marginBottom: 4 }}>
          {fmtGHS(amount)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Your wallet has been credited.
        </div>
        {externalRef && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 6, opacity: 0.6 }}>
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
      <IconCircle color="rgba(239,68,68,0.08)">
        <span style={{ fontSize: 24, fontWeight: 900, color: '#ef4444' }}>✕</span>
      </IconCircle>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444', marginBottom: 6 }}>
          Payment Failed
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
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

  const [amount,  setAmount]  = useState('');
  const [phone,   setPhone]   = useState('');
  const [channel, setChannel] = useState<MoolreChannel>(CHANNELS[0]);
  const [otp,     setOtp]     = useState('');

  const [step,          setStep]          = useState<Step>('form');
  const [loading,       setLoading]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [externalRef,   setExternalRef]   = useState('');
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

  const parsedAmount = parseFloat(amount);
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= MIN_GHS;
  const phoneValid   = phone.replace(/\D/g, '').length >= 9;

  // ── Step 1: First init ────────────────────────────────────────────────────

  const handleInit = async () => {
    if (!amountValid || !phoneValid) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res   = await moolreInit({ amount: parsedAmount.toString(), phone: phone.trim(), channel: channel.id });
      const inner = (res?.data ?? res) as Record<string, unknown>;
      const code  = (inner?.code  ?? res?.code  ?? '') as string;
      const ref   = (inner?.externalref ?? res?.externalref ?? '') as string;

      if (ref) setExternalRef(ref);

      if (OTP_REQUIRED_CODES.has(code)) {
        setStep('otp');
      } else {
        setStep('awaiting');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to initiate payment. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Submit OTP ────────────────────────────────────────────────────
  //
  // After TP17 (OTP verified), call init one more time (same ref, no OTP)
  // to actually trigger the USSD push to the customer's phone.

  const handleSubmitOtp = async () => {
    if (!otp.trim() || !externalRef) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // 2a. Submit OTP
      const res   = await moolreInit({
        amount: parsedAmount.toString(), phone: phone.trim(),
        channel: channel.id, otpcode: otp.trim(), externalref: externalRef,
      });
      const inner = (res?.data ?? res) as Record<string, unknown>;
      const code  = (inner?.code ?? res?.code ?? '') as string;

      if (OTP_REQUIRED_CODES.has(code)) {
        setOtp('');
        setErrorMsg('Incorrect OTP. Please check the code sent to your phone and try again.');
        return;
      }

      if (code === OTP_VERIFIED_CODE) {
        // 2b. TP17 — OTP accepted; now call init again (no OTP) to fire USSD push
        const res2   = await moolreInit({
          amount: parsedAmount.toString(), phone: phone.trim(),
          channel: channel.id, externalref: externalRef,
          // no otpcode — this triggers the USSD push
        });
        const inner2 = (res2?.data ?? res2) as Record<string, unknown>;
        const code2  = (inner2?.code ?? res2?.code ?? '') as string;

        if (OTP_REQUIRED_CODES.has(code2)) {
          setOtp('');
          setErrorMsg('OTP verification succeeded but USSD could not be sent. Please try again.');
          return;
        }
        setStep('awaiting');
        return;
      }

      // Any other success code — USSD already sent
      setStep('awaiting');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to submit OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Verify ────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!externalRef) return;
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const res      = await moolreVerify(externalRef);
      const inner    = (res?.data ?? res) as Record<string, unknown>;
      const credited = inner?.credited as boolean | undefined;
      const txStatus = inner?.txstatus as number | undefined;
      const message  = (inner?.message ?? '') as string;

      if (credited === true || txStatus === TX_SUCCESS) {
        setStep('success');
      } else if (txStatus === TX_FAILED) {
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else if (txStatus === TX_NOT_FOUND) {
        setVerifyMsg('Payment not found. Please approve the USSD prompt on your phone first, then tap Check Payment.');
      } else {
        setVerifyMsg(message || 'Payment is still pending. Please approve the USSD prompt on your phone, then tap Check Payment.');
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify payment. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetAll = () => {
    setStep('form'); setAmount(''); setOtp('');
    setExternalRef(''); setErrorMsg(''); setVerifyMsg('');
  };

  // ── Sub-screens ───────────────────────────────────────────────────────────

  if (step === 'otp') return (
    <OtpScreen
      phone={phone} otp={otp} setOtp={setOtp}
      errorMsg={errorMsg} setErrorMsg={setErrorMsg}
      loading={loading} onSubmit={handleSubmitOtp} onCancel={resetAll}
    />
  );

  if (step === 'awaiting') return (
    <AwaitingScreen
      phone={phone} amount={parsedAmount} channel={channel}
      verifyMsg={verifyMsg} verifyLoading={verifyLoading}
      onVerify={handleVerify} onCancel={resetAll}
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

  // ── Form ──────────────────────────────────────────────────────────────────

  const ctaLabel = !amount
    ? `Enter amount (min ${fmtGHS(MIN_GHS)})`
    : !amountValid
      ? `Minimum is ${fmtGHS(MIN_GHS)}`
      : !phone
        ? 'Enter your MoMo number'
        : !phoneValid
          ? 'Enter a valid phone number'
          : `Pay ${fmtGHS(parsedAmount)} via ${channel.name}`;

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

          {/* Network selector */}
          <Card>
            <FieldLabel>Mobile Money Network</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {CHANNELS.map(ch => {
                const active = ch.id === channel.id;
                return (
                  <button
                    key={ch.id} type="button" onClick={() => setChannel(ch)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '12px 6px', borderRadius: 12,
                      border: `1.5px solid ${active ? ch.color : 'var(--border-light)'}`,
                      backgroundColor: active ? ch.bg : 'var(--card-alt)',
                      cursor: 'pointer', transition: 'all 0.12s',
                      boxShadow: active ? `0 0 0 3px ${ch.color}18` : 'none',
                    }}
                  >
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      backgroundColor: ch.color,
                      boxShadow: active ? `0 0 6px ${ch.color}88` : 'none',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: active ? ch.color : 'var(--text-main)' }}>
                      {ch.short}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                      {ch.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Phone */}
          <Card>
            <FieldLabel>MoMo Phone Number</FieldLabel>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 10, overflow: 'hidden',
              border: `1.5px solid ${phone && !phoneValid ? '#ef4444' : 'var(--border-light)'}`,
              backgroundColor: 'var(--card-alt)',
            }}>
              <div style={{
                padding: '0 12px', height: 46,
                display: 'flex', alignItems: 'center',
                borderRight: '1.5px solid var(--border-light)',
                fontSize: 16, flexShrink: 0,
              }}>
                🇬🇭
              </div>
              <input
                type="tel" value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0244 000 000"
                style={{
                  flex: 1, height: 46, padding: '0 12px',
                  fontSize: 15, fontWeight: 600,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            {phone && !phoneValid && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 5, fontWeight: 500 }}>
                Enter a valid phone number
              </div>
            )}
          </Card>

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
                padding: '0 12px', height: 50,
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
                  flex: 1, height: 50, padding: '0 12px',
                  fontSize: 22, fontWeight: 800,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: amount && !amountValid ? '#ef4444' : 'var(--text-main)',
                }}
              />
            </div>
            <div style={{
              fontSize: 11, marginTop: 5, fontWeight: 500,
              color: amount && !amountValid ? '#ef4444' : 'var(--text-muted)',
            }}>
              {amount && !amountValid ? `Minimum deposit is ${fmtGHS(MIN_GHS)}` : `Minimum: ${fmtGHS(MIN_GHS)}`}
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

          {/* CTA */}
          <PrimaryBtn
            onClick={handleInit}
            disabled={!amountValid || !phoneValid}
            loading={loading}
          >
            {ctaLabel}
          </PrimaryBtn>

          {/* Footer */}
          <div style={{
            textAlign: 'center', fontSize: 11,
            color: 'var(--text-muted)', opacity: 0.65,
          }}>
            🔒 Secured by Moolre · MTN · Telecel · AT · Min GHS {MIN_GHS}
          </div>

        </div>
      </div>
    </div>
  );
}
