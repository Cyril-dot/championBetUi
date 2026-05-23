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

// ── Google Material Icons ─────────────────────────────────────────────────────
import WalletIcon              from '@mui/icons-material/Wallet';
import SavingsIcon             from '@mui/icons-material/Savings';
import NorthEastIcon           from '@mui/icons-material/NorthEast';
import SouthWestIcon           from '@mui/icons-material/SouthWest';
import SyncIcon                from '@mui/icons-material/Sync';
import CurrencyExchangeIcon    from '@mui/icons-material/CurrencyExchange';
import MoneyOffIcon            from '@mui/icons-material/MoneyOff';
import TaskAltIcon             from '@mui/icons-material/TaskAlt';
import VisibilityIcon          from '@mui/icons-material/Visibility';
import VisibilityOffIcon       from '@mui/icons-material/VisibilityOff';
import CancelIcon              from '@mui/icons-material/Cancel';
import LoopIcon                from '@mui/icons-material/Loop';
import PeopleAltIcon           from '@mui/icons-material/PeopleAlt';
import PaidIcon                from '@mui/icons-material/Paid';
import AccountBalanceIcon      from '@mui/icons-material/AccountBalance';
import VolunteerActivismIcon   from '@mui/icons-material/VolunteerActivism';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletData {
  balance: number;
  currency?: string;
  [key: string]: unknown;
}

interface CurrencyInfo {
  code: string;        // e.g. "GHS", "NGN", "USD"
  symbol: string;      // e.g. "GH₵", "₦", "$"
  countryCode: string; // e.g. "GH", "NG", "US"
  name: string;        // e.g. "Ghanaian Cedi"
  // Rate: how many units of this currency = 1 GHS (the backend's base currency)
  // For GHS itself, rate = 1
  rateFromGhs: number;
}

// Known MoMo / mobile-money networks by country code
const MOMO_NETWORKS: Record<string, string[]> = {
  GH: ['MTN', 'AirtelTigo', 'Telecel'],
  NG: ['MTN', 'Airtel', 'Glo', '9mobile'],
  KE: ['M-Pesa', 'Airtel Money', 'T-Kash'],
  TZ: ['M-Pesa', 'Airtel Money', 'Tigo Pesa', 'Halotel'],
  UG: ['MTN Mobile Money', 'Airtel Money'],
  SN: ['Orange Money', 'Wave', 'Free Money'],
  CI: ['Orange Money', 'MTN MoMo', 'Moov Money'],
  CM: ['MTN MoMo', 'Orange Money'],
  ZM: ['MTN Money', 'Airtel Money', 'Zamtel Kwacha'],
  ZW: ['EcoCash', 'OneMoney', 'Telecash'],
};

// ── Geo + currency detection ──────────────────────────────────────────────────

// Fallback map: country ISO → currency code + symbol
const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  GH: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  NG: { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira' },
  KE: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  TZ: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  UG: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  ZA: { code: 'ZAR', symbol: 'R',   name: 'South African Rand' },
  EG: { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound' },
  ET: { code: 'ETB', symbol: 'Br',  name: 'Ethiopian Birr' },
  SN: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  CI: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  CM: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  ZM: { code: 'ZMW', symbol: 'ZK',  name: 'Zambian Kwacha' },
  ZW: { code: 'ZWL', symbol: 'Z$',  name: 'Zimbabwean Dollar' },
  RW: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  MW: { code: 'MWK', symbol: 'MK',  name: 'Malawian Kwacha' },
  MZ: { code: 'MZN', symbol: 'MT',  name: 'Mozambican Metical' },
  GB: { code: 'GBP', symbol: '£',   name: 'British Pound' },
  DE: { code: 'EUR', symbol: '€',   name: 'Euro' },
  FR: { code: 'EUR', symbol: '€',   name: 'Euro' },
  US: { code: 'USD', symbol: '$',   name: 'US Dollar' },
  CA: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  AU: { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi',
  countryCode: 'GH', rateFromGhs: 1,
};

async function detectCurrencyInfo(): Promise<CurrencyInfo> {
  // 1. Try ip-api (free, no key required)
  let countryCode = '';
  try {
    const res = await fetch('https://ip-api.com/json/?fields=countryCode', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      countryCode = d.countryCode ?? '';
    }
  } catch { /* fall through */ }

  // 2. Fallback: ipapi.co
  if (!countryCode) {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const d = await res.json();
        countryCode = d.country_code ?? '';
      }
    } catch { /* fall through */ }
  }

  const localCurrency = countryCode ? COUNTRY_CURRENCY[countryCode] : undefined;
  if (!localCurrency) return DEFAULT_CURRENCY;

  // 3. Fetch GHS → localCurrency rate
  //    Backend stores everything in GHS, so we need: 1 GHS = X localCurrency
  let rateFromGhs = 1;

  if (localCurrency.code !== 'GHS') {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/GHS`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        rateFromGhs = d.rates?.[localCurrency.code] ?? 1;
      }
    } catch { /* fall through */ }

    // Fallback rate API
    if (rateFromGhs === 1) {
      try {
        const res = await fetch(
          `https://api.exchangerate.host/convert?from=GHS&to=${localCurrency.code}&amount=1`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.result) rateFromGhs = d.result;
        }
      } catch { /* fall through */ }
    }
  }

  return {
    code: localCurrency.code,
    symbol: localCurrency.symbol,
    name: localCurrency.name,
    countryCode,
    rateFromGhs,
  };
}

