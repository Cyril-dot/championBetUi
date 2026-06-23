import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  wallet as walletApi,
  withdrawals,
  affiliate,
  Transaction,
  AffiliateStatsDTO,
} from '../utils/api';

import WalletIcon            from '@mui/icons-material/AccountBalanceWallet';
import SyncIcon              from '@mui/icons-material/Sync';
import NorthEastIcon         from '@mui/icons-material/NorthEast';
import SouthWestIcon         from '@mui/icons-material/SouthWest';
import CurrencyExchangeIcon  from '@mui/icons-material/CurrencyExchange';
import MoneyOffIcon          from '@mui/icons-material/MoneyOff';
import TaskAltIcon           from '@mui/icons-material/TaskAlt';
import VisibilityIcon        from '@mui/icons-material/Visibility';
import VisibilityOffIcon     from '@mui/icons-material/VisibilityOff';
import CancelIcon            from '@mui/icons-material/Cancel';
import LoopIcon              from '@mui/icons-material/Loop';
import PeopleAltIcon         from '@mui/icons-material/PeopleAlt';
import PaidIcon              from '@mui/icons-material/Paid';
import HeadsetMicIcon        from '@mui/icons-material/HeadsetMic';
import ChevronRightIcon      from '@mui/icons-material/ChevronRight';
import EmailIcon             from '@mui/icons-material/Email';
import TelegramIcon          from '@mui/icons-material/Telegram';
import InfoOutlinedIcon      from '@mui/icons-material/InfoOutlined';
import PhoneAndroidIcon      from '@mui/icons-material/PhoneAndroid';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import AddCardIcon           from '@mui/icons-material/AddCard';
import PaymentsIcon          from '@mui/icons-material/Payments';
import ExpandMoreIcon        from '@mui/icons-material/ExpandMore';
import LockIcon              from '@mui/icons-material/Lock';
import FlashOnIcon           from '@mui/icons-material/FlashOn';

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_WITHDRAWAL_AMOUNT      = 2000;
const REQUIRED_TOTAL_DEPOSIT_GHS = 1000;

// Activation fee constants
const ACTIVATION_FEE_GHS = 500;
const ACTIVATION_FEE_NGN = 45000;  // ~500 GHS in Naira
const ACTIVATION_FEE_USD = 50;     // $50 USD

// Deposit / Payment constants (mirrors DepositPage)
const API_BASE     = 'https://championbet.onrender.com';
const IMGBB_API_KEY = 'bdd12743a2e929bcdd4a6843dea9295e';

const BINANCE_ADDRESS = 'TNxZMMoqCtfc98gJeUiDVZrLzoFMQfVYX5';
const BINANCE_NETWORK = 'TRC20';
const BINANCE_COIN    = 'USDT';
const CRYPTO_COINS    = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'];
const CRYPTO_NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'Arbitrum', 'Optimism'];
const SUPPORT_EMAIL   = 'championbetofficial@gmail.com';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletData {
  balance: number;
  currency?: string;
  activationFeePaid?: boolean;
  [key: string]: unknown;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  countryCode: string;
  name: string;
}

// ── Currency Detection ────────────────────────────────────────────────────────

const MOMO_NETWORKS: Record<string, string[]> = {
  GH: ['MTN', 'AirtelTigo', 'Telecel'],
  NG: ['MTN', 'Airtel', 'Glo', '9mobile'],
  KE: ['M-Pesa', 'Airtel Money', 'T-Kash'],
  TZ: ['M-Pesa', 'Airtel Money', 'Tigo Pesa'],
  UG: ['MTN Mobile Money', 'Airtel Money'],
  SN: ['Orange Money', 'Wave', 'Free Money'],
  CI: ['Orange Money', 'MTN MoMo', 'Moov Money'],
  CM: ['MTN MoMo', 'Orange Money'],
  ZM: ['MTN Money', 'Airtel Money'],
  ZW: ['EcoCash', 'OneMoney', 'Telecash'],
};

const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  GH: { code: 'GHS', symbol: 'GH₵',  name: 'Ghanaian Cedi' },
  NG: { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira' },
  KE: { code: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling' },
  TZ: { code: 'TZS', symbol: 'TSh',  name: 'Tanzanian Shilling' },
  UG: { code: 'UGX', symbol: 'USh',  name: 'Ugandan Shilling' },
  ZA: { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  SN: { code: 'XOF', symbol: 'CFA',  name: 'West African CFA Franc' },
  CI: { code: 'XOF', symbol: 'CFA',  name: 'West African CFA Franc' },
  CM: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  ZM: { code: 'ZMW', symbol: 'ZK',   name: 'Zambian Kwacha' },
  ZW: { code: 'ZWL', symbol: 'Z$',   name: 'Zimbabwean Dollar' },
  GB: { code: 'GBP', symbol: '£',    name: 'British Pound' },
  US: { code: 'USD', symbol: '$',    name: 'US Dollar' },
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', countryCode: 'GH',
};

const CURRENCY_CACHE_KEY = 'cb_wallet_currency_cache';
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedCurrency(): CurrencyInfo | null {
  try {
    const raw = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: CurrencyInfo; timestamp: number };
    if (Date.now() - timestamp > CURRENCY_CACHE_TTL) {
      localStorage.removeItem(CURRENCY_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedCurrency(info: CurrencyInfo): void {
  try {
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({ data: info, timestamp: Date.now() }));
  } catch {}
}

async function detectCurrencyInfo(): Promise<CurrencyInfo> {
  const cached = getCachedCurrency();
  if (cached) return cached;

  let countryCode = '';
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) { const d = await res.json(); countryCode = d.country_code ?? ''; }
  } catch { /* fall through */ }
  if (!countryCode) {
    try {
      const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) });
      if (res.ok) { const d = await res.json(); countryCode = d.countryCode ?? ''; }
    } catch { /* fall through */ }
  }

  const localCurrency = countryCode ? COUNTRY_CURRENCY[countryCode] : undefined;
  const result: CurrencyInfo = localCurrency
    ? { code: localCurrency.code, symbol: localCurrency.symbol, name: localCurrency.name, countryCode }
    : DEFAULT_CURRENCY;

  setCachedCurrency(result);
  return result;
}

