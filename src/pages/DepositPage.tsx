import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { deposits, wallet as walletApi } from '../utils/api';
import AddCardIcon from '@mui/icons-material/AddCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'form' | 'processing' | 'success' | 'error';

// ── Supported countries list ──────────────────────────────────────────────────
// Each entry: [countryCode, countryName, currency, paystackCurrency, paystackChannel]

interface CountryEntry {
  code: string;
  name: string;
  currency: string;          // local display currency
  paystackCurrency: string;  // what Paystack charges in
  paystackChannel: string;
}

const SUPPORTED_COUNTRIES: CountryEntry[] = [
  { code: 'GH', name: 'Ghana',        currency: 'GHS', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'NG', name: 'Nigeria',       currency: 'NGN', paystackCurrency: 'NGN', paystackChannel: 'mobile_money' },
  { code: 'KE', name: 'Kenya',         currency: 'KES', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'ZA', name: 'South Africa',  currency: 'ZAR', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'UG', name: 'Uganda',        currency: 'UGX', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'TZ', name: 'Tanzania',      currency: 'TZS', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'SN', name: 'Senegal',       currency: 'XOF', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'CI', name: 'Côte d\'Ivoire',currency: 'XOF', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'ET', name: 'Ethiopia',      currency: 'ETB', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'RW', name: 'Rwanda',        currency: 'RWF', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'CM', name: 'Cameroon',      currency: 'XAF', paystackCurrency: 'GHS', paystackChannel: 'mobile_money' },
  { code: 'GB', name: 'United Kingdom',currency: 'GBP', paystackCurrency: 'GHS', paystackChannel: 'card' },
  { code: 'US', name: 'United States', currency: 'USD', paystackCurrency: 'GHS', paystackChannel: 'card' },
  { code: 'CA', name: 'Canada',        currency: 'CAD', paystackCurrency: 'GHS', paystackChannel: 'card' },
  { code: 'DE', name: 'Germany',       currency: 'EUR', paystackCurrency: 'GHS', paystackChannel: 'card' },
  { code: 'FR', name: 'France',        currency: 'EUR', paystackCurrency: 'GHS', paystackChannel: 'card' },
  { code: 'IT', name: 'Italy',         currency: 'EUR', paystackCurrency: 'GHS', paystackChannel: 'card' },
  { code: 'NL', name: 'Netherlands',   currency: 'EUR', paystackCurrency: 'GHS', paystackChannel: 'card' },
];

function getCountryEntry(code: string): CountryEntry {
  return (
    SUPPORTED_COUNTRIES.find(c => c.code === code.toUpperCase()) ??
    SUPPORTED_COUNTRIES[0] // default Ghana
  );
}

// ── Geo / IP detection ────────────────────────────────────────────────────────

async function detectCountryCode(): Promise<string> {
  // 1) Own backend proxy
  try {
    const res = await fetch('/api/geo/currency');
    if (res.ok) {
      const d = await res.json();
      if (d.countryCode) return d.countryCode as string;
    }
  } catch { /* fall through */ }

  // 2) ipapi.co — free, HTTPS, browser-friendly, 1k req/day
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.country_code) return d.country_code as string;
    }
  } catch { /* fall through */ }

  // 3) freeipapi.com — free, HTTPS, no key needed
  try {
    const res = await fetch('https://freeipapi.com/api/json', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.countryCode) return d.countryCode as string;
    }
  } catch { /* fall through */ }

  // 4) ip.guide — free, HTTPS, no key needed
  try {
    const res = await fetch('https://ip.guide/', {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const d = await res.json();
      if (d.location?.country_code) return d.location.country_code as string;
    }
  } catch { /* fall through */ }

  return 'GH'; // fallback
}


// ── Exchange rates (GHS as base) ──────────────────────────────────────────────

interface ExchangeInfo {
  rate: number;   // 1 GHS = rate × targetCurrency
  source: 'live' | 'fallback';
}

const FALLBACK_RATES_FROM_GHS: Record<string, number> = {
  GHS: 1,
  NGN: 104.5,
  KES: 8.4,
  ZAR: 1.19,
  UGX: 243.9,
  TZS: 167.7,
  XOF: 39.4,
  XAF: 39.4,
  RWF: 72.5,
  ETB: 3.68,
  GBP: 0.051,
  EUR: 0.059,
  CAD: 0.088,
  USD: 0.065,
};

