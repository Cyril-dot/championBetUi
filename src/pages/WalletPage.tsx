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
import WhatsAppIcon          from '@mui/icons-material/WhatsApp';
import EmailIcon             from '@mui/icons-material/Email';
import TelegramIcon          from '@mui/icons-material/Telegram';
import InfoOutlinedIcon      from '@mui/icons-material/InfoOutlined';
import PhoneAndroidIcon      from '@mui/icons-material/PhoneAndroid';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import AddCardIcon           from '@mui/icons-material/AddCard';
import PaymentsIcon          from '@mui/icons-material/Payments';
import ExpandMoreIcon        from '@mui/icons-material/ExpandMore';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPOSITS_REQUIRED_TO_ACTIVATE = 3;
const MIN_WITHDRAWAL_AMOUNT         = 2000; // in GHS

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletData {
  balance: number;
  currency?: string;
  [key: string]: unknown;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  countryCode: string;
  name: string;
  rateFromGhs: number;
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
  code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi',
  countryCode: 'GH', rateFromGhs: 1,
};

async function detectCurrencyInfo(): Promise<CurrencyInfo> {
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
  if (!localCurrency) return DEFAULT_CURRENCY;
  let rateFromGhs = 1;
  if (localCurrency.code !== 'GHS') {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(5000) });
      if (res.ok) { const d = await res.json(); rateFromGhs = d.rates?.[localCurrency.code] ?? 1; }
    } catch { /* fall through */ }
  }
  return { code: localCurrency.code, symbol: localCurrency.symbol, name: localCurrency.name, countryCode, rateFromGhs };
}