function formatCurrency(amount: number, currency: CurrencyInfo): string {
  return `${currency.symbol} ${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Activation Fee Helpers ────────────────────────────────────────────────────

function getActivationFee(currency: CurrencyInfo): { amount: number; display: string } {
  if (currency.countryCode === 'NG') {
    return { amount: ACTIVATION_FEE_NGN, display: `₦${ACTIVATION_FEE_NGN.toLocaleString()}` };
  }
  if (['US', 'GB', 'DE', 'FR', 'KE', 'TZ', 'UG', 'ZA', 'SN', 'CI', 'CM', 'ZM', 'ZW'].includes(currency.countryCode)) {
    return { amount: ACTIVATION_FEE_USD, display: `$${ACTIVATION_FEE_USD}` };
  }
  return { amount: ACTIVATION_FEE_GHS, display: `GH₵${ACTIVATION_FEE_GHS}` };
}

// ── Transaction Helpers ───────────────────────────────────────────────────────

const INCOMING_KINDS = [
  'DEPOSIT', 'BET_WIN', 'REFERRAL_COMMISSION', 'PAYOUT',
  'VIP_CASHBACK', 'WELCOME_BONUS', 'WITHDRAWAL_REFUND', 'ADJUSTMENT',
];

function isIncoming(kind: string) { return INCOMING_KINDS.includes(kind); }

function hasAnyDeposit(transactions: Transaction[]): boolean {
  return transactions.some(tx => tx.kind === 'DEPOSIT');
}

function sumLifetimeDepositsGhs(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.kind === 'DEPOSIT')
    .reduce((acc, tx) => acc + (tx.amount ?? 0), 0);
}

function isAdminUser(user: { role?: string; isAdmin?: boolean; [key: string]: unknown } | null): boolean {
  if (!user) return false;
  const role = (user.role as string | undefined)?.toUpperCase() ?? '';
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || user.isAdmin === true;
}

function hasActivationFeePaid(
  walletData: WalletData | null,
  transactions: Transaction[],
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (walletData?.activationFeePaid === true) return true;
  // Also check transactions for an ACTIVATION_FEE kind
  return transactions.some(tx => tx.kind === 'ACTIVATION_FEE');
}

function txLabel(kind: string): string {
  const map: Record<string, string> = {
    DEPOSIT: 'Deposit', WITHDRAW: 'Withdrawal', WITHDRAW_HOLD: 'Withdrawal Hold',
    WITHDRAW_RELEASE: 'Withdrawal Released', BET_STAKE: 'Bet Placed', BET_WIN: 'Bet Won',
    REFERRAL_COMMISSION: 'Affiliate Commission', PAYOUT: 'Payout', ADJUSTMENT: 'Adjustment',
    VIP_CASHBACK: 'VIP Cashback', VIP_MEMBERSHIP: 'VIP Membership',
    WELCOME_BONUS: 'Welcome Bonus', WITHDRAWAL_REFUND: 'Withdrawal Refund',
    ADMIN_UPGRADE_FEE: 'Admin Upgrade Fee',
    ACTIVATION_FEE: 'Withdrawal Activation Fee',
  };
  return map[kind] ?? kind;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── Gate Logic ────────────────────────────────────────────────────────────────

type GateStatus = 'open' | 'activation_required' | 'deposit_gate';

function getWithdrawalGateStatus(
  totalDepositedGhs: number,
  hasDeposited: boolean,
  isAdmin: boolean,
  activationPaid: boolean,
): GateStatus {
  if (isAdmin) return 'open';
  if (!activationPaid) return 'activation_required';
  if (!hasDeposited) return 'open';
  if (totalDepositedGhs < REQUIRED_TOTAL_DEPOSIT_GHS) return 'deposit_gate';
  return 'open';
}

// ── ImgBB Upload ──────────────────────────────────────────────────────────────

async function uploadToImgBB(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST', body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `ImgBB upload failed (${res.status})`);
  }
  const data = await res.json();
  const url: string = data?.data?.url;
  if (!url) throw new Error('ImgBB returned no URL.');
  return url;
}

function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
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

// ── Primitives ────────────────────────────────────────────────────────────────

function Spinner() {
  return <LoopIcon fontSize="small" className="animate-spin shrink-0" />;
}

function AlertBanner({ type, message }: { type: 'error' | 'success' | 'info'; message: string }) {
  const colors = {
    error:   { bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.3)',   text: '#ef4444' },
    success: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)', text: '#ffffff' },
    info:    { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)', text: '#e5e7eb' },
  }[type];
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
      <InfoOutlinedIcon sx={{ fontSize: 16 }} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function ModalShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 'max(1.5rem,env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-6 pt-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

function ModalRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="flex justify-between py-3"
      style={!last ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

// ── Network Picker ────────────────────────────────────────────────────────────

function NetworkPicker({ networks, value, onChange }: {
  networks: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all"
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: open ? '1px solid rgba(220,38,38,0.6)' : '1px solid rgba(255,255,255,0.18)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        <div className="flex items-center gap-2.5">
          <PhoneAndroidIcon sx={{ fontSize: 18, color: '#ef4444' }} />
          <span>{value}</span>
        </div>
        <ExpandMoreIcon
          sx={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', transition: 'transform 0.2s' }}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {networks.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => { onChange(n); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-white/10 active:bg-white/5"
              style={{
                color: n === value ? '#ef4444' : '#fff',
                fontWeight: n === value ? 700 : 500,
                fontSize: 15,
                borderBottom: i < networks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                backgroundColor: n === value ? 'rgba(220,38,38,0.1)' : 'transparent',
              }}
            >
              <PhoneAndroidIcon sx={{ fontSize: 17, color: n === value ? '#ef4444' : 'rgba(255,255,255,0.35)' }} />
              {n}
              {n === value && (
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(220,38,38,0.2)', color: '#ef4444' }}>
                  Selected
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activation Fee Modal ──────────────────────────────────────────────────────
// Full payment modal allowing MoMo / Bank / Crypto to pay the one-time
// withdrawal activation fee, styled to mirror DepositPage.

interface ActivationFeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currency: CurrencyInfo;
}

type ActivationStep = 'info' | 'momo' | 'bank' | 'crypto_info' | 'crypto_proof' | 'done';

function ActivationFeeModal({ open, onClose, onSuccess, currency }: ActivationFeeModalProps) {
  const fee = getActivationFee(currency);

  const [step, setStep]                     = useState<ActivationStep>('info');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  // MoMo state
  const momoNetworks = MOMO_NETWORKS[currency.countryCode] ?? MOMO_NETWORKS['GH'];
  const [momoNetwork, setMomoNetwork]       = useState(momoNetworks[0] ?? '');
  const [momoPhone, setMomoPhone]           = useState('');

  // Bank state
  const [bankName, setBankName]             = useState('');
  const [bankAcctNum, setBankAcctNum]       = useState('');
  const [bankAcctName, setBankAcctName]     = useState('');

  // Screenshot for bank proof
  const [bankScreenshot, setBankScreenshot] = useState('');
  const [bankCompressing, setBankCompressing] = useState(false);

  // Crypto / Binance state
  const [txid, setTxid]                     = useState('');
  const [cryptoAmt, setCryptoAmt]           = useState('');
  const [coin, setCoin]                     = useState(BINANCE_COIN);
  const [cryptoNet, setCryptoNet]           = useState(BINANCE_NETWORK);
  const [screenshotUrl, setScreenshotUrl]   = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [screenshotUploading, setScreenshotUploading] = useState(false);

  const [copied, setCopied]                 = useState(false);

  const tok = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

  const reset = () => {
    setStep('info'); setLoading(false); setError('');
    setMomoPhone(''); setBankName(''); setBankAcctNum(''); setBankAcctName('');
    setBankScreenshot(''); setTxid(''); setCryptoAmt(''); setCoin(BINANCE_COIN);
    setCryptoNet(BINANCE_NETWORK); setScreenshotUrl(''); setScreenshotPreview('');
  };

  const handleClose = () => { reset(); onClose(); };

  const post = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error((data?.message as string) || (data?.error as string) || `Server error ${res.status}`);
    return data;
  };

  // Submit MoMo
  const submitMomo = async () => {
    if (!momoPhone) { setError('Enter your mobile money phone number.'); return; }
    setLoading(true); setError('');
    try {
      await post('/api/wallet/activation-fee', {
        method: 'momo', network: momoNetwork, phoneNumber: momoPhone,
        amount: fee.amount, currency: currency.code,
      });
      setStep('done'); onSuccess();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Submission failed. Try again.'); }
    finally { setLoading(false); }
  };

  // Submit Bank
  const handleBankScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankCompressing(true);
    try {
      const dataUrl = await compressImageToBase64(file);
      setBankScreenshot(dataUrl);
    } catch { setError('Could not process image. Try another file.'); }
    finally { setBankCompressing(false); }
  };

  const submitBank = async () => {
    if (!bankName || !bankAcctNum || !bankAcctName) { setError('Fill in all bank details.'); return; }
    if (!bankScreenshot) { setError('Upload a payment screenshot.'); return; }
    setLoading(true); setError('');
    try {
      await post('/api/wallet/activation-fee', {
        method: 'bank', bankName, accountNumber: bankAcctNum, accountName: bankAcctName,
        screenshotUrl: bankScreenshot, amount: fee.amount, currency: currency.code,
      });
      setStep('done'); onSuccess();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Submission failed. Try again.'); }
    finally { setLoading(false); }
  };

  // Crypto screenshot
  const handleCryptoScreenshotFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    const objectUrl = URL.createObjectURL(file);
    setScreenshotPreview(objectUrl);
    setScreenshotUploading(true);
    try {
      const url = await uploadToImgBB(file);
      setScreenshotUrl(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setScreenshotUrl(''); URL.revokeObjectURL(objectUrl); setScreenshotPreview('');
    } finally { setScreenshotUploading(false); }
  };

  const submitCrypto = async () => {
    if (!txid.trim() || txid.trim().length < 10) { setError('Enter a valid TXID (at least 10 characters).'); return; }
    if (!cryptoAmt || isNaN(+cryptoAmt) || +cryptoAmt <= 0) { setError('Enter the amount you sent.'); return; }
    setLoading(true); setError('');
    try {
      await post('/api/wallet/activation-fee', {
        method: 'crypto', txid: txid.trim(), cryptoAmount: parseFloat(cryptoAmt),
        coin, network: cryptoNet, screenshotUrl: screenshotUrl || undefined,
        amount: fee.amount, currency: currency.code,
      });
      setStep('done'); onSuccess();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Submission failed. Try again.'); }
    finally { setLoading(false); }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(BINANCE_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const,
    letterSpacing: '0.8px', marginBottom: 6,
  };

  return (
    <ModalShell open={open} onClose={handleClose}>

      {/* ── DONE ── */}
      {step === 'done' && (
        <div className="text-center py-4 space-y-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <TaskAltIcon style={{ color: '#ffffff', fontSize: 34 }} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1 text-white">Payment Submitted</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Your activation fee is under review. Your withdrawal access will be unlocked within{' '}
              <strong className="text-white">3–5 minutes</strong>.
            </p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ backgroundColor: '#dc2626' }}>
            Done
          </button>
        </div>
      )}

      {/* ── INFO / METHOD SELECTION ── */}
      {step === 'info' && (
        <div className="space-y-5">
          <button onClick={handleClose}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
            <CancelIcon fontSize="small" />
          </button>

          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a0000, #440000)', border: '1px solid rgba(220,38,38,0.4)' }}>
              <FlashOnIcon style={{ color: '#ef4444', fontSize: 30 }} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">Activate Withdrawals</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              A one-time activation fee is required to unlock withdrawals on your account.
            </p>
          </div>

          {/* Fee highlight */}
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))', border: '1px solid rgba(220,38,38,0.3)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">One-Time Fee</p>
            <p className="text-4xl font-black text-white">{fee.display}</p>
            {currency.countryCode !== 'GH' && (
              <p className="text-xs text-white/30 mt-1">≈ GH₵{ACTIVATION_FEE_GHS} · paid once, never again</p>
            )}
          </div>

          {/* What you get */}
          <div className="space-y-2">
            {[
              'Unlimited withdrawals unlocked permanently',
              'Withdraw via Mobile Money or Bank Transfer',
              'Processed within 3 minutes every time',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-white/60">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(220,38,38,0.2)', color: '#ef4444' }}>
                  <span style={{ fontSize: 10, fontWeight: 800 }}>✓</span>
                </div>
                {item}
              </div>
            ))}
          </div>

          <p className="text-xs text-white/30 text-center">Choose how you'd like to pay the activation fee:</p>

          {/* Payment method buttons */}
          <div className="space-y-2">
            {(MOMO_NETWORKS[currency.countryCode] ?? MOMO_NETWORKS['GH']).length > 0 && (
              <button onClick={() => { setError(''); setStep('momo'); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-sm text-white transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <PhoneAndroidIcon sx={{ fontSize: 20, color: '#ef4444' }} />
                <div className="flex-1">
                  <p className="font-bold text-white">Mobile Money</p>
                  <p className="text-xs text-white/40">{(MOMO_NETWORKS[currency.countryCode] ?? MOMO_NETWORKS['GH']).join(' · ')}</p>
                </div>
                <ChevronRightIcon sx={{ fontSize: 18 }} className="text-white/30" />
              </button>
            )}

            <button onClick={() => { setError(''); setStep('bank'); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-sm text-white transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <AccountBalanceIcon sx={{ fontSize: 20, color: '#60a5fa' }} />
              <div className="flex-1">
                <p className="font-bold text-white">Bank Transfer</p>
                <p className="text-xs text-white/40">Any bank · include your username in narration</p>
              </div>
              <ChevronRightIcon sx={{ fontSize: 18 }} className="text-white/30" />
            </button>

            <button onClick={() => { setError(''); setStep('crypto_info'); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-semibold text-sm text-white transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 18, color: '#d4a843', fontWeight: 700 }}>₿</span>
              <div className="flex-1">
                <p className="font-bold text-white">Crypto (USDT / BTC / ETH)</p>
                <p className="text-xs text-white/40">Binance · TRC20 · BEP20 · ERC20</p>
              </div>
              <ChevronRightIcon sx={{ fontSize: 18 }} className="text-white/30" />
            </button>
          </div>
        </div>
      )}

      {/* ── MOMO FORM ── */}
      {step === 'momo' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => { setError(''); setStep('info'); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ←
            </button>
            <h3 className="text-lg font-bold text-white">Pay via Mobile Money</h3>
          </div>

          {/* Fee reminder */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <span className="text-white/50">Activation fee:</span>
            <span className="font-bold text-white text-lg">{fee.display}</span>
          </div>

          <div className="space-y-1">
            <label style={labelStyle}>Network</label>
            <NetworkPicker networks={momoNetworks} value={momoNetwork} onChange={setMomoNetwork} />
          </div>

          <div className="space-y-1">
            <label style={labelStyle}>Your Mobile Money Number</label>
            <input type="tel" value={momoPhone} onChange={e => setMomoPhone(e.target.value)}
              placeholder="0XX XXX XXXX" style={inputStyle} />
          </div>

          <div className="rounded-2xl p-4 text-sm space-y-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white/50 flex gap-2"><span className="text-red-500 font-bold">1.</span> Send {fee.display} to the account provided by support.</p>
            <p className="text-white/50 flex gap-2"><span className="text-red-500 font-bold">2.</span> Enter your MoMo number above and confirm.</p>
            <p className="text-white/50 flex gap-2"><span className="text-red-500 font-bold">3.</span> Admin will verify and unlock your withdrawals.</p>
          </div>

          {error && <AlertBanner type="error" message={error} />}

          <button onClick={submitMomo} disabled={loading || !momoPhone}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#dc2626' }}>
            {loading ? <><Spinner /> Processing…</> : <>Confirm & Submit — {fee.display}</>}
          </button>
        </div>
      )}

      {/* ── BANK FORM ── */}
      {step === 'bank' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => { setError(''); setStep('info'); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ←
            </button>
            <h3 className="text-lg font-bold text-white">Pay via Bank Transfer</h3>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <span className="text-white/50">Activation fee:</span>
            <span className="font-bold text-white text-lg">{fee.display}</span>
          </div>

          {/* Transfer instructions */}
          <div className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Transfer Details</p>
            <p className="text-sm text-white/60">Contact support to get the bank account details. Include your <strong className="text-white">username</strong> in the transfer narration.</p>
            <div className="flex gap-3 pt-2">
              <a href="https://t.me/Championbet_Agent" target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'rgba(42,171,238,0.15)', border: '1px solid rgba(42,171,238,0.3)' }}>
                <TelegramIcon sx={{ fontSize: 16 }} /> Telegram
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>
                <EmailIcon sx={{ fontSize: 16 }} /> Email
              </a>
            </div>
          </div>

          <div className="space-y-1">
            <label style={labelStyle}>Bank Name</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
              placeholder="e.g. GCB Bank" style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label style={labelStyle}>Account Number</label>
            <input type="text" value={bankAcctNum} onChange={e => setBankAcctNum(e.target.value)}
              placeholder="Account number" style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label style={labelStyle}>Account Name</label>
            <input type="text" value={bankAcctName} onChange={e => setBankAcctName(e.target.value)}
              placeholder="Full name on account" style={inputStyle} />
          </div>

          {/* Screenshot upload */}
          <div className="space-y-1">
            <label style={labelStyle}>Payment Screenshot <span style={{ color: '#ef4444' }}>*</span></label>
            {bankScreenshot ? (
              <div className="relative rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(34,197,94,0.3)', backgroundColor: '#0a0f0b' }}>
                <img src={bankScreenshot} alt="Payment proof" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }} />
                {!bankCompressing && (
                  <button onClick={() => setBankScreenshot('')}
                    className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(220,38,38,0.8)', color: '#fff' }}>
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer"
                style={{ height: 80, border: '2px dashed rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                {bankCompressing
                  ? <Spinner />
                  : <><span className="text-2xl">📷</span><span className="text-xs text-white/40 font-semibold">Tap to upload screenshot</span></>
                }
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBankScreenshot} />
              </label>
            )}
          </div>

          {error && <AlertBanner type="error" message={error} />}

          <button onClick={submitBank} disabled={loading || bankCompressing}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#dc2626' }}>
            {loading ? <><Spinner /> Submitting…</> : <>Submit Bank Proof — {fee.display}</>}
          </button>
        </div>
      )}

      {/* ── CRYPTO INFO ── */}
      {step === 'crypto_info' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => { setError(''); setStep('info'); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ←
            </button>
            <h3 className="text-lg font-bold text-white">Pay via Crypto</h3>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)' }}>
            <span className="text-white/50">Activation fee:</span>
            <span className="font-bold text-white text-lg">{fee.display}</span>
          </div>

          {/* Wallet address */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30">Send USDT to this address</p>
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/30 mb-2">Wallet Address (TRC20)</p>
              <p className="text-xs text-white font-mono leading-relaxed break-all">{BINANCE_ADDRESS}</p>
            </div>
            <button onClick={copyAddress}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(212,168,67,0.15)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(212,168,67,0.3)'}`,
                color: copied ? '#22c55e' : '#d4a843',
              }}>
              {copied ? '✓ Copied!' : '📋 Copy Address'}
            </button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#ef4444' }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} className="shrink-0 mt-0.5" />
            Only send <strong>USDT via TRC20</strong>. Wrong network = permanent loss of funds.
          </div>

          <button onClick={() => { setError(''); setStep('crypto_proof'); }}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: '#dc2626' }}>
            I've Sent — Submit Proof →
          </button>
        </div>
      )}

      {/* ── CRYPTO PROOF ── */}
      {step === 'crypto_proof' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setError(''); setStep('crypto_info'); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ←
            </button>
            <h3 className="text-lg font-bold text-white">Submit Crypto Proof</h3>
          </div>

          <div className="space-y-1">
            <label style={labelStyle}>Transaction Hash (TXID) *</label>
            <input type="text" value={txid} onChange={e => setTxid(e.target.value)}
              placeholder="Paste blockchain TXID" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label style={labelStyle}>Coin *</label>
              <select value={coin} onChange={e => setCoin(e.target.value)} style={selectStyle}>
                {CRYPTO_COINS.map(c => <option key={c} style={{ background: '#141414' }}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label style={labelStyle}>Network *</label>
              <select value={cryptoNet} onChange={e => setCryptoNet(e.target.value)} style={selectStyle}>
                {CRYPTO_NETWORKS.map(n => <option key={n} style={{ background: '#141414' }}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label style={labelStyle}>Amount Sent ({coin}) *</label>
            <input type="number" value={cryptoAmt} onChange={e => setCryptoAmt(e.target.value)}
              placeholder="0.00" min="0" step="any" style={inputStyle} />
          </div>

          {/* Screenshot uploader */}
          <div className="space-y-1">
            <label style={labelStyle}>Screenshot <span className="normal-case text-white/20 font-normal">(recommended)</span></label>
            {screenshotPreview ? (
              <div className="relative rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(212,168,67,0.3)', backgroundColor: '#0a0a0a' }}>
                <img src={screenshotPreview} alt="proof" style={{ width: '100%', maxHeight: 140, objectFit: 'contain', display: 'block', opacity: screenshotUploading ? 0.5 : 1 }} />
                {screenshotUploading && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <Spinner /><span className="text-xs text-white">Uploading…</span>
                  </div>
                )}
                {!screenshotUploading && (
                  <button onClick={() => { setScreenshotUrl(''); setScreenshotPreview(''); }}
                    className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(220,38,38,0.8)', color: '#fff' }}>
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer"
                style={{ height: 80, border: '2px dashed rgba(212,168,67,0.25)', backgroundColor: 'rgba(212,168,67,0.04)' }}>
                <span className="text-2xl">📷</span>
                <span className="text-xs font-semibold" style={{ color: 'rgba(212,168,67,0.7)' }}>Tap to upload screenshot</span>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCryptoScreenshotFile(f); }} />
              </label>
            )}
          </div>

          {error && <AlertBanner type="error" message={error} />}

          <button onClick={submitCrypto} disabled={loading || screenshotUploading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#dc2626' }}>
            {loading ? <><Spinner /> Submitting…</> : screenshotUploading ? <><Spinner /> Uploading…</> : <>Submit Proof</>}
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ── Deposit Gate Modal ────────────────────────────────────────────────────────

function DepositGateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="py-4 space-y-5">
        <button onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
          <CancelIcon fontSize="small" />
        </button>

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a0000, #440000)', border: '1px solid rgba(220,38,38,0.4)' }}>
            <LockIcon style={{ color: '#ef4444', fontSize: 28 }} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">Withdrawal Unavailable</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Your account is not yet eligible for withdrawals. Please make additional deposits to continue.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose}
            className="py-3 rounded-2xl text-sm font-semibold text-white/60"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Close
          </button>
          <Link to="/deposit" onClick={onClose}
            className="py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
            style={{ backgroundColor: '#dc2626' }}>
            <AddCardIcon fontSize="small" /> Deposit Now
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Insufficient Balance Modal ────────────────────────────────────────────────

interface InsufficientBalanceModalProps {
  open: boolean;
  onClose: () => void;
  balanceGhs: number;
  currency: CurrencyInfo;
}

function InsufficientBalanceModal({ open, onClose, balanceGhs, currency }: InsufficientBalanceModalProps) {
  const amountNeededGhs = MIN_WITHDRAWAL_AMOUNT - balanceGhs;
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="text-center py-4 space-y-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl"
          style={{ backgroundColor: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)' }}>
          💸
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2 text-white">Insufficient Balance</h3>
          <p className="text-sm text-white/50 mb-1">
            Your balance is <strong className="text-white">{formatCurrency(balanceGhs, currency)}</strong>.
          </p>
          <p className="text-sm text-white/50">
            Minimum withdrawal is <strong className="text-white">{formatCurrency(MIN_WITHDRAWAL_AMOUNT, currency)}</strong>.
            {' '}You need <strong className="text-red-400">{formatCurrency(amountNeededGhs, currency)}</strong> more.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-3 rounded-2xl text-sm font-semibold text-white/70"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Close
          </button>
          <Link to="/deposit" onClick={onClose}
            className="py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: '#dc2626' }}>
            <AddCardIcon fontSize="small" /> Deposit Now
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Withdraw Modal ────────────────────────────────────────────────────────────

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  balanceGhs: number;
  currency: CurrencyInfo;
}

function WithdrawModal({ open, onClose, onSuccess, balanceGhs, currency }: WithdrawModalProps) {
  const [step, setStep]                   = useState<'form' | 'confirm' | 'done'>('form');
  const [amount, setAmount]               = useState('');
  const [method, setMethod]               = useState<'momo' | 'bank'>('momo');
  const [network, setNetwork]             = useState('');
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [bankName, setBankName]           = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const momoNetworks = MOMO_NETWORKS[currency.countryCode] ?? MOMO_NETWORKS['GH'];

  useEffect(() => { setNetwork(momoNetworks[0] ?? ''); }, [currency.countryCode]);

  const amountLocal  = parseFloat(amount) || 0;
  const amountGhs    = amountLocal;
  const balanceLocal = balanceGhs;
  const minLocal     = MIN_WITHDRAWAL_AMOUNT;
  const amountValid  = amountLocal >= minLocal && amountLocal <= balanceLocal && !isNaN(amountLocal);

  const reset = () => {
    setStep('form'); setAmount(''); setMethod('momo');
    setNetwork(momoNetworks[0] ?? ''); setPhoneNumber('');
    setBankName(''); setAccountNumber(''); setAccountName(''); setError('');
  };
  const handleClose = () => { reset(); onClose(); };

  const canProceed = amountValid &&
    (method === 'momo' ? !!phoneNumber && !!network : !!bankName && !!accountNumber && !!accountName);

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await withdrawals.submit({
        amount: amountGhs,
        method,
        accountNumber: method === 'momo' ? phoneNumber : accountNumber,
        accountName:   method === 'momo' ? phoneNumber : accountName,
        network:       method === 'momo' ? network : bankName,
      });
      setStep('done');
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed. Please try again.');
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 15, outline: 'none',
  };

  return (
    <ModalShell open={open} onClose={handleClose}>
      {step === 'done' && (
        <div className="text-center py-4 space-y-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <TaskAltIcon style={{ color: '#ffffff', fontSize: 34 }} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1 text-white">Withdrawal Requested</h3>
            <p className="text-sm text-white/50">Your request is under review. Funds will be sent within 3 minutes.</p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ backgroundColor: '#dc2626' }}>
            Done
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-white">Confirm Withdrawal</h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <ModalRow label={`Amount (${currency.code})`} value={formatCurrency(amountGhs, currency)} />
            <ModalRow label="Method" value={method === 'momo' ? 'Mobile Money' : 'Bank Transfer'} />
            {method === 'momo' ? (
              <><ModalRow label="Network" value={network} /><ModalRow label="Phone Number" value={phoneNumber} last /></>
            ) : (
              <><ModalRow label="Bank" value={bankName} /><ModalRow label="Account" value={accountNumber} /><ModalRow label="Name" value={accountName} last /></>
            )}
          </div>
          {error && <AlertBanner type="error" message={error} />}
          <div className="flex gap-3">
            <button onClick={() => setStep('form')} disabled={loading}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white/70"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Back
            </button>
            <button onClick={submit} disabled={loading}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: '#dc2626' }}>
              {loading ? <><Spinner /> Processing…</> : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Withdraw Funds</h3>
            <button onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
              <CancelIcon fontSize="small" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-white/40">Available:</span>
            <span className="font-bold text-white">{formatCurrency(balanceGhs, currency)}</span>
            <span className="ml-auto text-xs text-yellow-400/80">
              Min: {formatCurrency(MIN_WITHDRAWAL_AMOUNT, currency)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { v: 'momo', label: 'Mobile Money', icon: <PhoneAndroidIcon fontSize="small" /> },
              { v: 'bank', label: 'Bank Transfer', icon: <AccountBalanceIcon fontSize="small" /> },
            ].map(opt => (
              <button key={opt.v} onClick={() => setMethod(opt.v as 'momo' | 'bank')}
                className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  backgroundColor: method === opt.v ? '#dc2626' : 'transparent',
                  color: method === opt.v ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Amount ({currency.code})</label>
            <div className="relative">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min={minLocal} step="0.01" max={balanceLocal}
                style={inputStyle} className="pr-24" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">
                Max: {formatCurrency(balanceGhs, currency)}
              </span>
            </div>
            {amountLocal > 0 && amountLocal < minLocal && (
              <p className="text-xs text-red-400 mt-1">Minimum withdrawal is {formatCurrency(MIN_WITHDRAWAL_AMOUNT, currency)}</p>
            )}
            {amountLocal > balanceLocal && (
              <p className="text-xs text-red-400 mt-1">Amount exceeds your balance</p>
            )}
            <div className="flex gap-2 mt-1">
              {[25, 50, 100].map(pct => {
                const val = ((balanceLocal * pct) / 100).toFixed(2);
                return (
                  <button key={pct} onClick={() => setAmount(val)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'momo' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Network</label>
                <NetworkPicker networks={momoNetworks} value={network} onChange={setNetwork} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Phone Number</label>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="0XX XXX XXXX" style={inputStyle} />
              </div>
            </div>
          )}

          {method === 'bank' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Bank Name</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. GCB Bank" style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Account Number</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Account number" style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Account Name</label>
                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                  placeholder="Full name on account" style={inputStyle} />
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-2 text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL_AMOUNT, currency)}`,
              'Maximum withdrawal per request is GH₵ 1,000,000',
              'Withdrawals are processed automatically within 3 minutes.',
              'Funds are sent to your selected Mobile Money or bank account.',
            ].map((rule, i) => (
              <p key={i} className="flex gap-2 text-white/50">
                <span className="text-red-500 font-bold shrink-0">{i + 1}.</span> {rule}
              </p>
            ))}
          </div>

          {error && <AlertBanner type="error" message={error} />}

          <button disabled={!canProceed} onClick={() => canProceed && setStep('confirm')}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#dc2626' }}>
            Continue
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ── Affiliate Withdraw Modal ──────────────────────────────────────────────────

function AffiliateWithdrawModal({ open, onClose, onSuccess, availableBalanceGhs, currency }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  availableBalanceGhs: number; currency: CurrencyInfo;
}) {
  const [step, setStep]                   = useState<'form' | 'done'>('form');
  const [amount, setAmount]               = useState('');
  const [bankName, setBankName]           = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]     = useState('');
  const [momoNumber, setMomoNumber]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const amountLocal    = parseFloat(amount) || 0;
  const amountGhs      = amountLocal;
  const availableLocal = availableBalanceGhs;
  const minLocal       = MIN_WITHDRAWAL_AMOUNT;

  const reset = () => {
    setStep('form'); setAmount(''); setBankName('');
    setAccountNumber(''); setAccountName(''); setMomoNumber(''); setError('');
  };
  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await affiliate.requestWithdrawal({
        amount: amountGhs,
        accountDetails: { bankName, accountNumber, accountName, mobileMoneyNumber: momoNumber || undefined },
      });
      setStep('done'); onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed. Please try again.');
    } finally { setLoading(false); }
  };

  const canSubmit = amountLocal >= minLocal && amountLocal <= availableLocal &&
    !!bankName && !!accountNumber && !!accountName;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 15, outline: 'none',
  };

  return (
    <ModalShell open={open} onClose={handleClose}>
      {step === 'done' && (
        <div className="text-center py-4 space-y-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <TaskAltIcon style={{ color: '#ffffff', fontSize: 34 }} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1 text-white">Request Submitted</h3>
            <p className="text-sm text-white/50">Your affiliate earnings withdrawal is being processed.</p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ backgroundColor: '#dc2626' }}>
            Done
          </button>
        </div>
      )}
      {step === 'form' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Withdraw Referral Earnings</h3>
            <button onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
              <CancelIcon fontSize="small" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-white/50">Available:</span>
            <span className="font-bold text-white">{formatCurrency(availableBalanceGhs, currency)}</span>
            <span className="ml-auto text-xs text-yellow-400/80">Min: {formatCurrency(MIN_WITHDRAWAL_AMOUNT, currency)}</span>
          </div>

          {[
            { label: `Amount (${currency.code})`, val: amount, set: setAmount, type: 'number', placeholder: '0.00' },
            { label: 'Bank Name', val: bankName, set: setBankName, type: 'text', placeholder: 'e.g. GCB Bank' },
            { label: 'Account Number', val: accountNumber, set: setAccountNumber, type: 'text', placeholder: 'Account number' },
            { label: 'Account Name', val: accountName, set: setAccountName, type: 'text', placeholder: 'Full name on account' },
            { label: 'Mobile Money Number (optional)', val: momoNumber, set: setMomoNumber, type: 'tel', placeholder: '0XX XXX XXXX' },
          ].map(f => (
            <div key={f.label} className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40">{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}

          {error && <AlertBanner type="error" message={error} />}
          <button onClick={submit} disabled={!canSubmit || loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#dc2626' }}>
            {loading ? <><Spinner /> Submitting…</> : 'Submit Request'}
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ── Unlock Banner ─────────────────────────────────────────────────────────────

function UnlockBanner({ gateStatus, onActivate }: { gateStatus: GateStatus; onActivate: () => void }) {
  if (gateStatus === 'open') return null;

  if (gateStatus === 'activation_required') {
    return (
      <button onClick={onActivate} className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all active:scale-[0.99]"
        style={{ backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(220,38,38,0.2)' }}>
          <FlashOnIcon sx={{ fontSize: 16, color: '#ef4444' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Activate Withdrawals</p>
          <p className="text-xs text-white/40 mt-0.5">Pay the one-time fee to unlock — tap to get started</p>
        </div>
        <ChevronRightIcon sx={{ fontSize: 18 }} className="text-white/30 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl px-4 py-3.5 flex items-center gap-2.5"
      style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
      <LockIcon sx={{ fontSize: 16, color: '#ef4444', flexShrink: 0 }} />
      <p className="text-xs font-bold text-white/70">Withdrawals are currently unavailable on your account.</p>
    </div>
  );
}

// ── Main WalletPage ───────────────────────────────────────────────────────────

export default function WalletPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  const [walletData,      setWalletData]      = useState<WalletData | null>(null);
  const [transactions,    setTransactions]    = useState<Transaction[]>([]);
  const [affiliateStats,  setAffiliateStats]  = useState<AffiliateStatsDTO | null>(null);
  const [txPage,          setTxPage]          = useState(0);
  const [txTotalPages,    setTxTotalPages]    = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [txLoading,       setTxLoading]       = useState(false);
  const [fetchError,      setFetchError]      = useState('');
  const [showBalance,     setShowBalance]     = useState(true);
  const [showAffBalance,  setShowAffBalance]  = useState(true);
  const [currency,        setCurrency]        = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);

  // Modal states
  const [showWithdraw,           setShowWithdraw]           = useState(false);
  const [showAffWithdraw,        setShowAffWithdraw]        = useState(false);
  const [showDepositGate,        setShowDepositGate]        = useState(false);
  const [showAffDepositGate,     setShowAffDepositGate]     = useState(false);
  const [showInsufficientBal,    setShowInsufficientBal]    = useState(false);
  const [showAffInsufficientBal, setShowAffInsufficientBal] = useState(false);
  const [showActivationFee,      setShowActivationFee]      = useState(false);
  const [showAffActivationFee,   setShowAffActivationFee]   = useState(false);

  // Auth guard
  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/wallet' } });
  }, [currentUser, navigate]);

  // Currency detection
  useEffect(() => {
    setCurrencyLoading(true);
    detectCurrencyInfo().then(setCurrency).finally(() => setCurrencyLoading(false));
  }, []);

  // Data loaders
  const fetchWallet = useCallback(async () => {
    const res = await walletApi.getWallet();
    setWalletData(res.data as WalletData);
  }, []);

  const fetchTransactions = useCallback(async (page = 0) => {
    setTxLoading(true);
    try {
      const res = await walletApi.getTransactions(page, 20);
      setTransactions(prev => page === 0 ? res.data.content : [...prev, ...res.data.content]);
      setTxTotalPages(res.data.totalPages);
      setTxPage(page);
    } finally { setTxLoading(false); }
  }, []);

  const fetchAffiliateStats = useCallback(async () => {
    try {
      const res = await affiliate.getStats();
      setAffiliateStats(res.data);
    } catch { /* non-affiliate users */ }
  }, []);

  const initLoad = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      await Promise.all([fetchWallet(), fetchTransactions(0), fetchAffiliateStats()]);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally { setLoading(false); }
  }, [fetchWallet, fetchTransactions, fetchAffiliateStats]);

  useEffect(() => { if (currentUser) initLoad(); }, [currentUser, initLoad]);

  // ── Derived values ────────────────────────────────────────────────────────
  const ghsBalance         = walletData?.balance ?? 0;
  const affBalanceGhs      = affiliateStats?.availableBalance ?? 0;
  const affLifetimeGhs     = affiliateStats?.lifetimeCommission ?? 0;
  const loyaltyTier        = (currentUser as unknown as Record<string, unknown>)?.loyaltyTier as string | undefined;

  const isAdmin            = isAdminUser(currentUser as Parameters<typeof isAdminUser>[0]);
  const totalDepositedGhs  = sumLifetimeDepositsGhs(transactions);
  const userHasDeposited   = hasAnyDeposit(transactions);
  const activationPaid     = hasActivationFeePaid(walletData, transactions, isAdmin);

  // ── Gate logic ────────────────────────────────────────────────────────────
  const gateStatus            = getWithdrawalGateStatus(totalDepositedGhs, userHasDeposited, isAdmin, activationPaid);
  const isLocked              = gateStatus !== 'open';
  const mainBalanceSufficient = isAdmin || ghsBalance >= MIN_WITHDRAWAL_AMOUNT;
  const affBalanceSufficient  = isAdmin || affBalanceGhs >= MIN_WITHDRAWAL_AMOUNT;

  // ── Withdraw button handlers ──────────────────────────────────────────────
  const handleWithdrawClick = () => {
    if (gateStatus === 'activation_required') { setShowActivationFee(true);    return; }
    if (gateStatus === 'deposit_gate')        { setShowDepositGate(true);       return; }
    if (!mainBalanceSufficient)               { setShowInsufficientBal(true);   return; }
    setShowWithdraw(true);
  };

  const handleAffWithdrawClick = () => {
    if (gateStatus === 'activation_required') { setShowAffActivationFee(true);    return; }
    if (gateStatus === 'deposit_gate')        { setShowAffDepositGate(true);       return; }
    if (!affBalanceSufficient)               { setShowAffInsufficientBal(true);   return; }
    setShowAffWithdraw(true);
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading || currencyLoading) {
    return (
      <div className="min-h-screen pb-10" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-lg mx-auto p-4 space-y-4 pt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-5 animate-pulse"
              style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-4 w-1/3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <div className="h-8 w-1/2 rounded-lg mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <div className="h-10 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000000' }}>
        <div className="space-y-4 w-full max-w-sm text-center">
          <AlertBanner type="error" message={fetchError} />
          <button onClick={initLoad} className="px-6 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ backgroundColor: '#dc2626' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-10" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-lg mx-auto p-4 space-y-4 pt-4">

          {/* ── Header ── */}
          <div className="flex items-center justify-between pt-2 pb-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)' }}>
                {currentUser?.fullName?.[0]?.toUpperCase() ?? 'U'}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black"
                  style={{ backgroundColor: '#dc2626' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-white">{currentUser?.fullName ?? 'User'}</p>
                  <ChevronRightIcon sx={{ fontSize: 16 }} className="text-white/30" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.3)' }}>
                    {loyaltyTier ?? 'Premium account'}
                  </span>
                  {isAdmin && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                      Admin
                    </span>
                  )}
                  {activationPaid && !isAdmin && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                      style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <FlashOnIcon sx={{ fontSize: 11 }} /> Activated
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={initLoad}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SyncIcon fontSize="small" />
            </button>
          </div>

          {/* ── Unlock / Activation Banner ── */}
          <UnlockBanner gateStatus={gateStatus} onActivate={() => setShowActivationFee(true)} />

          {/* ── Balance Card ── */}
          <div className="rounded-3xl p-5 overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #1a0000 0%, #2d0000 50%, #440000 100%)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#dc2626' }} />
            <div className="absolute -bottom-12 -left-4 w-32 h-32 rounded-full opacity-5" style={{ backgroundColor: '#dc2626' }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <WalletIcon sx={{ fontSize: 16 }} style={{ color: 'rgba(220,38,38,0.8)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Total Balance · {currency.code}
                  </span>
                </div>
                <button onClick={() => setShowBalance(v => !v)} className="text-white/30 hover:text-white transition-colors">
                  {showBalance ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </button>
              </div>
              <p className="text-4xl font-black tracking-tight text-white mt-2 mb-6">
                {showBalance ? formatCurrency(ghsBalance, currency) : `${currency.code} ••••`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/deposit"
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                  style={{ backgroundColor: '#dc2626' }}>
                  <AddCardIcon fontSize="small" /> Deposit
                </Link>
                <button type="button" onClick={handleWithdrawClick}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: isLocked ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)',
                  }}>
                  {isLocked
                    ? (gateStatus === 'activation_required'
                        ? <><FlashOnIcon fontSize="small" /> Activate</>
                        : <><LockIcon fontSize="small" /> Withdraw</>)
                    : <><PaymentsIcon fontSize="small" /> Withdraw</>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Activation Fee Info Card (shown only when not yet paid) ── */}
          {!activationPaid && !isAdmin && (
            <button onClick={() => setShowActivationFee(true)}
              className="w-full rounded-3xl p-4 text-left transition-all active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(220,38,38,0.04))', border: '1px solid rgba(220,38,38,0.25)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(220,38,38,0.2)' }}>
                  <FlashOnIcon sx={{ fontSize: 20, color: '#ef4444' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Activate Your Withdrawals</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    One-time fee · {getActivationFee(currency).display} · Unlocks all withdrawals permanently
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                  Pay Now
                </div>
              </div>
            </button>
          )}

          {/* ── Referral Earnings Card ── */}
          <div className="rounded-3xl p-5" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Referral Earnings</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAffBalance(v => !v)} className="text-white/30 hover:text-white transition-colors">
                  {showAffBalance ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </button>
                <span className="text-white/30"><ChevronRightIcon fontSize="small" /></span>
              </div>
            </div>
            <p className="text-3xl font-black text-white mb-4">
              {showAffBalance ? formatCurrency(affBalanceGhs, currency) : `${currency.code} ••••`}
            </p>
            {affiliateStats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: <PaidIcon sx={{ fontSize: 18 }} style={{ color: '#ffffff' }} />,      label: 'Total Earned', val: formatCurrency(affLifetimeGhs, currency), color: '#ffffff' },
                  { icon: <PeopleAltIcon sx={{ fontSize: 18 }} style={{ color: '#ef4444' }} />, label: 'Referrals',    val: String(affiliateStats.totalReferrals),     color: '#ef4444' },
                  { icon: <WalletIcon sx={{ fontSize: 18 }} style={{ color: '#ffffff' }} />,    label: 'Available',    val: formatCurrency(affBalanceGhs, currency),   color: '#ffffff' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl p-3 text-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <p className="text-[9px] text-white/30 mb-0.5">{stat.label}</p>
                    <p className="text-[11px] font-bold" style={{ color: stat.color }}>{stat.val}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleAffWithdrawClick}
              className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: isLocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
              }}>
              {isLocked
                ? (gateStatus === 'activation_required'
                    ? <><FlashOnIcon fontSize="small" /> Activate to Withdraw</>
                    : <><LockIcon fontSize="small" /> Withdraw Referral Earnings</>)
                : <><PaymentsIcon fontSize="small" /> Withdraw Referral Earnings</>}
            </button>
          </div>

          {/* ── Recent Transactions ── */}
          <div className="rounded-3xl p-5" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Recent Transactions</h2>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <MoneyOffIcon sx={{ fontSize: 40 }} className="text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">No transactions yet</p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, idx) => {
                  const incoming = isIncoming(tx.kind);
                  const isLast   = idx === transactions.length - 1;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3.5"
                      style={!isLast ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: incoming ? 'rgba(255,255,255,0.08)' : 'rgba(220,38,38,0.15)' }}>
                        {tx.kind === 'ACTIVATION_FEE'
                          ? <FlashOnIcon sx={{ fontSize: 16 }} style={{ color: '#ef4444' }} />
                          : incoming
                            ? <SouthWestIcon sx={{ fontSize: 16 }} style={{ color: '#ffffff' }} />
                            : <NorthEastIcon sx={{ fontSize: 16 }} style={{ color: '#ef4444' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{txLabel(tx.kind)}</p>
                        <p className="text-xs text-white/30 mt-0.5">{formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold tabular-nums" style={{ color: incoming ? '#ffffff' : '#ef4444' }}>
                          {incoming ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                        {tx.balanceAfter !== undefined && (
                          <p className="text-xs text-white/25 mt-0.5">Bal: {formatCurrency(tx.balanceAfter, currency)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {txPage + 1 < txTotalPages && (
              <div className="mt-4">
                <button onClick={() => fetchTransactions(txPage + 1)} disabled={txLoading}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {txLoading ? <><Spinner /> Loading…</> : <><CurrencyExchangeIcon fontSize="small" /> Load More</>}
                </button>
              </div>
            )}
          </div>

          {/* ── Support ── */}
          <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <HeadsetMicIcon sx={{ fontSize: 18 }} style={{ color: '#ef4444' }} />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30">Customer Service</h2>
              </div>
              <p className="text-xs text-white/20 mb-4">Online 24/7 — We're always here to help</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { icon: <TelegramIcon sx={{ fontSize: 20 }} />, label: 'Telegram Support', sub: '@Championbet_Agent',            color: '#2AABEE', bg: 'rgba(42,171,238,0.07)',  border: 'rgba(42,171,238,0.18)',  href: 'https://t.me/Championbet_Agent' },
                  { icon: <EmailIcon    sx={{ fontSize: 20 }} />, label: 'Email Support',    sub: 'championbetofficial@gmail.com', color: '#ef4444', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)',   href: 'mailto:championbetofficial@gmail.com' },
                  { icon: <EmailIcon    sx={{ fontSize: 20 }} />, label: 'Paystack Support', sub: 'paystacksupportteam@gmail.com', color: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.18)', href: 'mailto:paystacksupportteam@gmail.com' },
                ].map(channel => (
                  <a key={channel.label} href={channel.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98]"
                    style={{ backgroundColor: channel.bg, border: `1px solid ${channel.border}` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: channel.bg, color: channel.color }}>
                      {channel.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{channel.label}</p>
                      <p className="text-xs text-white/40">{channel.sub}</p>
                    </div>
                    <ChevronRightIcon sx={{ fontSize: 16 }} className="text-white/20" />
                  </a>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-center text-[10px] text-white/20 font-medium">CHAMPIONBET · Bet Responsibly · 18+</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}

      {/* Activation fee modals (main wallet + affiliate) */}
      <ActivationFeeModal
        open={showActivationFee}
        onClose={() => setShowActivationFee(false)}
        onSuccess={() => { setShowActivationFee(false); initLoad(); }}
        currency={currency}
      />
      <ActivationFeeModal
        open={showAffActivationFee}
        onClose={() => setShowAffActivationFee(false)}
        onSuccess={() => { setShowAffActivationFee(false); initLoad(); }}
        currency={currency}
      />

      <DepositGateModal open={showDepositGate}    onClose={() => setShowDepositGate(false)} />
      <DepositGateModal open={showAffDepositGate} onClose={() => setShowAffDepositGate(false)} />

      <InsufficientBalanceModal
        open={showInsufficientBal}
        onClose={() => setShowInsufficientBal(false)}
        balanceGhs={ghsBalance}
        currency={currency}
      />
      <InsufficientBalanceModal
        open={showAffInsufficientBal}
        onClose={() => setShowAffInsufficientBal(false)}
        balanceGhs={affBalanceGhs}
        currency={currency}
      />

      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={() => { setShowWithdraw(false); fetchWallet(); fetchTransactions(0); }}
        balanceGhs={ghsBalance}
        currency={currency}
      />
      <AffiliateWithdrawModal
        open={showAffWithdraw}
        onClose={() => setShowAffWithdraw(false)}
        onSuccess={() => { setShowAffWithdraw(false); fetchAffiliateStats(); }}
        availableBalanceGhs={affBalanceGhs}
        currency={currency}
      />
    </>
  );
}