async function fetchRateFromGHS(targetCurrency: string): Promise<ExchangeInfo> {
  if (targetCurrency === 'GHS') return { rate: 1, source: 'live' };

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/GHS', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.result === 'success' && d.rates?.[targetCurrency]) {
        return { rate: d.rates[targetCurrency], source: 'live' };
      }
    }
  } catch { /* fall through */ }

  try {
    const res = await fetch(
      `https://api.exchangerate.host/convert?from=GHS&to=${targetCurrency}&amount=1`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const d = await res.json();
      if (d.success && d.result) return { rate: d.result, source: 'live' };
    }
  } catch { /* fall through */ }

  return { rate: FALLBACK_RATES_FROM_GHS[targetCurrency] ?? 1, source: 'fallback' };
}

// ── Minimum deposit ───────────────────────────────────────────────────────────

const MIN_GHS = 300;

function calcMinLocal(localRate: number): number {
  const raw = MIN_GHS * localRate;
  if (raw >= 100_000) return Math.ceil(raw / 1000) * 1000;
  if (raw >= 10_000)  return Math.ceil(raw / 100) * 100;
  if (raw >= 1_000)   return Math.ceil(raw / 10) * 10;
  if (raw >= 100)     return Math.ceil(raw);
  return Math.ceil(raw * 100) / 100;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countryFlag(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  return cc.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join('');
}

function fmtLocal(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function buildQuickAmounts(minLocal: number, localRate: number): number[] {
  const ghsSteps = [300, 500, 1000, 2000, 5000, 10000];
  const steps = ghsSteps.map(g => {
    const raw = g * localRate;
    if (raw >= 100_000) return Math.round(raw / 1000) * 1000;
    if (raw >= 10_000)  return Math.round(raw / 100) * 100;
    if (raw >= 1_000)   return Math.round(raw / 10) * 10;
    if (raw >= 100)     return Math.round(raw);
    return Math.round(raw * 10) / 10;
  });
  return Array.from(new Set([minLocal, ...steps].filter(v => v >= minLocal)))
    .sort((a, b) => a - b)
    .slice(0, 6);
}

function fmtQuick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} rounded-lg animate-pulse`} style={{ backgroundColor: 'var(--border-light)' }} />;
}

// ── Buttons ───────────────────────────────────────────────────────────────────

function BtnPrimary({ children, onClick, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
      onMouseEnter={e => !disabled && ((e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.filter = '')}
    >{children}</button>
  );
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
      style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)', color: 'var(--text-main)' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.filter = 'brightness(0.96)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.filter = '')}
    >{children}</button>
  );
}

// ── Country Selector Dropdown ─────────────────────────────────────────────────

function CountrySelector({ selected, onChange, loading }: {
  selected: CountryEntry;
  onChange: (c: CountryEntry) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = SUPPORTED_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.currency.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        disabled={loading}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border-light)'}`,
          boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)' : 'none',
        }}
      >
        {loading ? (
          <SkeletonLine w="w-40" h="h-5" />
        ) : (
          <>
            <span className="text-xl leading-none">{countryFlag(selected.code)}</span>
            <span className="flex-1 text-left text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              {selected.name}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{
              backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)',
              color: 'var(--primary)',
            }}>
              {selected.currency}
            </span>
            <KeyboardArrowDownIcon
              sx={{ fontSize: 18 }}
              style={{
                color: 'var(--text-muted)',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1.5px solid var(--border-light)',
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--card-alt)' }}>
              <SearchIcon sx={{ fontSize: 15 }} style={{ color: 'var(--text-muted)' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-main)' }}
              />
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No countries found
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = c.code === selected.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                    style={{
                      backgroundColor: isSelected
                        ? 'color-mix(in srgb, var(--primary) 10%, var(--card-alt))'
                        : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card-alt)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <span className="text-lg leading-none">{countryFlag(c.code)}</span>
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                      {c.name}
                    </span>
                    <span className="text-xs font-bold" style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {c.currency}
                    </span>
                    {isSelected && (
                      <span className="text-xs" style={{ color: 'var(--primary)' }}>✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Amount Input ──────────────────────────────────────────────────────────────

function AmountInput({ value, onChange, minLocal, currency, isValid }: {
  value: string;
  onChange: (v: string) => void;
  minLocal: number;
  currency: string;
  isValid: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasError = value !== '' && !isValid;

  const borderColor = hasError ? '#e11d48' : focused ? 'var(--primary)' : 'var(--border-light)';
  const shadow = focused
    ? hasError
      ? '0 0 0 3px color-mix(in srgb, #e11d48 18%, transparent)'
      : '0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)'
    : 'none';

  return (
    <div
      className="flex items-center rounded-xl overflow-hidden transition-all duration-200"
      style={{ border: `1.5px solid ${borderColor}`, boxShadow: shadow, backgroundColor: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center justify-center px-4 h-14 shrink-0 select-none"
        style={{
          backgroundColor: focused ? 'color-mix(in srgb, var(--primary) 8%, var(--card-alt))' : 'var(--card-alt)',
          borderRight: `1.5px solid ${borderColor}`,
          transition: 'background-color 0.2s',
          minWidth: '76px',
        }}
      >
        <span className="text-xs font-bold" style={{ color: focused ? 'var(--primary)' : 'var(--text-muted)' }}>
          {currency}
        </span>
      </div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={`Min ${fmtLocal(minLocal, currency)}`}
        min={minLocal}
        step="1"
        className="flex-1 h-14 px-4 text-xl font-bold outline-none bg-transparent"
        style={{
          color: hasError ? '#e11d48' : 'var(--text-main)',
          caretColor: 'var(--primary)',
          MozAppearance: 'textfield',
        } as React.CSSProperties}
      />
    </div>
  );
}

// ── Main DepositPage ──────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  const [selectedCountry, setSelectedCountry] = useState<CountryEntry>(SUPPORTED_COUNTRIES[0]);
  const [geoLoading,      setGeoLoading]      = useState(true);

  // Exchange rates keyed by currency pair to avoid redundant fetches
  const [localExchange, setLocalExchange] = useState<ExchangeInfo | null>(null);
  const [psExchange,    setPsExchange]    = useState<ExchangeInfo | null>(null);
  const [exLoading,     setExLoading]     = useState(false);

  const [amount,        setAmount]        = useState('');
  const [paystackRef,   setPaystackRef]   = useState('');
  const [step,          setStep]          = useState<Step>('form');
  const [loading,       setLoading]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/deposit' } });
  }, [currentUser, navigate]);

  // ── Auto-detect country on mount ─────────────────────────────────────────
  useEffect(() => {
    setGeoLoading(true);
    detectCountryCode().then(code => {
      setSelectedCountry(getCountryEntry(code));
      setGeoLoading(false);
    });
  }, []);

  // ── Fetch exchange rates when country changes ─────────────────────────────
  useEffect(() => {
    if (geoLoading) return;
    setExLoading(true);
    setAmount(''); // reset amount when country changes

    const localCcy    = selectedCountry.currency;
    const paystackCcy = selectedCountry.paystackCurrency;

    const localPromise = fetchRateFromGHS(localCcy);
    const psPromise    = paystackCcy === localCcy ? localPromise : fetchRateFromGHS(paystackCcy);

    Promise.all([localPromise, psPromise])
      .then(([loc, ps]) => { setLocalExchange(loc); setPsExchange(ps); })
      .finally(() => setExLoading(false));
  }, [selectedCountry.code, geoLoading]);

  // ── Wallet balance ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !localExchange) return;
    walletApi.getWallet()
      .then(res => {
        const bal = (res.data as { balance?: number }).balance ?? null;
        if (bal !== null) setWalletBalance(bal * localExchange.rate); // GHS → local
      })
      .catch(() => {});
  }, [currentUser, localExchange, selectedCountry.currency]);

  // ── Derived values ────────────────────────────────────────────────────────

  const localCcy    = selectedCountry.currency;
  const paystackCcy = selectedCountry.paystackCurrency;

  const minLocal    = localExchange
    ? calcMinLocal(localExchange.rate)
    : calcMinLocal(FALLBACK_RATES_FROM_GHS[localCcy] ?? 1);

  const parsedAmount = parseFloat(amount);
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= minLocal;

  // GHS equivalent (what backend validates)
  const amountInGHS = localExchange && amountValid
    ? Math.round((parsedAmount / localExchange.rate) * 100) / 100
    : null;

  // Paystack charge amount (in paystackCurrency)
  const psChargeAmount = psExchange && amountInGHS
    ? Math.round(amountInGHS * psExchange.rate * 100) / 100
    : null;

  const quickAmounts = localExchange
    ? buildQuickAmounts(minLocal, localExchange.rate)
    : buildQuickAmounts(minLocal, 1);

  const ratesReady = !geoLoading && !exLoading && !!localExchange && !!psExchange;

  // ── Paystack popup ────────────────────────────────────────────────────────

  const handleDeposit = async () => {
    if (!amountValid || !psExchange || !localExchange || !amountInGHS) return;

    const popup = window.open('', 'paystack', 'width=600,height=700,scrollbars=yes');
    if (!popup || popup.closed) {
      setErrorMsg('Your browser blocked the payment popup. Please allow popups for this site and try again.');
      setStep('error');
      return;
    }

    popup.document.write(`
      <html><head><title>Redirecting to Paystack…</title>
      <style>
        body{margin:0;display:flex;align-items:center;justify-content:center;
             min-height:100vh;font-family:sans-serif;background:#0f172a;color:#94a3b8;}
        .s{width:40px;height:40px;border:3px solid #334155;border-top-color:#3b82f6;
           border-radius:50%;animation:spin .8s linear infinite;margin-bottom:16px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .w{text-align:center}
      </style></head>
      <body><div class="w"><div class="s"></div><p>Connecting to Paystack…</p></div></body></html>
    `);

    setLoading(true);
    setErrorMsg('');
    setStep('processing');

    try {
      const res = await deposits.paystackInit({
        amount:          psChargeAmount,
        currency:        paystackCcy,
        channel:         selectedCountry.paystackChannel,
        ghsAmount:       amountInGHS,
        localAmount:     parsedAmount,
        localCurrency:   localCcy,
        localRate:       localExchange.rate,
        psRate:          psExchange.rate,
        countryCode:     selectedCountry.code,
      });

      const raw     = res.data as Record<string, unknown>;
      const inner   = (raw?.data ?? raw) as Record<string, unknown>;
      const authUrl = (inner?.authorization_url ?? inner?.authorizationUrl ?? '') as string;
      const ref     = (inner?.reference ?? raw?.reference ?? '') as string;

      if (!authUrl) {
        popup.close();
        throw new Error('Paystack did not return a payment URL. Check server logs.');
      }

      setPaystackRef(ref);

      if (!popup.closed) {
        popup.location.href = authUrl;
        await new Promise<void>(resolve => {
          const timer = setInterval(() => {
            if (popup.closed) { clearInterval(timer); resolve(); }
          }, 500);
        });
      } else {
        window.location.href = authUrl;
      }

      setStep('success');
    } catch (e: unknown) {
      popup?.close();
      setErrorMsg(e instanceof Error ? e.message : 'Deposit failed. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => { setStep('form'); setAmount(''); setPaystackRef(''); setErrorMsg(''); };

  // ── Processing ────────────────────────────────────────────────────────────
  if (step === 'processing') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse"
          style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
          <AddCardIcon style={{ color: 'var(--primary)', fontSize: 32 }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Processing…</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Please complete the payment in the popup window.</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Do not close this page.</p>
      </div>
    </div>
  );

  // ── Success ───────────────────────────────────────────────────────────────
  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 text-center space-y-4">
        <CheckCircleIcon style={{ color: '#10b981', fontSize: 64 }} />
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#10b981' }}>Payment Initiated</h2>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--text-main)' }}>
            {fmtLocal(parsedAmount, localCcy)}
          </p>
          {psExchange && paystackCcy !== localCcy && psChargeAmount && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              ≈ {fmtLocal(psChargeAmount, paystackCcy)} charged via Paystack
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Your wallet will be credited once the payment is confirmed.
          </p>
          {paystackRef && (
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>Ref: {paystackRef}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <BtnPrimary onClick={() => navigate('/wallet')}>
            <AccountBalanceWalletIcon fontSize="small" /> Go to Wallet
          </BtnPrimary>
          <BtnSecondary onClick={resetAll}>Make Another Deposit</BtnSecondary>
        </div>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: 'color-mix(in srgb, #f43f5e 12%, transparent)' }}>
          <span className="text-2xl font-bold" style={{ color: '#e11d48' }}>✕</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#e11d48' }}>Failed</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {errorMsg || 'Something went wrong. Please try again.'}
          </p>
        </div>
        <BtnPrimary onClick={resetAll}>Try Again</BtnPrimary>
      </div>
    </div>
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <AddCardIcon style={{ color: 'var(--primary)' }} />
            Deposit
          </h1>
          {walletBalance !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 13 }} />
              <span style={{ color: 'var(--text-main)' }}>{fmtLocal(walletBalance, localCcy)}</span>
            </div>
          )}
        </div>

        {/* Country selector */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
        >
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Your Country
          </label>
          <CountrySelector
            selected={selectedCountry}
            onChange={c => { setSelectedCountry(c); setAmount(''); }}
            loading={geoLoading}
          />
          {!geoLoading && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Auto-detected · tap to change
            </p>
          )}
        </div>

        {/* Amount card */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
        >
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Amount ({localCcy})
          </label>

          <AmountInput
            value={amount}
            onChange={setAmount}
            minLocal={minLocal}
            currency={localCcy}
            isValid={amountValid}
          />

          {/* Min hint */}
          <div className="mt-1.5 space-y-1">
            {exLoading || geoLoading ? (
              <SkeletonLine w="w-56" h="h-3" />
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Minimum: {fmtLocal(minLocal, localCcy)}
                {localCcy !== 'GHS' ? ` (= GHS ${MIN_GHS})` : ''}
                {localExchange?.source === 'fallback' ? ' · estimated rate' : ' · live rate'}
              </p>
            )}
            {amount && !amountValid && (
              <p className="text-xs" style={{ color: '#e11d48' }}>
                Minimum deposit is {fmtLocal(minLocal, localCcy)}
              </p>
            )}
          </div>

          {/* Paystack charge note — only if currency differs */}
          {amountValid && paystackCcy !== localCcy && psChargeAmount && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mt-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--primary) 8%, var(--card-alt))',
                border: '1px solid color-mix(in srgb, var(--primary) 20%, var(--border-light))',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Paystack will charge{' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {fmtLocal(psChargeAmount, paystackCcy)}
                </strong>
                {psExchange?.source === 'fallback' ? ' (estimated)' : ' (live rate)'}
              </span>
            </div>
          )}

          {/* Quick amounts */}
          <div className="grid grid-cols-6 gap-2 mt-3">
            {quickAmounts.map(qa => {
              const active = amount === qa.toString();
              return (
                <button
                  key={qa}
                  type="button"
                  onClick={() => setAmount(qa.toString())}
                  className="py-2 text-xs font-semibold rounded-lg transition-all active:scale-[0.95]"
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--card-alt)',
                    color: active ? '#fff' : 'var(--text-main)',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
                >
                  {fmtQuick(qa)}
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <BtnPrimary onClick={handleDeposit} disabled={!amountValid || loading || !ratesReady}>
          {geoLoading
            ? 'Detecting location…'
            : exLoading
              ? 'Loading rates…'
              : !amount
                ? `Enter an amount (min ${fmtLocal(minLocal, localCcy)})`
                : !amountValid
                  ? `Minimum is ${fmtLocal(minLocal, localCcy)}`
                  : loading
                    ? 'Opening Paystack…'
                    : `Pay ${fmtLocal(parsedAmount, localCcy)} via Paystack`}
        </BtnPrimary>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          🔒 Minimum GHS {MIN_GHS}
          {localCcy !== 'GHS' && localExchange ? ` ≈ ${fmtLocal(minLocal, localCcy)}` : ''}
          {' · '}Secured by Paystack
        </p>

      </div>
    </div>
  );
}