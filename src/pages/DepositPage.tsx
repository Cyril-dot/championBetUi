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
  { id: '13', name: 'MTN MoMo',     short: 'MTN',     color: '#FFCC00', bg: 'rgba(255,204,0,0.12)' },
  { id: '6',  name: 'Telecel Cash', short: 'Telecel', color: '#E2001A', bg: 'rgba(226,0,26,0.10)'  },
  { id: '7',  name: 'AT Money',     short: 'AT',      color: '#0072BC', bg: 'rgba(0,114,188,0.12)' },
];

const MIN_GHS = 300;

/**
 * OTP-required codes from Moolre.
 * OTP_REQ = documented; TP14 = observed in production.
 */
const OTP_REQUIRED_CODES = new Set(['OTP_REQ', 'TP14']);

/**
 * TP17 = "Phone no. Verification Successful" — OTP was accepted.
 * After receiving this we must call init ONE MORE TIME (same externalref,
 * no otpcode) to actually fire the USSD push to the customer's phone.
 */
const OTP_ACCEPTED_CODE = 'TP17';

const TX_SUCCESS   = 1;
const TX_FAILED    = 2;
const TX_NOT_FOUND = 3;

const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

// ── Inline API helpers ────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function moolreInit(body: {
  amount: string;
  phone: string;
  channel: string;
  otpcode?: string;
  externalref?: string;
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
  } catch {
    return `GHS ${n.toFixed(2)}`;
  }
}

function fmtQuick(n: number): string {
  if (n >= 1000) return `${n / 1000}k`;
  return String(n);
}

// ── Design tokens ─────────────────────────────────────────────────────────────
// Uses the app's existing CSS variables. Extra local tokens are inlined.

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--card-alt)',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  } as React.CSSProperties,

  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 16px 48px',
  } as React.CSSProperties,

  // Centered single-card screens (OTP / awaiting / success / error)
  centeredWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--card-alt)',
    padding: 16,
  } as React.CSSProperties,

  centeredCard: {
    maxWidth: 420,
    width: '100%',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-light)',
    borderRadius: 24,
    padding: '36px 28px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
  } as React.CSSProperties,
};

// ── Shared primitives ─────────────────────────────────────────────────────────

function PrimaryBtn({
  children, onClick, disabled = false, loading = false, fullWidth = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: fullWidth ? '100%' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '14px 20px',
        borderRadius: 14,
        border: 'none',
        backgroundColor: 'var(--primary)',
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.01em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      {loading
        ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '13px 20px',
        borderRadius: 14,
        border: '1.5px solid var(--border-light)',
        backgroundColor: 'transparent',
        color: 'var(--text-muted)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: 20,
        padding: '18px 18px 20px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      width: '100%',
      padding: '12px 16px',
      borderRadius: 12,
      backgroundColor: 'rgba(225, 29, 72, 0.08)',
      border: '1px solid rgba(225, 29, 72, 0.22)',
      color: '#e11d48',
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.4,
      textAlign: 'left' as const,
    }}>
      {msg}
    </div>
  );
}

function InfoBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      width: '100%',
      padding: '12px 16px',
      borderRadius: 12,
      backgroundColor: 'rgba(var(--primary-rgb, 59,130,246), 0.08)',
      border: '1px solid rgba(var(--primary-rgb, 59,130,246), 0.18)',
      color: 'var(--text-muted)',
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5,
      textAlign: 'left' as const,
    }}>
      {msg}
    </div>
  );
}

