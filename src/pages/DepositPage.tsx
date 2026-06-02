// bet75 deposit page — with Nigerian Bank Transfer added

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils';
import { useAppStore } from '../store';
import { deposits, wallet as walletApi } from '../utils/api';
import AddCardIcon from '@mui/icons-material/AddCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = 'https://creative-inspiration-production-f4ea.up.railway.app';
const MIN_AMOUNT = 300;
const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000];
const SUPPORT_EMAIL = 'bett75supportgh@gmail.com';

const BINANCE_ADDRESS = 'TGU1DP3i7p5skKvB5uhB3RZ62es5fDf8Ro';
const BINANCE_NETWORK = 'TRC20';
const BINANCE_COIN = 'USDT';
const BINANCE_MIN_USD = 40;

// ── Nigerian Bank Transfer Details ────────────────────────────────────────────
const BANK_NAME        = 'PAYSTACK-TITAN';
const BANK_ACCT_NAME   = 'Chippercash/tijani Samson';
const BANK_ACCT_NUMBER = '9852760835';
const MIN_NGN          = 5000;
const QUICK_NGN        = [5000, 10000, 20000, 50000, 100000];

const COINS = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'];
const NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'Arbitrum', 'Optimism'];

const MOMO_NETWORKS = [
  {
    id: 'MTN',
    label: 'MTN MoMo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/29/MTN-Logo.png',
    fallbackBg: '#FFCB00',
    fallbackInitial: 'M',
  },
  {
    id: 'VODAFONE',
    label: 'Telecel Cash',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYqBE5Z2TJCiY6TNe5xgJLiOJLgcxnjyddKw&s',
    fallbackBg: '#e30613',
    fallbackInitial: 'T',
  },
  {
    id: 'AIRTELTIGO',
    label: 'AirtelTigo Money',
    logo: 'https://www.gsma.com/get-involved/gsma-membership/wp-content/uploads/2014/06/AirtelTigo-Logo-White-background.png',
    fallbackBg: '#e2001a',
    fallbackInitial: 'AT',
  },
];

type Step =
  | 'method'
  | 'form'
  | 'binance-info'
  | 'binance-form'
  | 'processing'
  | 'success'
  | 'binance-success'
  | 'error'
  | 'moolre-approve'
  | 'moolre-done'
  | 'bank-ng-info'
  | 'bank-ng-form'
  | 'bank-ng-success';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-slate-700/60 text-slate-300 border border-slate-600 hover:bg-slate-600/60'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function NetworkLogo({ network, size = 32 }: { network: typeof MOMO_NETWORKS[0]; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: 6, background: network.fallbackBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.35, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.5px',
        }}
      >
        {network.fallbackInitial}
      </div>
    );
  }
  return (
    <img
      src={network.logo} alt={network.label} width={size} height={size} onError={() => setErr(true)}
      style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 3, flexShrink: 0 }}
    />
  );
}