function formatCurrency(amountInGhs: number, currency: CurrencyInfo): string {
  const converted = amountInGhs * currency.rateFromGhs;
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency', currency: currency.code,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(converted);
  } catch {
    return `${currency.symbol} ${converted.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function localToGhs(localAmount: number, currency: CurrencyInfo): number {
  if (currency.rateFromGhs === 0) return localAmount;
  return localAmount / currency.rateFromGhs;
}

// ── Transaction Helpers ───────────────────────────────────────────────────────

const INCOMING_KINDS = [
  'DEPOSIT', 'BET_WIN', 'REFERRAL_COMMISSION', 'PAYOUT',
  'VIP_CASHBACK', 'WELCOME_BONUS', 'WITHDRAWAL_REFUND', 'ADJUSTMENT',
];

function isIncoming(kind: string) { return INCOMING_KINDS.includes(kind); }

function countLifetimeDeposits(transactions: Transaction[]): number {
  return transactions.filter(tx => tx.kind === 'DEPOSIT').length;
}

function isAdminUser(user: { role?: string; isAdmin?: boolean; [key: string]: unknown } | null): boolean {
  if (!user) return false;
  const role = (user.role as string | undefined)?.toUpperCase() ?? '';
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || user.isAdmin === true;
}

function txLabel(kind: string): string {
  const map: Record<string, string> = {
    DEPOSIT: 'Deposit', WITHDRAW: 'Withdrawal', WITHDRAW_HOLD: 'Withdrawal Hold',
    WITHDRAW_RELEASE: 'Withdrawal Released', BET_STAKE: 'Bet Placed', BET_WIN: 'Bet Won',
    REFERRAL_COMMISSION: 'Affiliate Commission', PAYOUT: 'Payout', ADJUSTMENT: 'Adjustment',
    VIP_CASHBACK: 'VIP Cashback', VIP_MEMBERSHIP: 'VIP Membership',
    WELCOME_BONUS: 'Welcome Bonus', WITHDRAWAL_REFUND: 'Withdrawal Refund',
    ADMIN_UPGRADE_FEE: 'Admin Upgrade Fee',
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

// ── No Deposit Modal ──────────────────────────────────────────────────────────
// Shown when the user has never deposited at all (lifetimeDeposits === 0).
// Simple message: make your first deposit before you can withdraw.

interface NoDepositModalProps {
  open: boolean;
  onClose: () => void;
}

function NoDepositModal({ open, onClose }: NoDepositModalProps) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="text-center py-4 space-y-5">
        <div className="flex items-center justify-between absolute top-6 right-6">
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
            <CancelIcon fontSize="small" />
          </button>
        </div>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a0000, #440000)', border: '1px solid rgba(220,38,38,0.4)' }}>
            <AddCardIcon style={{ color: '#ef4444', fontSize: 28 }} />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Deposit First</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            You need to make a deposit before you can withdraw. Fund your account to get started.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose}
            className="py-3 rounded-2xl text-sm font-semibold text-white/60"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Maybe Later
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

// ── Account Activation Prompt Modal ──────────────────────────────────────────
// Shown only when lifetimeDeposits >= 1 but < 3.

interface ActivationPromptModalProps {
  open: boolean;
  onClose: () => void;
  lifetimeDeposits: number;
}

function ActivationPromptModal({ open, onClose, lifetimeDeposits }: ActivationPromptModalProps) {
  const remaining = Math.max(0, DEPOSITS_REQUIRED_TO_ACTIVATE - lifetimeDeposits);
  const dots = Array.from({ length: DEPOSITS_REQUIRED_TO_ACTIVATE });

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div />
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
            <CancelIcon fontSize="small" />
          </button>
        </div>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a0000, #440000)', border: '1px solid rgba(220,38,38,0.4)' }}>
            <AddCardIcon style={{ color: '#ef4444', fontSize: 28 }} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">Complete 3 Deposits</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Make {DEPOSITS_REQUIRED_TO_ACTIVATE} deposits to activate withdrawals.
            {remaining > 0 && <> You're {remaining} deposit{remaining > 1 ? 's' : ''} away.</>}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 py-1">
          {dots.map((_, i) => (
            <div key={i}
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all"
              style={
                i < lifetimeDeposits
                  ? { backgroundColor: '#dc2626', color: '#fff', boxShadow: '0 0 16px rgba(220,38,38,0.5)' }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)' }
              }>
              {i < lifetimeDeposits ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(lifetimeDeposits / DEPOSITS_REQUIRED_TO_ACTIVATE) * 100}%`, backgroundColor: '#dc2626' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose}
            className="py-3 rounded-2xl text-sm font-semibold text-white/60"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Maybe Later
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
  const amountGhs    = localToGhs(amountLocal, currency);
  const balanceLocal = balanceGhs * currency.rateFromGhs;
  const minLocal     = MIN_WITHDRAWAL_AMOUNT * currency.rateFromGhs;
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
            {currency.code !== 'GHS' && <ModalRow label="Amount (GHS)" value={`GH₵ ${amountGhs.toFixed(2)}`} />}
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
  const amountGhs      = localToGhs(amountLocal, currency);
  const availableLocal = availableBalanceGhs * currency.rateFromGhs;
  const minLocal       = MIN_WITHDRAWAL_AMOUNT * currency.rateFromGhs;

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
  const [showWithdraw,            setShowWithdraw]            = useState(false);
  const [showAffWithdraw,         setShowAffWithdraw]         = useState(false);
  const [showNoDeposit,           setShowNoDeposit]           = useState(false);   // new: never deposited
  const [showAffNoDeposit,        setShowAffNoDeposit]        = useState(false);   // new: affiliate, never deposited
  const [showActivationPrompt,    setShowActivationPrompt]    = useState(false);
  const [showAffActivationPrompt, setShowAffActivationPrompt] = useState(false);
  const [showInsufficientBal,     setShowInsufficientBal]     = useState(false);
  const [showAffInsufficientBal,  setShowAffInsufficientBal]  = useState(false);

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
  const ghsBalance     = walletData?.balance ?? 0;
  const affBalanceGhs  = affiliateStats?.availableBalance ?? 0;
  const affLifetimeGhs = affiliateStats?.lifetimeCommission ?? 0;
  const loyaltyTier    = (currentUser as unknown as Record<string, unknown>)?.loyaltyTier as string | undefined;

  const isAdmin = isAdminUser(currentUser as Parameters<typeof isAdminUser>[0]);

  const lifetimeDeposits  = countLifetimeDeposits(transactions);
  const accountActivated  = isAdmin || lifetimeDeposits >= DEPOSITS_REQUIRED_TO_ACTIVATE;

  const mainBalanceSufficient = isAdmin || ghsBalance >= MIN_WITHDRAWAL_AMOUNT;
  const affBalanceSufficient  = isAdmin || affBalanceGhs >= MIN_WITHDRAWAL_AMOUNT;

  // ── Withdraw button handlers ──────────────────────────────────────────────
  // Gate order:
  //   1. Never deposited (0 deposits) → "deposit first" modal (no activation dots)
  //   2. Has deposited but < 3        → activation prompt with progress dots
  //   3. Activated but low balance    → insufficient balance modal
  //   4. All clear                    → open withdraw modal
  const handleWithdrawClick = () => {
    if (!isAdmin && lifetimeDeposits === 0)  { setShowNoDeposit(true);         return; }
    if (!accountActivated)                   { setShowActivationPrompt(true);   return; }
    if (!mainBalanceSufficient)              { setShowInsufficientBal(true);    return; }
    setShowWithdraw(true);
  };

  const handleAffWithdrawClick = () => {
    if (!isAdmin && lifetimeDeposits === 0)  { setShowAffNoDeposit(true);        return; }
    if (!accountActivated)                   { setShowAffActivationPrompt(true); return; }
    if (!affBalanceSufficient)               { setShowAffInsufficientBal(true);  return; }
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
                </div>
              </div>
            </div>
            <button onClick={initLoad}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SyncIcon fontSize="small" />
            </button>
          </div>

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
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white/80 transition-all active:scale-[0.97]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <PaymentsIcon fontSize="small" /> Withdraw
                </button>
              </div>
            </div>
          </div>

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
              className="w-full py-3 rounded-2xl text-sm font-bold text-white/70 flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <PaymentsIcon fontSize="small" /> Withdraw Referral Earnings
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
                        {incoming
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
                  { icon: <WhatsAppIcon sx={{ fontSize: 20 }} />, label: 'WhatsApp Support', sub: 'Chat with us instantly',    color: '#ffffff', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', href: 'https://wa.me/233000000000' },
                  { icon: <TelegramIcon sx={{ fontSize: 20 }} />, label: 'Telegram Support', sub: '@Bet360Support',            color: '#ffffff', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', href: 'https://t.me/Bet360Support' },
                  { icon: <EmailIcon    sx={{ fontSize: 20 }} />, label: 'Email Support',    sub: 'bet360support11@gmail.com', color: '#ef4444', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)',   href: 'mailto:bet360support11@gmail.com' },
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
              <p className="text-center text-[10px] text-white/20 font-medium">Bet360 · Bet Responsibly · 18+</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}

      {/* Never deposited: "deposit first" — no activation dots */}
      <NoDepositModal
        open={showNoDeposit}
        onClose={() => setShowNoDeposit(false)}
      />

      <NoDepositModal
        open={showAffNoDeposit}
        onClose={() => setShowAffNoDeposit(false)}
      />

      {/* 1–2 deposits: activation progress prompt */}
      <ActivationPromptModal
        open={showActivationPrompt}
        onClose={() => setShowActivationPrompt(false)}
        lifetimeDeposits={lifetimeDeposits}
      />

      <ActivationPromptModal
        open={showAffActivationPrompt}
        onClose={() => setShowAffActivationPrompt(false)}
        lifetimeDeposits={lifetimeDeposits}
      />

      {/* Activated but balance too low */}
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