function IconCircle({ color, children, pulse = false }: { color: string; children: React.ReactNode; pulse?: boolean }) {
  return (
    <div style={{
      width: 64, height: 64,
      borderRadius: '50%',
      backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: pulse ? 'pulse 2s ease-in-out infinite' : undefined,
      flexShrink: 0,
    }}>
      {children}
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
    <div style={styles.centeredWrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
      <div style={styles.centeredCard}>
        <IconCircle color="rgba(var(--primary-rgb,59,130,246),0.12)">
          <PhoneAndroidIcon style={{ color: 'var(--primary)', fontSize: 28 }} />
        </IconCircle>

        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
            Enter OTP
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Moolre sent a one-time PIN to{' '}
            <strong style={{ color: 'var(--text-main)' }}>{phone}</strong>
          </div>
        </div>

        {errorMsg && <ErrorBanner msg={errorMsg} />}

        {/* OTP input */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1.5px solid var(--border-light)',
          backgroundColor: 'var(--card-bg)',
        }}>
          <div style={{
            padding: '0 16px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--card-alt)',
            borderRight: '1.5px solid var(--border-light)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            minWidth: 56,
          }}>
            OTP
          </div>
          <input
            type="number"
            value={otp}
            onChange={e => { setOtp(e.target.value); setErrorMsg(''); }}
            placeholder="e.g. 123456"
            autoFocus
            style={{
              flex: 1, height: 56, padding: '0 16px',
              fontSize: 22, fontWeight: 800,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-main)',
              // Remove spinners
              MozAppearance: 'textfield',
            } as React.CSSProperties}
          />
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryBtn onClick={onSubmit} disabled={!otp.trim()} loading={loading}>
            Verify OTP
          </PrimaryBtn>
          <GhostBtn onClick={onCancel}>
            <ArrowBackIcon fontSize="small" /> Cancel
          </GhostBtn>
        </div>
      </div>
    </div>
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
    <div style={styles.centeredWrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}`}</style>
      <div style={styles.centeredCard}>
        <IconCircle color="rgba(var(--primary-rgb,59,130,246),0.12)" pulse>
          <PhoneAndroidIcon style={{ color: 'var(--primary)', fontSize: 30 }} />
        </IconCircle>

        {/* Channel badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 100,
          backgroundColor: channel.bg,
          border: `1px solid ${channel.color}33`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: channel.color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: channel.color }}>{channel.name}</span>
        </div>

        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
            Approve on your phone
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', marginBottom: 8 }}>
            {fmtGHS(amount)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            A USSD prompt has been sent to{' '}
            <strong style={{ color: 'var(--text-main)' }}>{phone}</strong>.
            Dial the prompt on your phone to approve, then tap <em>Check Payment</em>.
          </div>
        </div>

        {verifyMsg && <InfoBanner msg={verifyMsg} />}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
            <RefreshIcon fontSize="small" /> Check Payment
          </PrimaryBtn>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  amount, externalRef, onWallet, onAgain,
}: {
  amount: number; externalRef: string; onWallet: () => void; onAgain: () => void;
}) {
  return (
    <div style={styles.centeredWrap}>
      <div style={styles.centeredCard}>
        <IconCircle color="rgba(16,185,129,0.12)">
          <CheckCircleIcon style={{ color: '#10b981', fontSize: 36 }} />
        </IconCircle>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', marginBottom: 4 }}>
            Deposit Confirmed
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-main)', marginBottom: 4 }}>
            {fmtGHS(amount)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Your wallet has been credited.</div>
          {externalRef && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 8, opacity: 0.7 }}>
              Ref: {externalRef}
            </div>
          )}
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryBtn onClick={onWallet}>
            <AccountBalanceWalletIcon fontSize="small" /> Go to Wallet
          </PrimaryBtn>
          <GhostBtn onClick={onAgain}>Make Another Deposit</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── Error Screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={styles.centeredWrap}>
      <div style={styles.centeredCard}>
        <IconCircle color="rgba(239,68,68,0.1)">
          <span style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>✕</span>
        </IconCircle>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444', marginBottom: 6 }}>Payment Failed</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {msg || 'Something went wrong. Please try again.'}
          </div>
        </div>
        <PrimaryBtn onClick={onRetry}>Try Again</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  // form
  const [amount,  setAmount]  = useState('');
  const [phone,   setPhone]   = useState('');
  const [channel, setChannel] = useState<MoolreChannel>(CHANNELS[0]);
  const [otp,     setOtp]     = useState('');

  // flow
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

  // ── Step 1: First init — generate externalRef, may return OTP_REQ / TP14 ───

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
        // USSD sent directly (no OTP required for this network/user)
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
  // KEY FIX: reuse externalRef. If Moolre returns TP17 (OTP accepted),
  // we must call init AGAIN (same ref, no OTP) to actually fire the USSD push.

  const handleSubmitOtp = async () => {
    if (!otp.trim() || !externalRef) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // 2a. Submit the OTP
      const res   = await moolreInit({
        amount:      parsedAmount.toString(),
        phone:       phone.trim(),
        channel:     channel.id,
        otpcode:     otp.trim(),
        externalref: externalRef,
      });
      const inner = (res?.data ?? res) as Record<string, unknown>;
      const code  = (inner?.code ?? res?.code ?? '') as string;

      if (OTP_REQUIRED_CODES.has(code)) {
        // Wrong OTP — stay on OTP screen
        setOtp('');
        setErrorMsg('Incorrect OTP. Please check the code sent to your phone and try again.');
        return;
      }

      if (code === OTP_ACCEPTED_CODE) {
        // TP17: OTP verified. Moolre won't send USSD until we call init
        // one more time with the same ref but WITHOUT otpcode.
        const res2   = await moolreInit({
          amount:      parsedAmount.toString(),
          phone:       phone.trim(),
          channel:     channel.id,
          externalref: externalRef,
          // No otpcode — this triggers the USSD push
        });
        const inner2 = (res2?.data ?? res2) as Record<string, unknown>;
        const code2  = (inner2?.code ?? res2?.code ?? '') as string;

        if (OTP_REQUIRED_CODES.has(code2)) {
          // Shouldn't happen, but handle gracefully
          setOtp('');
          setErrorMsg('OTP verification succeeded but USSD could not be sent. Please try again.');
          return;
        }
        // USSD push triggered — move to awaiting
        setStep('awaiting');
        return;
      }

      // Any other non-OTP code → USSD already sent
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
        setVerifyMsg(
          message ||
          'Payment not found yet. Please approve the USSD prompt on your phone, then tap Check Payment again.'
        );
      } else {
        setVerifyMsg(
          message || 'Payment is still pending. Please approve the USSD prompt on your phone, then tap Check Payment.'
        );
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify payment. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetAll = () => {
    setStep('form');
    setAmount('');
    setOtp('');
    setExternalRef('');
    setErrorMsg('');
    setVerifyMsg('');
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
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={styles.container}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: 'rgba(var(--primary-rgb,59,130,246),0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AddCardIcon style={{ color: 'var(--primary)', fontSize: 20 }} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Deposit
            </span>
          </div>

          {walletBalance !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 100,
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-light)',
            }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 13, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                {fmtGHS(walletBalance)}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>

          {/* ── Network selector ── */}
          <Section>
            <FieldLabel>Mobile Money Network</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {CHANNELS.map(ch => {
                const active = ch.id === channel.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '14px 8px',
                      borderRadius: 14,
                      border: `1.5px solid ${active ? ch.color : 'var(--border-light)'}`,
                      backgroundColor: active ? ch.bg : 'var(--card-alt)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? `0 0 0 3px ${ch.color}22` : 'none',
                    }}
                  >
                    {/* Color dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      backgroundColor: ch.color,
                      boxShadow: active ? `0 0 8px ${ch.color}88` : 'none',
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
          </Section>

          {/* ── Phone ── */}
          <Section>
            <FieldLabel>MoMo Phone Number</FieldLabel>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 12, overflow: 'hidden',
              border: `1.5px solid ${phone && !phoneValid ? '#ef4444' : 'var(--border-light)'}`,
              backgroundColor: 'var(--card-alt)',
              transition: 'border-color 0.15s',
            }}>
              <div style={{
                padding: '0 14px', height: 52,
                display: 'flex', alignItems: 'center',
                borderRight: '1.5px solid var(--border-light)',
                fontSize: 18, flexShrink: 0,
              }}>
                🇬🇭
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0244 000 000"
                style={{
                  flex: 1, height: 52, padding: '0 14px',
                  fontSize: 16, fontWeight: 600,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            {phone && !phoneValid && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 500 }}>
                Enter a valid phone number
              </div>
            )}
          </Section>

          {/* ── Amount ── */}
          <Section>
            <FieldLabel>Amount (GHS)</FieldLabel>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 12, overflow: 'hidden',
              border: `1.5px solid ${amount && !amountValid ? '#ef4444' : 'var(--border-light)'}`,
              backgroundColor: 'var(--card-alt)',
              transition: 'border-color 0.15s',
            }}>
              <div style={{
                padding: '0 14px', height: 56,
                display: 'flex', alignItems: 'center',
                borderRight: '1.5px solid var(--border-light)',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
                color: 'var(--text-muted)', flexShrink: 0,
              }}>
                GHS
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Min ${MIN_GHS}`}
                min={MIN_GHS}
                style={{
                  flex: 1, height: 56, padding: '0 14px',
                  fontSize: 24, fontWeight: 900,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: amount && !amountValid ? '#ef4444' : 'var(--text-main)',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: amount && !amountValid ? '#ef4444' : 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
              {amount && !amountValid ? `Minimum deposit is ${fmtGHS(MIN_GHS)}` : `Minimum: ${fmtGHS(MIN_GHS)}`}
            </div>

            {/* Quick amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 12 }}>
              {QUICK_AMOUNTS.map(qa => {
                const active = amount === qa.toString();
                return (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(qa.toString())}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 10,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                      backgroundColor: active ? 'var(--primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-main)',
                      fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.12s ease',
                    }}
                  >
                    {fmtQuick(qa)}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── CTA ── */}
          <PrimaryBtn
            onClick={handleInit}
            disabled={!amountValid || !phoneValid}
            loading={loading}
          >
            {ctaLabel}
          </PrimaryBtn>

          {/* ── Footer ── */}
          <div style={{
            textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
            paddingTop: 4, opacity: 0.7,
          }}>
            🔒 Secured by Moolre · MTN · Telecel · AT · Min GHS {MIN_GHS}
          </div>

        </div>
      </div>
    </div>
  );
}