// ── Screenshot compressor (client-side, no upload endpoint) ──────────────────
function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.onload = () => {
        const MAX_W = 800;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(dataUrl.length > 524288 ? canvas.toDataURL('image/jpeg', 0.45) : dataUrl);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Main DepositPage ──────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  // Moolre state
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [momoNet, setMomoNet] = useState('MTN');
  const [extRef, setExtRef] = useState('');
  const [moolreSub, setMoolreSub] = useState<'wait' | 'sms' | 'verify'>('wait');
  const [countdown, setCountdown] = useState(120);
  const [smsCode, setSmsCode] = useState('');
  const [moolreInfo, setMoolreInfo] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Binance form state
  const [txid, setTxid] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [coin, setCoin] = useState('USDT');
  const [network, setNetwork] = useState('TRC20');
  const [expectedGhs, setExpectedGhs] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [userNote, setUserNote] = useState('');
  const [binanceRef, setBinanceRef] = useState('');
  const [binanceErrors, setBinanceErrors] = useState<Record<string, string>>({});

  // Nigerian bank transfer state
  const [bankNgRef, setBankNgRef]               = useState('');
  const [bankNgAmtSent, setBankNgAmtSent]       = useState('');
  const [bankNgExpected, setBankNgExpected]     = useState('');
  const [bankNgSender, setBankNgSender]         = useState('');
  const [bankNgNote, setBankNgNote]             = useState('');
  const [bankNgScreenshot, setBankNgScreenshot] = useState('');
  const [bankNgErrors, setBankNgErrors]         = useState<Record<string, string>>({});
  const [bankNgCompressing, setBankNgCompressing] = useState(false);

  // Shared state
  const [step, setStep] = useState<Step>('method');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/deposit' } });
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    walletApi.getWallet()
      .then(res => setWalletBalance((res.data as { balance?: number }).balance ?? null))
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (step === 'moolre-approve' && moolreSub === 'wait') {
      setCountdown(120);
      timerRef.current = setInterval(() =>
        setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; }), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, moolreSub]);

  const parsedAmount = parseFloat(amount);
  const amountValid = !isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT;

  const getToken = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

  const apiPost = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || 'Request failed.');
    return data;
  };

  // ── Moolre handlers ──────────────────────────────────────────────────────
  const handleMoolreInit = async () => {
    if (!amountValid) return;
    if (!/^0\d{9}$/.test(phone.trim())) { setErrorMsg('Enter a valid 10-digit number starting with 0.'); setStep('error'); return; }
    setLoading(true); setErrorMsg(''); setStep('processing');
    try {
      const data = await apiPost('/api/wallet/deposit/moolre/init', { amount: parsedAmount, phone: phone.trim(), network: momoNet });
      setExtRef(data?.data?.externalref || '');
      setMoolreSub(data?.data?.actionRequired ? 'sms' : 'wait');
      setStep('moolre-approve');
    } catch (e: unknown) { setErrorMsg(e instanceof Error ? e.message : 'Failed to initiate payment.'); setStep('error'); }
    finally { setLoading(false); }
  };

  const handleSmsSubmit = async () => {
    setErrorMsg('');
    if (!smsCode.trim()) { setErrorMsg('Enter the SMS code.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/wallet/deposit/moolre/otp', { externalref: extRef, otp: smsCode.trim() });
      setSmsCode(''); setMoolreSub('wait');
    } catch (e: unknown) { setErrorMsg(e instanceof Error ? e.message : 'OTP verification failed.'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setErrorMsg(''); setMoolreInfo(''); setLoading(true);
    try {
      const data = await apiPost('/api/wallet/deposit/moolre/verify', { externalref: extRef });
      const r = data?.data;
      if (r?.credited) setStep('moolre-done');
      else if (r?.txstatus === 0) setMoolreInfo('Still pending — approve the prompt then verify again.');
      else if (r?.txstatus === 2) { setErrorMsg('Payment cancelled. Start a new deposit.'); setStep('error'); }
      else setMoolreInfo(r?.message || 'Status unclear. Try again.');
    } catch (e: unknown) { setErrorMsg(e instanceof Error ? e.message : 'Verification failed.'); }
    finally { setLoading(false); }
  };

  // ── Binance handlers ─────────────────────────────────────────────────────
  const validateBinanceForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!txid.trim() || txid.trim().length < 10) errs.txid = 'Valid Transaction Hash required (min 10 characters)';
    if (!cryptoAmount || isNaN(+cryptoAmount) || +cryptoAmount <= 0) errs.cryptoAmount = 'Enter the amount you sent';
    if (+cryptoAmount > 0 && +cryptoAmount < BINANCE_MIN_USD) errs.cryptoAmount = `Minimum crypto deposit is $${BINANCE_MIN_USD} USD`;
    if (!expectedGhs || isNaN(+expectedGhs) || +expectedGhs < 1) errs.expectedGhs = 'Enter the expected GH₵ credit amount';
    setBinanceErrors(errs); return Object.keys(errs).length === 0;
  };

  const handleBinanceSubmit = async () => {
    if (!validateBinanceForm()) return;
    setLoading(true); setErrorMsg(''); setStep('processing');
    try {
      const res = await deposits.binanceSubmit({
        txid: txid.trim(), cryptoAmount: parseFloat(cryptoAmount), coin, network,
        expectedGhsAmount: parseFloat(expectedGhs), senderAddress: senderAddress.trim() || undefined,
        screenshotUrl: screenshotPreview || undefined, userNote: userNote.trim() || undefined,
      });
      setBinanceRef((res.data as { id?: string }).id ?? '');
      setStep('binance-success');
    } catch (e: unknown) { setErrorMsg(e instanceof Error ? e.message : 'Submission failed. Please try again.'); setStep('error'); }
    finally { setLoading(false); }
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Nigerian Bank Transfer handlers ──────────────────────────────────────
  const handleBankNgScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankNgCompressing(true);
    try {
      const dataUrl = await compressImageToBase64(file);
      setBankNgScreenshot(dataUrl);
      setBankNgErrors(p => ({ ...p, screenshot: '' }));
    } catch { setBankNgErrors(p => ({ ...p, screenshot: 'Could not process image. Try another file.' })); }
    finally { setBankNgCompressing(false); }
  };

  const validateBankNg = (): boolean => {
    const e: Record<string, string> = {};
    if (!bankNgRef.trim() || bankNgRef.trim().length < 3) e.ref = 'Transfer reference / narration is required';
    const amt = parseFloat(bankNgAmtSent);
    if (!amt || isNaN(amt) || amt <= 0) e.amt = 'Enter the amount you transferred';
    else if (amt < MIN_NGN) e.amt = `Minimum deposit is ₦${MIN_NGN.toLocaleString()}`;
    if (!bankNgExpected || isNaN(+bankNgExpected) || +bankNgExpected < 1) e.exp = 'Enter expected wallet credit';
    if (!bankNgScreenshot) e.screenshot = 'A payment screenshot is required';
    setBankNgErrors(e); return Object.keys(e).length === 0;
  };

  const handleBankNgSubmit = async () => {
    if (!validateBankNg()) return;
    setLoading(true); setErrorMsg('');
    try {
      await apiPost('/api/wallet/bank-deposits', {
        transferReference: bankNgRef.trim(),
        ngnAmountSent: parseFloat(bankNgAmtSent),
        expectedNgnCredit: parseFloat(bankNgExpected),
        senderAccountName: bankNgSender.trim() || undefined,
        screenshotUrl: bankNgScreenshot,
        userNote: bankNgNote.trim() || undefined,
      });
      setStep('bank-ng-success');
    } catch (e: unknown) { setErrorMsg(e instanceof Error ? e.message : 'Submission failed. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAll = () => {
    setStep('method'); setAmount(''); setPhone(''); setMomoNet('MTN'); setExtRef('');
    setMoolreSub('wait'); setSmsCode(''); setMoolreInfo('');
    setTxid(''); setCryptoAmount(''); setCoin('USDT'); setNetwork('TRC20');
    setExpectedGhs(''); setSenderAddress(''); setScreenshotPreview(''); setUserNote('');
    setBinanceRef(''); setBinanceErrors({}); setErrorMsg('');
    setBankNgRef(''); setBankNgAmtSent(''); setBankNgExpected(''); setBankNgSender('');
    setBankNgNote(''); setBankNgScreenshot(''); setBankNgErrors({});
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Processing
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <AddCardIcon className="text-primary" sx={{ fontSize: 32 }} />
        </div>
        <h2 className="font-heading text-xl font-bold mb-2">Processing…</h2>
        <p className="text-sm text-slate-500">Please wait while we process your deposit.</p>
        <p className="text-xs text-slate-600 mt-2">Do not close this page.</p>
        <p className="text-xs text-slate-400 mt-6">
          Need help?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline hover:text-primary/80 transition-colors">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Moolre Done
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'moolre-done') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <CheckCircleIcon className="text-green-500 mx-auto mb-4" sx={{ fontSize: 64 }} />
        <h2 className="font-heading text-2xl font-bold text-green-600 mb-2">Deposit Successful</h2>
        <p className="text-lg font-semibold mb-1">{formatCurrency(parsedAmount)}</p>
        <p className="text-sm text-slate-500 mb-2">Your wallet has been credited.</p>
        {extRef && <p className="text-xs text-slate-400 mb-6">Reference: <span className="font-mono">{extRef}</span></p>}
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/wallet')} className="btn-primary">Go to Wallet</button>
          <button onClick={resetAll} className="btn-secondary">Make Another Deposit</button>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Questions?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline hover:text-primary/80 transition-colors">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Binance Success
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'binance-success') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-amber-400 mb-2">Proof Submitted!</h2>
        <p className="text-sm text-slate-400 mb-1">Your crypto deposit is under review. An admin will verify and credit your wallet.</p>
        <p className="text-xs text-slate-500 mb-2">This usually takes 1–5 minutes.</p>
        {binanceRef && <p className="text-xs text-slate-500 mb-6">Submission ID: <span className="font-mono text-slate-400">{binanceRef}</span></p>}
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/wallet')} className="btn-primary">Go to Wallet</button>
          <button onClick={resetAll} className="btn-secondary">Make Another Deposit</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Nigerian Bank Transfer — Success
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'bank-ng-success') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-green-400 mb-2">Proof Submitted!</h2>
        <p className="text-sm text-slate-400 mb-1">Your bank transfer is under review.</p>
        <p className="text-xs text-slate-500 mb-6">An admin will verify and credit your wallet within <strong className="text-slate-300">5–10 minutes</strong>.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/wallet')} className="btn-primary">Go to Wallet</button>
          <button onClick={resetAll} className="btn-secondary">Make Another Deposit</button>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Questions?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline hover:text-primary/80 transition-colors">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl font-bold">✕</span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-red-600 mb-2">Failed</h2>
        <p className="text-sm text-slate-500 mb-4">{errorMsg || 'Something went wrong. Please try again.'}</p>
        <p className="text-xs text-slate-400 mb-8">
          If this keeps happening, contact support:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline hover:text-primary/80 transition-colors">{SUPPORT_EMAIL}</a>
        </p>
        <button onClick={resetAll} className="btn-primary">Try Again</button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Moolre Approve
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'moolre-approve') {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-slate-400 hover:text-slate-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-heading text-2xl font-bold">Approve Payment</h1>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{errorMsg}</p>
          </div>
        )}
        {moolreInfo && (
          <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-blue-400">{moolreInfo}</p>
          </div>
        )}

        {moolreSub === 'sms' && (
          <>
            <div className="card p-6 mb-4 text-center border-2 border-amber-500/30 bg-amber-500/5">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-amber-400 mb-2">Check your SMS</h3>
              <p className="text-sm text-slate-400">A code was sent to <strong className="text-slate-200">{phone}</strong>. Enter it below.</p>
            </div>
            <div className="card p-5 mb-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">SMS Code</label>
              <input type="text" inputMode="numeric" value={smsCode}
                onChange={e => setSmsCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter code" maxLength={8} autoFocus
                className="input-field text-center text-2xl font-bold tracking-[0.5em]" />
            </div>
            <button onClick={handleSmsSubmit} disabled={loading || smsCode.length < 4}
              className="btn-primary w-full mb-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Verifying…' : 'Submit Code'}
            </button>
            <button onClick={() => { setMoolreSub('wait'); setErrorMsg(''); }} className="btn-secondary w-full">Back</button>
          </>
        )}

        {moolreSub === 'wait' && (
          <>
            <div className="card p-6 mb-4 text-center border-2 border-primary/20 bg-primary/5">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-primary mb-2">Check your phone</h3>
              <p className="text-sm text-slate-400">USSD prompt sent to <strong className="text-slate-200">{phone}</strong>.</p>
              <p className="text-sm text-slate-400 mt-1">Approve <strong className="text-primary">{formatCurrency(parsedAmount)}</strong> on your phone.</p>
              {countdown > 0
                ? <p className="text-xs text-slate-500 mt-3">Expires in <strong className="text-slate-300">{fmtTime(countdown)}</strong></p>
                : <p className="text-xs text-red-400 mt-3">May have expired — verify below</p>}
            </div>
            <button onClick={() => { setMoolreSub('verify'); setErrorMsg(''); setMoolreInfo(''); }} className="btn-primary w-full mb-3">
              I've Approved — Verify Payment
            </button>
            <button onClick={() => { setStep('form'); setErrorMsg(''); }} className="btn-secondary w-full">Start Over</button>
          </>
        )}

        {moolreSub === 'verify' && (
          <>
            <div className="card p-6 mb-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Verify Payment</h3>
              <p className="text-sm text-slate-400">Checking {formatCurrency(parsedAmount)} from {phone}</p>
            </div>
            <button onClick={handleVerify} disabled={loading}
              className="btn-primary w-full mb-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Verifying…' : 'Verify Payment'}
            </button>
            <button onClick={() => { setMoolreSub('wait'); setErrorMsg(''); setMoolreInfo(''); }} className="btn-secondary w-full mb-3">
              Still Waiting
            </button>
            <button onClick={() => { setStep('form'); setErrorMsg(''); }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors">
              Start Over
            </button>
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Binance — Address Info
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'binance-info') {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-slate-400 hover:text-slate-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <span className="text-xl">₿</span> Crypto Deposit
            </h1>
          </div>
          {walletBalance !== null && (
            <span className="text-sm text-slate-500">Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong></span>
          )}
        </div>

        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-amber-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">New to Binance?</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Create a free account to buy &amp; send crypto in minutes.</p>
            </div>
            <a href="https://www.binance.com/en/register" target="_blank" rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
              Create Account
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        <div className="card p-5 mb-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">₮</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Send USDT to this address</p>
              <p className="text-xs text-slate-500">Network: <span className="text-amber-400 font-semibold">TRC20 (TRON)</span></p>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Wallet Address</p>
            <p className="font-mono text-sm text-slate-100 break-all leading-relaxed mb-3">{BINANCE_ADDRESS}</p>
            <CopyButton text={BINANCE_ADDRESS} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Network', BINANCE_NETWORK], ['Coin', BINANCE_COIN], ['Min.', `$${BINANCE_MIN_USD} USDT`]].map(([label, val]) => (
              <div key={label} className="rounded-lg p-2.5 text-center bg-slate-800/40 border border-slate-700/50">
                <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                <p className="text-xs font-bold text-slate-200">{val}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
            ⚠ Only send <strong>USDT via TRC20</strong>. Sending other coins or using the wrong network may result in <strong>permanent loss of funds</strong>.
          </p>
        </div>

        <button onClick={() => setStep('binance-form')} className="btn-primary w-full">
          I've Sent the Payment — Submit Proof →
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">🔍 Your deposit will be credited after admin verification (1–5 mins)</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Binance — Proof Form
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'binance-form') {
    const fieldErr = (key: string) =>
      binanceErrors[key] ? <p className="text-xs text-red-400 mt-1">{binanceErrors[key]}</p> : null;
    const inputCls = (key: string) =>
      `input-field ${binanceErrors[key] ? 'border-red-500 focus:ring-red-500/30' : ''}`;

    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setStep('binance-info')} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-2xl font-bold">Payment Proof</h1>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Transaction Hash (TXID) <span className="text-red-400">*</span>
            </label>
            <input type="text" value={txid}
              onChange={e => { setTxid(e.target.value); setBinanceErrors(p => ({ ...p, txid: '' })); }}
              placeholder="Paste your blockchain TXID here" className={inputCls('txid')} />
            {fieldErr('txid')}
            <p className="text-[11px] text-slate-500 mt-1.5">Find this in your Binance withdrawal history or blockchain explorer.</p>
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Coin <span className="text-red-400">*</span></label>
                <select value={coin} onChange={e => setCoin(e.target.value)} className="input-field">
                  {COINS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Network <span className="text-red-400">*</span></label>
                <select value={network} onChange={e => setNetwork(e.target.value)} className="input-field">
                  {NETWORKS.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Amount Sent ({coin}) <span className="text-red-400">*</span></label>
                <input type="number" value={cryptoAmount}
                  onChange={e => { setCryptoAmount(e.target.value); setBinanceErrors(p => ({ ...p, cryptoAmount: '' })); }}
                  placeholder={`Min. $${BINANCE_MIN_USD}`} min={BINANCE_MIN_USD} step="any" className={inputCls('cryptoAmount')} />
                {fieldErr('cryptoAmount')}
                <p className="text-[11px] text-slate-500 mt-1">Minimum: ${BINANCE_MIN_USD} USD</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Expected GH₵ Credit <span className="text-red-400">*</span></label>
                <input type="number" value={expectedGhs}
                  onChange={e => { setExpectedGhs(e.target.value); setBinanceErrors(p => ({ ...p, expectedGhs: '' })); }}
                  placeholder="0.00" min="0" step="any" className={inputCls('expectedGhs')} />
                {fieldErr('expectedGhs')}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Sender Wallet Address</label>
            <input type="text" value={senderAddress} onChange={e => setSenderAddress(e.target.value)}
              placeholder="Wallet address you sent from (optional)" className="input-field" />
          </div>

          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Payment Screenshot</label>
            {screenshotPreview ? (
              <div className="relative mb-2">
                <img src={screenshotPreview} alt="Screenshot preview" className="w-full rounded-xl max-h-48 object-cover" />
                <button onClick={() => setScreenshotPreview('')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors">
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-slate-600 dark:border-slate-700 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
                <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate-500">Tap to upload screenshot</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
              </label>
            )}
            <p className="text-[11px] text-slate-500 mt-1.5">Upload a screenshot of your payment confirmation (optional but recommended).</p>
          </div>

          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Note to Admin</label>
            <textarea value={userNote} onChange={e => setUserNote(e.target.value)}
              placeholder="Any additional info for the admin (optional)" rows={3} className="input-field resize-none" />
          </div>
        </div>

        <button onClick={handleBinanceSubmit} disabled={loading}
          className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Submitting…' : 'Submit Deposit Proof'}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">🔍 Your deposit will be manually reviewed and credited within 1–5 minutes</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Nigerian Bank Transfer — Account Info
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'bank-ng-info') {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-slate-400 hover:text-slate-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M9 18H3a2 2 0 01-2-2V8a2 2 0 012-2h18a2 2 0 012 2v8a2 2 0 01-2 2h-6" />
              </svg>
              Bank Transfer
            </h1>
          </div>
          {walletBalance !== null && (
            <span className="text-sm text-slate-500">Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong></span>
          )}
        </div>

        {/* Minimum notice */}
        <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-green-400">
            Minimum deposit: <strong>₦{MIN_NGN.toLocaleString()}</strong>
          </p>
        </div>

        {/* Bank account card */}
        <div className="card p-5 mb-4 border border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Transfer to this account</p>
              <p className="text-xs text-slate-500">Then submit your payment proof below</p>
            </div>
          </div>

          {/* Bank Name */}
          <div className="bg-slate-800/60 rounded-xl p-4 mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
              </svg>
              Bank Name
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-100">{BANK_NAME}</p>
              <CopyButton text={BANK_NAME} />
            </div>
          </div>

          {/* Account Name */}
          <div className="bg-slate-800/60 rounded-xl p-4 mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account Name
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-100">{BANK_ACCT_NAME}</p>
              <CopyButton text={BANK_ACCT_NAME} />
            </div>
          </div>

          {/* Account Number */}
          <div className="bg-slate-800/60 rounded-xl p-4 mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Account Number
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-2xl font-bold text-slate-100 tracking-wider">{BANK_ACCT_NUMBER}</p>
              <CopyButton text={BANK_ACCT_NUMBER} />
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[11px] text-amber-500 leading-relaxed">
              Always include your <strong>username or phone number</strong> in the transfer narration so we can identify your payment.
            </p>
          </div>
        </div>

        <button onClick={() => setStep('bank-ng-form')} className="btn-primary w-full">
          I've Sent the Money — Submit Proof →
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">🔍 Verified within 5–10 minutes</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Nigerian Bank Transfer — Proof Form
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'bank-ng-form') {
    const fieldErr = (key: string) =>
      bankNgErrors[key] ? <p className="text-xs text-red-400 mt-1">{bankNgErrors[key]}</p> : null;
    const inputCls = (key: string) =>
      `input-field ${bankNgErrors[key] ? 'border-red-500 focus:ring-red-500/30' : ''}`;

    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setStep('bank-ng-info')} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-2xl font-bold">Payment Proof</h1>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Reference */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Transfer Reference / Narration <span className="text-red-400">*</span>
            </label>
            <input type="text" value={bankNgRef}
              onChange={e => { setBankNgRef(e.target.value); setBankNgErrors(p => ({ ...p, ref: '' })); }}
              placeholder="Your name, username, or receipt reference"
              className={inputCls('ref')} />
            {fieldErr('ref')}
            <p className="text-[11px] text-slate-500 mt-1.5">Use the exact narration you entered during the transfer.</p>
          </div>

          {/* Amounts */}
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Amount Sent (₦) <span className="text-red-400">*</span>
                </label>
                <input type="number" value={bankNgAmtSent}
                  onChange={e => { setBankNgAmtSent(e.target.value); setBankNgErrors(p => ({ ...p, amt: '' })); }}
                  placeholder={`Min ₦${MIN_NGN.toLocaleString()}`} className={inputCls('amt')} />
                {fieldErr('amt')}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Expected ₦ Credit <span className="text-red-400">*</span>
                </label>
                <input type="number" value={bankNgExpected}
                  onChange={e => { setBankNgExpected(e.target.value); setBankNgErrors(p => ({ ...p, exp: '' })); }}
                  placeholder="0.00" className={inputCls('exp')} />
                {fieldErr('exp')}
              </div>
            </div>
          </div>

          {/* Sender name */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Sender Account Name</label>
            <input type="text" value={bankNgSender} onChange={e => setBankNgSender(e.target.value)}
              placeholder="Name on your bank account (optional)" className="input-field" />
          </div>

          {/* Screenshot — required for bank */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Payment Screenshot <span className="text-red-400">*</span>
            </label>
            {bankNgScreenshot ? (
              <div className="relative mb-2">
                <img src={bankNgScreenshot} alt="Screenshot preview" className="w-full rounded-xl max-h-48 object-cover" />
                {bankNgCompressing && (
                  <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {!bankNgCompressing && (
                  <button onClick={() => setBankNgScreenshot('')}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors">
                    ✕
                  </button>
                )}
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/90 text-white">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Ready
                  </span>
                </div>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all ${bankNgErrors.screenshot ? 'border-red-500/50 bg-red-500/5' : 'border-slate-600 dark:border-slate-700 hover:border-green-500/50 hover:bg-green-500/5'}`}>
                {bankNgCompressing ? (
                  <div className="w-6 h-6 border-2 border-slate-500 border-t-green-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate-500">Tap to upload payment screenshot</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">JPG · PNG · WEBP · Max 8 MB</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleBankNgScreenshot} />
              </label>
            )}
            {fieldErr('screenshot')}
            {!bankNgErrors.screenshot && !bankNgScreenshot && (
              <p className="text-[11px] text-slate-500 mt-1.5">Upload a photo of your bank transfer receipt or confirmation screen.</p>
            )}
            {!bankNgErrors.screenshot && bankNgScreenshot && (
              <p className="text-[11px] text-green-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Screenshot attached — will be sent with your deposit proof
              </p>
            )}
          </div>

          {/* Quick amounts for context */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Quick fill amount sent</label>
            <div className="grid grid-cols-5 gap-2">
              {QUICK_NGN.map(q => (
                <button key={q} onClick={() => { setBankNgAmtSent(String(q)); setBankNgExpected(String(q)); setBankNgErrors(p => ({ ...p, amt: '', exp: '' })); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    bankNgAmtSent === String(q)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                  {q >= 1000000 ? `${q / 1000000}M` : q >= 1000 ? `${q / 1000}k` : q}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Note to Admin</label>
            <textarea value={bankNgNote} onChange={e => setBankNgNote(e.target.value)}
              placeholder="Any additional info (optional)" rows={3} className="input-field resize-none" />
          </div>
        </div>

        <button onClick={handleBankNgSubmit} disabled={loading || bankNgCompressing}
          className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Submitting…' : 'Submit Transfer Proof'}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">🔍 Reviewed &amp; credited within 5–10 minutes</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Method Selection
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'method') {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <AddCardIcon className="text-primary" />
            Deposit
          </h1>
          {walletBalance !== null && (
            <span className="text-sm text-slate-500">
              Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong>
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 mb-4">Choose your deposit method:</p>

        <div className="space-y-3 mb-6">
          {/* Mobile Money */}
          <button onClick={() => setStep('form')}
            className="w-full card p-5 flex items-center gap-4 text-left hover:border-primary/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100">Mobile Money</p>
              <p className="text-xs text-slate-500 mt-0.5">Pay instantly via Moolre — MTN, Vodafone, AirtelTigo</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Instant</span>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Nigerian Bank Transfer */}
          <button onClick={() => setStep('bank-ng-info')}
            className="w-full card p-5 flex items-center gap-4 text-left hover:border-green-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M9 18H3a2 2 0 01-2-2V8a2 2 0 012-2h18a2 2 0 012 2v8a2 2 0 01-2 2h-6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100">Bank Transfer <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full ml-1.5">🇳🇬 Nigeria</span></p>
              <p className="text-xs text-slate-500 mt-0.5">Paystack-Titan · Direct Transfer · Min ₦{MIN_NGN.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">5–10 min</span>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Crypto */}
          <button onClick={() => setStep('binance-info')}
            className="w-full card p-5 flex items-center gap-4 text-left hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
              <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100">Crypto (Binance / USDT)</p>
              <p className="text-xs text-slate-500 mt-0.5">Min. $40 · USDT via TRC20 · BTC · ETH · BNB — manual review &amp; credit</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">1–5 mins</span>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-2">
          Need help?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline hover:text-primary/80 transition-colors">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Moolre amount form
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <AddCardIcon className="text-primary" />
            Mobile Money
          </h1>
        </div>
        {walletBalance !== null && (
          <span className="text-sm text-slate-500">
            Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong>
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      <div className="card p-5 mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Amount (GH₵)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder={`Minimum GH₵${MIN_AMOUNT}`} className="input-field mb-1" min={MIN_AMOUNT} step="1" />
        {amount && !amountValid && (
          <p className="text-xs text-red-500 mb-3">Minimum deposit is {formatCurrency(MIN_AMOUNT)}</p>
        )}
        {(!amount || amountValid) && <div className="mb-3" />}
        <div className="grid grid-cols-5 gap-2">
          {QUICK_AMOUNTS.map(qa => (
            <button key={qa} onClick={() => setAmount(qa.toString())}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                amount === qa.toString()
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}>
              {qa >= 1000 ? `${qa / 1000}k` : qa}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">MoMo Phone Number</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="0244123456" maxLength={10} className="input-field" />
        <p className="text-[11px] text-slate-500 mt-1.5">10 digits starting with 0</p>
      </div>

      <div className="card p-5 mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Network</label>
        <div className="flex flex-col gap-2">
          {MOMO_NETWORKS.map(n => (
            <button key={n.id} onClick={() => setMomoNet(n.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                momoNet === n.id ? 'border-primary bg-primary/5' : 'border-slate-600 dark:border-slate-700 hover:border-slate-500'
              }`}>
              <NetworkLogo network={n} size={30} />
              <span className={`text-sm font-semibold flex-1 text-left ${momoNet === n.id ? 'text-primary' : 'text-slate-400'}`}>
                {n.label}
              </span>
              {momoNet === n.id && <CheckCircleIcon className="text-primary" sx={{ fontSize: 20 }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-400">A USSD prompt will be sent to your phone. Approve it within 2 minutes.</p>
      </div>

      <button onClick={handleMoolreInit} disabled={!amountValid || !phone || loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
        {!amount
          ? `Enter an Amount (min GH₵${MIN_AMOUNT})`
          : !amountValid
            ? `Minimum is ${formatCurrency(MIN_AMOUNT)}`
            : !phone
              ? 'Enter phone number'
              : `Send MoMo Prompt · ${formatCurrency(parsedAmount)}`}
      </button>

      <p className="text-center text-xs text-slate-400 mt-3">🔒 Payments secured by Moolre · MTN, Vodafone, AirtelTigo</p>
      <p className="text-center text-xs text-slate-400 mt-2">
        Need help?{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline hover:text-primary/80 transition-colors">{SUPPORT_EMAIL}</a>
      </p>
    </div>
  );
}