// ── Currency formatting ───────────────────────────────────────────────────────

function formatCurrency(amountInGhs: number, currency: CurrencyInfo): string {
  const converted = amountInGhs * currency.rateFromGhs;

  // Use Intl if we can (handles decimals, grouping, etc.)
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  } catch {
    // Fallback for codes Intl doesn't know
    return `${currency.symbol} ${converted.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Convert a user-entered amount in local currency back to GHS for the API
function localToGhs(localAmount: number, currency: CurrencyInfo): number {
  if (currency.rateFromGhs === 0) return localAmount;
  return localAmount / currency.rateFromGhs;
}

// ── Tx helpers ────────────────────────────────────────────────────────────────

const INCOMING_KINDS = [
  'DEPOSIT', 'BET_WIN', 'REFERRAL_COMMISSION', 'PAYOUT',
  'VIP_CASHBACK', 'WELCOME_BONUS', 'WITHDRAWAL_REFUND', 'ADJUSTMENT',
];

function isIncoming(kind: string) { return INCOMING_KINDS.includes(kind); }

function txLabel(kind: string): string {
  const map: Record<string, string> = {
    DEPOSIT:            'Deposit',
    WITHDRAW:           'Withdrawal',
    WITHDRAW_HOLD:      'Withdrawal Hold',
    WITHDRAW_RELEASE:   'Withdrawal Released',
    BET_STAKE:          'Bet Placed',
    BET_WIN:            'Bet Won',
    REFERRAL_COMMISSION:'Affiliate Commission',
    PAYOUT:             'Payout',
    ADJUSTMENT:         'Adjustment',
    VIP_CASHBACK:       'VIP Cashback',
    VIP_MEMBERSHIP:     'VIP Membership',
    WELCOME_BONUS:      'Welcome Bonus',
    WITHDRAWAL_REFUND:  'Withdrawal Refund',
    ADMIN_UPGRADE_FEE:  'Admin Upgrade Fee',
  };
  return map[kind] ?? kind;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── Button primitives ─────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

function BtnPrimary({ children, loading, icon, size = 'md', className = '', disabled, ...rest }: BtnProps) {
  const sz =
    size === 'sm' ? 'px-3 py-1.5 text-xs rounded-xl' :
    size === 'lg' ? 'w-full py-3.5 text-sm rounded-2xl' :
                    'px-5 py-3 text-sm rounded-xl';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={['inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none', sz, className].join(' ')}
      style={{ backgroundColor: 'var(--primary)', color: '#fff', ...rest.style }}
      onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {loading
        ? <LoopIcon fontSize="small" className="animate-spin shrink-0" />
        : icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

function BtnGhost({ children, loading, icon, size = 'md', className = '', disabled, style, ...rest }: BtnProps) {
  const sz =
    size === 'sm' ? 'px-3 py-1.5 text-xs rounded-xl' :
    size === 'lg' ? 'w-full py-3.5 text-sm rounded-2xl' :
                    'px-5 py-3 text-sm rounded-xl';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)', color: 'var(--text-main)', ...style }}
      className={['inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none', sz, className].join(' ')}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.filter = 'brightness(0.95)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {loading
        ? <LoopIcon fontSize="small" className="animate-spin shrink-0" />
        : icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

function BtnIcon({ children, className = '', title, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      {...rest}
      className={['w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-150', className].join(' ')}
      style={{ color: 'var(--text-muted)', ...rest.style }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  );
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} rounded-lg animate-pulse`} style={{ backgroundColor: 'var(--border-light)' }} />;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-sm ${className}`}
      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
    >
      {children}
    </div>
  );
}

function GroupedFields({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden" style={{ border: '1px solid var(--border-light)', borderRadius: 16 }}>
      {children}
    </div>
  );
}

function GroupedField({ label, last = false, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative" style={!last ? { borderBottom: '1px solid var(--border-light)' } : {}}>
      <label className="absolute left-4 top-3 text-[10px] font-bold uppercase tracking-wider pointer-events-none select-none z-10" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const groupedInputStyle: React.CSSProperties = {
  display: 'block', width: '100%',
  paddingTop: '2rem', paddingBottom: '0.75rem',
  paddingLeft: '1rem', paddingRight: '1rem',
  backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
  fontSize: 15, fontWeight: 500,
  outline: 'none', border: 'none', appearance: 'none' as const,
};

function GroupedInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...groupedInputStyle, ...props.style }}
      onFocus={e => { (e.currentTarget.parentElement as HTMLElement).style.backgroundColor = 'var(--card-alt)'; props.onFocus?.(e); }}
      onBlur={e => { (e.currentTarget.parentElement as HTMLElement).style.backgroundColor = ''; props.onBlur?.(e); }}
    />
  );
}

function GroupedSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...groupedInputStyle, paddingRight: '2.5rem', ...props.style }}
      onFocus={e => { (e.currentTarget.parentElement as HTMLElement).style.backgroundColor = 'var(--card-alt)'; props.onFocus?.(e); }}
      onBlur={e => { (e.currentTarget.parentElement as HTMLElement).style.backgroundColor = ''; props.onBlur?.(e); }}
    />
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function ModalShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-light)' }} />
        </div>
        <div className="px-6 pt-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

function ModalRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="flex justify-between py-3" style={!last ? { borderBottom: '1px solid var(--border-light)' } : {}}>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{value}</span>
    </div>
  );
}

function AlertBanner({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error';
  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium"
      style={{
        backgroundColor: isError
          ? 'color-mix(in srgb, #f43f5e 10%, transparent)'
          : 'color-mix(in srgb, #10b981 10%, transparent)',
        border: `1px solid ${isError
          ? 'color-mix(in srgb, #f43f5e 25%, transparent)'
          : 'color-mix(in srgb, #10b981 25%, transparent)'}`,
        color: isError ? '#e11d48' : '#059669',
      }}
    >
      {isError && <CancelIcon sx={{ fontSize: 16 }} className="shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
}

function MethodToggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl" style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
            style={{
              backgroundColor: active ? 'var(--primary)' : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
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
  const [method, setMethod]               = useState('momo');
  const [network, setNetwork]             = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const momoNetworks = MOMO_NETWORKS[currency.countryCode] ?? MOMO_NETWORKS['GH'];

  // Initialize default network when networks change
  useEffect(() => {
    setNetwork(momoNetworks[0] ?? '');
  }, [currency.countryCode]);

  const amountLocal = parseFloat(amount) || 0;
  const amountGhs   = localToGhs(amountLocal, currency);
  const balanceLocal = balanceGhs * currency.rateFromGhs;

  const reset = () => {
    setStep('form'); setAmount(''); setMethod('momo');
    setNetwork(momoNetworks[0] ?? ''); setAccountNumber(''); setAccountName(''); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await withdrawals.submit({
        amount: amountGhs, // API always receives GHS
        method,
        accountNumber,
        accountName,
        network: method === 'momo' ? network : undefined,
      });
      setStep('done');
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = amountLocal > 0 && amountLocal <= balanceLocal && !!accountNumber && !!accountName;

  const currencyLabel = `Amount (${currency.code})`;

  return (
    <ModalShell open={open} onClose={handleClose}>
      {step === 'done' && (
        <div className="text-center py-4 space-y-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'color-mix(in srgb, #10b981 15%, transparent)' }}
          >
            <TaskAltIcon style={{ color: '#10b981', fontSize: 34 }} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>Withdrawal Requested</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Your request is being reviewed. Funds will be sent shortly.
            </p>
          </div>
          <BtnPrimary size="lg" onClick={handleClose}>Done</BtnPrimary>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Confirm Withdrawal</h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
            <ModalRow label={`Amount (${currency.code})`} value={formatCurrency(amountGhs, currency)} />
            {currency.code !== 'GHS' && (
              <ModalRow label="Amount (GHS)" value={`GH₵ ${amountGhs.toFixed(2)}`} />
            )}
            <ModalRow label="Method" value={method === 'momo' ? 'Mobile Money' : 'Bank Transfer'} />
            {method === 'momo' && <ModalRow label="Network" value={network} />}
            <ModalRow label="Account" value={accountNumber} />
            <ModalRow label="Name"    value={accountName} last />
          </div>
          {error && <AlertBanner type="error" message={error} />}
          <div className="flex gap-3">
            <BtnGhost onClick={() => setStep('form')} disabled={loading} className="flex-1">Back</BtnGhost>
            <BtnPrimary loading={loading} onClick={submit} className="flex-1 py-3 rounded-xl">
              {loading ? 'Processing…' : 'Confirm'}
            </BtnPrimary>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Withdraw Funds</h3>
            <BtnIcon onClick={handleClose} aria-label="Close">
              <CancelIcon fontSize="small" />
            </BtnIcon>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Available</span>
            <span className="font-bold" style={{ color: 'var(--text-main)' }}>
              {formatCurrency(balanceGhs, currency)}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Method</p>
            <MethodToggle
              value={method}
              onChange={setMethod}
              options={[{ value: 'momo', label: 'Mobile Money' }, { value: 'bank', label: 'Bank Transfer' }]}
            />
          </div>

          <GroupedFields>
            <GroupedField label={currencyLabel}>
              <GroupedInput
                type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0.01" step="0.01"
                max={balanceLocal}
              />
            </GroupedField>

            {method === 'momo' ? (
              <GroupedField label="Network">
                <GroupedSelect value={network} onChange={e => setNetwork(e.target.value)}>
                  {momoNetworks.map(n => <option key={n} value={n}>{n}</option>)}
                </GroupedSelect>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>▾</span>
              </GroupedField>
            ) : (
              <GroupedField label="Bank Name">
                <GroupedInput type="text" value={network} onChange={e => setNetwork(e.target.value)} placeholder="e.g. GCB Bank" />
              </GroupedField>
            )}

            <GroupedField label={method === 'momo' ? 'Phone Number' : 'Account Number'}>
              <GroupedInput
                type="text" value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder={method === 'momo' ? '0XX XXX XXXX' : 'Account number'}
              />
            </GroupedField>

            <GroupedField label="Account Name" last>
              <GroupedInput type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Full name on account" />
            </GroupedField>
          </GroupedFields>

          {error && <AlertBanner type="error" message={error} />}

          <BtnPrimary size="lg" disabled={!canProceed} onClick={() => canProceed && setStep('confirm')}>
            Continue
          </BtnPrimary>
        </div>
      )}
    </ModalShell>
  );
}

// ── Affiliate Withdraw Modal ──────────────────────────────────────────────────

interface AffiliateWithdrawModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalanceGhs: number;
  currency: CurrencyInfo;
}

function AffiliateWithdrawModal({ open, onClose, onSuccess, availableBalanceGhs, currency }: AffiliateWithdrawModalProps) {
  const [step, setStep]                   = useState<'form' | 'done'>('form');
  const [amount, setAmount]               = useState('');
  const [bankName, setBankName]           = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]     = useState('');
  const [momoNumber, setMomoNumber]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const amountLocal = parseFloat(amount) || 0;
  const amountGhs   = localToGhs(amountLocal, currency);
  const availableLocal = availableBalanceGhs * currency.rateFromGhs;

  const reset = () => {
    setStep('form'); setAmount(''); setBankName('');
    setAccountNumber(''); setAccountName(''); setMomoNumber(''); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await affiliate.requestWithdrawal({
        amount: amountGhs, // API always receives GHS
        accountDetails: { bankName, accountNumber, accountName, mobileMoneyNumber: momoNumber || undefined },
      });
      setStep('done');
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = amountLocal > 0 && amountLocal <= availableLocal && !!bankName && !!accountNumber && !!accountName;

  return (
    <ModalShell open={open} onClose={handleClose}>
      {step === 'done' && (
        <div className="text-center py-4 space-y-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 15%, transparent)' }}
          >
            <TaskAltIcon style={{ color: '#3b82f6', fontSize: 34 }} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>Request Submitted</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your affiliate earnings withdrawal is being processed.</p>
          </div>
          <BtnPrimary size="lg" onClick={handleClose}>Done</BtnPrimary>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Withdraw Affiliate Earnings</h3>
            <BtnIcon onClick={handleClose} aria-label="Close"><CancelIcon fontSize="small" /></BtnIcon>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Available</span>
            <span className="font-bold" style={{ color: '#10b981' }}>
              {formatCurrency(availableBalanceGhs, currency)}
            </span>
          </div>

          <GroupedFields>
            <GroupedField label={`Amount (${currency.code})`}>
              <GroupedInput
                type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" max={availableLocal}
              />
            </GroupedField>
            <GroupedField label="Bank Name">
              <GroupedInput type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GCB Bank" />
            </GroupedField>
            <GroupedField label="Account Number">
              <GroupedInput type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" />
            </GroupedField>
            <GroupedField label="Account Name">
              <GroupedInput type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Full name on account" />
            </GroupedField>
            <GroupedField label="Mobile Money Number (optional)" last>
              <GroupedInput type="tel" value={momoNumber} onChange={e => setMomoNumber(e.target.value)} placeholder="0XX XXX XXXX" />
            </GroupedField>
          </GroupedFields>

          {error && <AlertBanner type="error" message={error} />}

          <BtnPrimary size="lg" loading={loading} disabled={!canSubmit} onClick={submit}>
            {loading ? 'Submitting…' : 'Submit Request'}
          </BtnPrimary>
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
  const [showWithdraw,    setShowWithdraw]    = useState(false);
  const [showAffWithdraw, setShowAffWithdraw] = useState(false);
  const [currency,        setCurrency]        = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/wallet' } });
  }, [currentUser, navigate]);

  // Auto-detect country + currency
  useEffect(() => {
    setCurrencyLoading(true);
    detectCurrencyInfo()
      .then(setCurrency)
      .finally(() => setCurrencyLoading(false));
  }, []);

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
    } finally {
      setTxLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  }, [fetchWallet, fetchTransactions, fetchAffiliateStats]);

  useEffect(() => {
    if (currentUser) initLoad();
  }, [currentUser, initLoad]);

  // ── All balances kept in GHS (backend native). Currency converts for display only.
  const ghsBalance    = walletData?.balance ?? 0;
  const affBalanceGhs = affiliateStats?.availableBalance   ?? 0;
  const affLifetimeGhs = affiliateStats?.lifetimeCommission ?? 0;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || currencyLoading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
            <SkeletonLine w="w-1/3" h="h-4" />
            <div className="mt-3"><SkeletonLine w="w-1/2" h="h-8" /></div>
            <div className="mt-4"><SkeletonLine h="h-10" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16 space-y-4">
        <AlertBanner type="error" message={fetchError} />
        <BtnPrimary onClick={initLoad}>Retry</BtnPrimary>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen pb-10" style={{ backgroundColor: 'var(--card-alt)' }}>
        <div className="max-w-lg mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <WalletIcon style={{ color: 'var(--primary)' }} />
                Wallet
              </h1>
              {currentUser && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentUser.fullName}</p>
              )}
            </div>
            <BtnIcon onClick={initLoad} title="Refresh wallet">
              <SyncIcon fontSize="small" />
            </BtnIcon>
          </div>

          {/* ── Main Balance Hero Card ── */}
          <div
            className="rounded-3xl p-5 sm:p-6 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, color-mix(in srgb, var(--primary) 70%, #000)))' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                Main Balance · {currency.code}
              </span>
              <button
                type="button"
                onClick={() => setShowBalance(v => !v)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
              >
                {showBalance ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
              </button>
            </div>

            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
              {showBalance ? formatCurrency(ghsBalance, currency) : `${currency.code} ••••`}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/deposit"
                className="flex items-center justify-center py-3 px-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] bg-white"
                style={{ color: 'var(--primary)' }}
              >
                Deposit
              </Link>
              <button
                type="button"
                onClick={() => setShowWithdraw(true)}
                className="flex items-center justify-center py-3 px-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* ── Affiliate Earnings Card ── */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SavingsIcon style={{ color: '#10b981', fontSize: 22 }} />
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Affiliate Earnings</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Withdraw to your bank account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAffBalance(v => !v)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-main)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
              >
                {showAffBalance ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
              </button>
            </div>

            <p className="text-3xl font-bold mb-4" style={{ color: 'var(--text-main)' }}>
              {showAffBalance ? formatCurrency(affBalanceGhs, currency) : `${currency.code} ••••`}
            </p>

            {affiliateStats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}>
                  <PaidIcon style={{ color: '#10b981', fontSize: 20 }} className="mx-auto mb-1" />
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
                  <p className="text-xs font-bold" style={{ color: '#10b981' }}>{formatCurrency(affLifetimeGhs, currency)}</p>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}>
                  <PeopleAltIcon style={{ color: '#3b82f6', fontSize: 20 }} className="mx-auto mb-1" />
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Referrals</p>
                  <p className="text-xs font-bold" style={{ color: '#3b82f6' }}>{affiliateStats.totalReferrals}</p>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)' }}>
                  <AccountBalanceIcon style={{ color: 'var(--text-main)', fontSize: 20 }} className="mx-auto mb-1" />
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Available</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{formatCurrency(affBalanceGhs, currency)}</p>
                </div>
              </div>
            )}

            <BtnGhost
              size="lg"
              icon={<VolunteerActivismIcon fontSize="small" />}
              onClick={() => setShowAffWithdraw(true)}
            >
              Withdraw Affiliate Earnings
            </BtnGhost>
          </Card>

          {/* ── Recent Transactions ── */}
          <Card className="p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Recent Transactions
            </h2>

            {transactions.length === 0 ? (
              <div className="text-center py-10">
                <MoneyOffIcon sx={{ fontSize: 40 }} style={{ color: 'var(--border-light)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, idx) => {
                  const incoming    = isIncoming(tx.kind);
                  const isLast      = idx === transactions.length - 1;
                  const balAfterGhs = tx.balanceAfter;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 py-3.5"
                      style={!isLast ? { borderBottom: '1px solid var(--border-light)' } : {}}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: incoming
                            ? 'color-mix(in srgb, #10b981 15%, transparent)'
                            : 'color-mix(in srgb, #f43f5e 15%, transparent)',
                        }}
                      >
                        {incoming
                          ? <SouthWestIcon sx={{ fontSize: 16 }} style={{ color: '#10b981' }} />
                          : <NorthEastIcon sx={{ fontSize: 16 }} style={{ color: '#f43f5e' }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{txLabel(tx.kind)}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.createdAt)}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold tabular-nums" style={{ color: incoming ? '#10b981' : '#f43f5e' }}>
                          {incoming ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                        {balAfterGhs !== undefined && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Bal: {formatCurrency(balAfterGhs, currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {txPage + 1 < txTotalPages && (
              <div className="mt-4">
                <BtnGhost
                  size="lg"
                  loading={txLoading}
                  icon={!txLoading ? <CurrencyExchangeIcon fontSize="small" /> : undefined}
                  onClick={() => fetchTransactions(txPage + 1)}
                >
                  {txLoading ? 'Loading…' : 'Load More'}
                </BtnGhost>
              </div>
            )}
          </Card>

        </div>
      </div>

      {/* Modals */}
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