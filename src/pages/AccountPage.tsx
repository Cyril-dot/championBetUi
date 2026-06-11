import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { user as userApi, wallet, affiliate, auth } from '../utils/api';
import type { UpdateProfileRequest, Transaction } from '../utils/api';

import EditIcon               from '@mui/icons-material/Edit';
import SaveIcon               from '@mui/icons-material/Save';
import CloseIcon              from '@mui/icons-material/Close';
import SettingsIcon           from '@mui/icons-material/Settings';
import NotificationsIcon      from '@mui/icons-material/Notifications';
import VerifiedUserIcon       from '@mui/icons-material/VerifiedUser';
import LogoutIcon             from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupAddIcon           from '@mui/icons-material/GroupAdd';
import RefreshIcon            from '@mui/icons-material/Refresh';
import LoopIcon               from '@mui/icons-material/Loop';
import OpenInNewIcon          from '@mui/icons-material/OpenInNew';
import PersonIcon             from '@mui/icons-material/Person';
import TrendingUpIcon         from '@mui/icons-material/TrendingUp';
import SyncIcon               from '@mui/icons-material/Sync';
import ChevronRightIcon       from '@mui/icons-material/ChevronRight';
import PeopleAltIcon          from '@mui/icons-material/PeopleAlt';
import PaidIcon               from '@mui/icons-material/Paid';
import NorthEastIcon          from '@mui/icons-material/NorthEast';
import SouthWestIcon          from '@mui/icons-material/SouthWest';
import MoneyOffIcon           from '@mui/icons-material/MoneyOff';
import VisibilityIcon         from '@mui/icons-material/Visibility';
import VisibilityOffIcon      from '@mui/icons-material/VisibilityOff';

// ---------------------------------------------------------------------------
// Currency detection
// ---------------------------------------------------------------------------

interface CurrencyInfo {
  code: string;
  symbol: string;
  countryCode: string;
  name: string;
  rateFromGhs: number;
}

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

let _currencyCache: CurrencyInfo | null = null;

async function detectCurrencyInfo(): Promise<CurrencyInfo> {
  if (_currencyCache) return _currencyCache;
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
  if (!countryCode) {
    try {
      const res = await fetch('https://ip.guide/', { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } });
      if (res.ok) { const d = await res.json(); countryCode = d.location?.country_code ?? ''; }
    } catch { /* fall through */ }
  }
  const localCurrency = countryCode ? COUNTRY_CURRENCY[countryCode] : undefined;
  if (!localCurrency) { _currencyCache = DEFAULT_CURRENCY; return DEFAULT_CURRENCY; }
  let rateFromGhs = 1;
  if (localCurrency.code !== 'GHS') {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(5000) });
      if (res.ok) { const d = await res.json(); rateFromGhs = d.rates?.[localCurrency.code] ?? 1; }
    } catch { /* fall through */ }
    if (rateFromGhs === 1) {
      try {
        const res = await fetch(`https://api.exchangerate.host/convert?from=GHS&to=${localCurrency.code}&amount=1`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) { const d = await res.json(); if (d.success && d.result) rateFromGhs = d.result; }
      } catch { /* fall through */ }
    }
  }
  _currencyCache = { code: localCurrency.code, symbol: localCurrency.symbol, name: localCurrency.name, countryCode, rateFromGhs };
  return _currencyCache;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getUserInitials(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const CREDIT_KINDS = new Set([
  'DEPOSIT', 'BET_WIN', 'REFERRAL_COMMISSION', 'VIP_CASHBACK',
  'WELCOME_BONUS', 'WITHDRAWAL_REFUND',
]);

function isCredit(kind: string) { return CREDIT_KINDS.has(kind); }

function txLabel(kind: string): string {
  const map: Record<string, string> = {
    DEPOSIT: 'Deposit', WITHDRAW: 'Withdrawal', WITHDRAW_HOLD: 'Withdrawal Hold',
    WITHDRAW_RELEASE: 'Withdrawal Released', BET_STAKE: 'Bet Placed', BET_WIN: 'Bet Won',
    REFERRAL_COMMISSION: 'Affiliate Commission', PAYOUT: 'Payout', ADJUSTMENT: 'Adjustment',
    VIP_CASHBACK: 'VIP Cashback', VIP_MEMBERSHIP: 'VIP Membership',
    WELCOME_BONUS: 'Welcome Bonus', WITHDRAWAL_REFUND: 'Withdrawal Refund',
    ADMIN_UPGRADE_FEE: 'Admin Upgrade Fee',
  };
  return map[kind] ?? kind.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner() {
  return <LoopIcon fontSize="small" className="animate-spin shrink-0" />;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div
      className={`${h} ${w} rounded-lg animate-pulse`}
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none"
      style={{ width: 44, height: 24, backgroundColor: checked ? '#16a34a' : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="inline-block w-[18px] h-[18px] rounded-full bg-white shadow-md transform transition-transform duration-200"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type TabId = 'overview' | 'profile' | 'preferences';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',  icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
  { id: 'profile',     label: 'Profile',   icon: <PersonIcon sx={{ fontSize: 18 }} /> },
  { id: 'preferences', label: 'More',      icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
];

// ---------------------------------------------------------------------------
// Main AccountPage
// ---------------------------------------------------------------------------
export default function AccountPage() {
  const { user, logout, setAdminModalOpen, showToast, login } = useAppStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Currency
  const [currency, setCurrency]               = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyLoading, setCurrencyLoading] = useState(true);

  // Data
  const [profileData, setProfileData]           = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading]     = useState(true);
  const [walletData, setWalletData]             = useState<Record<string, unknown> | null>(null);
  const [walletLoading, setWalletLoading]       = useState(true);
  const [transactions, setTransactions]         = useState<Transaction[]>([]);
  const [affiliateBalance, setAffiliateBalance] = useState<{ balance: number; totalReferrals?: number; lifetimeCommission?: number } | null>(null);
  const [showBalance, setShowBalance]           = useState(true);
  const [showAffBalance, setShowAffBalance]     = useState(true);

  // Profile edit
  const [editMode, setEditMode]       = useState(false);
  const [editForm, setEditForm]       = useState({ firstName: '', lastName: '', phone: '', country: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Preferences
  const [notifications, setNotifications] = useState({ push: true, sms: false, email: true });
  const [depositLimit, setDepositLimit]   = useState('');
  const [sessionLimit, setSessionLimit]   = useState('');

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  useEffect(() => {
    setCurrencyLoading(true);
    detectCurrencyInfo().then(setCurrency).finally(() => setCurrencyLoading(false));
  }, []);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await userApi.me();
      if (res.success && res.data) {
        setProfileData(res.data);
        const d = res.data as Record<string, unknown>;
        setEditForm({
          firstName: (d.firstName as string) ?? '',
          lastName:  (d.lastName  as string) ?? '',
          phone:     (d.phone     as string) ?? '',
          country:   (d.country   as string) ?? '',
        });
      }
    } catch { /* silently fall back */ }
    finally { setProfileLoading(false); }
  }, []);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const [walletRes, txRes, affRes] = await Promise.all([
        wallet.getWallet(),
        wallet.getTransactions(0, 5),
        affiliate.getBalance(),
      ]);
      if (walletRes.success) setWalletData(walletRes.data);
      if (txRes.success)     setTransactions(txRes.data.content);
      if (affRes.success) {
        const d = affRes.data as Record<string, unknown>;
        if (typeof d.balance === 'number')
          setAffiliateBalance({
            balance: d.balance,
            totalReferrals: typeof d.totalReferrals === 'number' ? d.totalReferrals : undefined,
            lifetimeCommission: typeof d.lifetimeCommission === 'number' ? d.lifetimeCommission : undefined,
          });
      }
    } catch { /* silently fail */ }
    finally { setWalletLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchWallet();
  }, [user, fetchProfile, fetchWallet]);

  if (!user) return null;

  // Derived values
  const apiFirstName = (profileData?.firstName as string) ?? '';
  const apiLastName  = (profileData?.lastName  as string) ?? '';
  const apiEmail     = (profileData?.email     as string) ?? user.email;
  const apiPhone     = (profileData?.phone     as string) ?? user.phone ?? '';
  const apiCountry   = (profileData?.country   as string) ?? '';
  const apiRole      = (profileData?.role      as string) ?? user.role;
  const displayName  = [apiFirstName, apiLastName].filter(Boolean).join(' ') || user.fullName;
  const roleLabel    = apiRole.replace('_', ' ');
  const isAdmin      = ['ADMIN', 'SUPER_ADMIN'].includes((apiRole ?? '').toUpperCase());
  const loyaltyTier  = (user as unknown as Record<string, unknown>)?.loyaltyTier as string | undefined;

  const walletBalanceGhs: number =
    typeof walletData?.balance === 'number'
      ? (walletData.balance as number)
      : typeof walletData?.availableBalance === 'number'
      ? (walletData.availableBalance as number)
      : 0;

  const affBalanceGhs         = affiliateBalance?.balance ?? 0;
  const affLifetimeGhs        = affiliateBalance?.lifetimeCommission ?? 0;
  const affTotalReferrals     = affiliateBalance?.totalReferrals ?? 0;
  const balanceReady          = !currencyLoading;

  // Handlers
  const saveProfile = async () => {
    setEditLoading(true);
    try {
      const body: UpdateProfileRequest = {
        firstName: editForm.firstName.trim() || undefined,
        lastName:  editForm.lastName.trim()  || undefined,
        phone:     editForm.phone.trim()     || undefined,
        country:   editForm.country.trim()   || undefined,
      };
      const res = await userApi.update(body);
      if (res.success) {
        const newName = [res.data.firstName, res.data.lastName].filter(Boolean).join(' ') || user.fullName;
        login({ ...user, fullName: newName, phone: res.data.phone ?? user.phone });
        await fetchProfile();
        setEditMode(false);
        showToast('Profile updated!', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    logout();
    navigate('/');
  };

  // Shared input style
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 15, outline: 'none',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#000000' }}>

      {/* ═══ HERO HEADER ═══ */}
      <div style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-lg mx-auto">

          {/* Profile identity row */}
          <div className="flex items-center gap-3.5 px-4 pt-5 pb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold select-none"
                style={{ background: 'linear-gradient(135deg, #16a34a, #064e1a)' }}
              >
                {getUserInitials(displayName)}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black bg-green-500"
              />
            </div>

            <div className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="space-y-2">
                  <Skeleton w="w-32" h="h-5" />
                  <Skeleton w="w-44" h="h-3.5" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="font-bold text-base leading-tight truncate text-white">
                      {displayName}
                    </h1>
                    <ChevronRightIcon sx={{ fontSize: 14 }} className="text-white/30" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs truncate text-white/40">{apiEmail}</p>
                  </div>
                </>
              )}
            </div>

            {/* Loyalty + refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{
                  backgroundColor: 'rgba(22,163,74,0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(22,163,74,0.3)',
                }}
              >
                {loyaltyTier ?? roleLabel}
              </span>
              <button
                onClick={() => { fetchProfile(); fetchWallet(); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <SyncIcon fontSize="small" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-all border-b-2 uppercase tracking-wider"
                style={{
                  borderColor: activeTab === tab.id ? '#16a34a' : 'transparent',
                  color: activeTab === tab.id ? '#4ade80' : 'rgba(255,255,255,0.3)',
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <>
            {/* Main Balance Card */}
            <div
              className="rounded-3xl p-5 overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #021a08 0%, #043d12 50%, #065c1c 100%)',
                border: '1px solid rgba(22,163,74,0.25)',
              }}
            >
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#16a34a' }} />
              <div className="absolute -bottom-12 -left-4 w-32 h-32 rounded-full opacity-5" style={{ backgroundColor: '#16a34a' }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AccountBalanceWalletIcon sx={{ fontSize: 16 }} style={{ color: 'rgba(22,163,74,0.8)' }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Main Wallet · {currency.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowBalance(v => !v)} className="text-white/30 hover:text-white transition-colors">
                      {showBalance ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    </button>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  </div>
                </div>
                <p className="text-4xl font-black tracking-tight text-white mt-2 mb-6">
                  {walletLoading || !balanceReady
                    ? <span className="inline-block h-10 w-48 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                    : showBalance
                    ? formatCurrency(walletBalanceGhs, currency)
                    : `${currency.code} ••••`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/deposit"
                    className="flex items-center justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    Deposit
                  </Link>
                  <Link
                    to="/wallet"
                    className="flex items-center justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white/80 transition-all active:scale-[0.97]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    Full Wallet
                  </Link>
                </div>
              </div>
            </div>

            {/* Affiliate / Referral Card — ADMIN ONLY */}
            {isAdmin && (
              <div
                className="rounded-3xl p-5"
                style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-0.5">
                      Referral Earnings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAffBalance(v => !v)} className="text-white/30 hover:text-white transition-colors">
                      {showAffBalance ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    </button>
                    <Link to="/affiliate">
                      <ChevronRightIcon fontSize="small" className="text-white/30" />
                    </Link>
                  </div>
                </div>

                <p className="text-3xl font-black text-white mb-4">
                  {walletLoading || !balanceReady
                    ? <span className="inline-block h-9 w-40 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                    : showAffBalance
                    ? formatCurrency(affBalanceGhs, currency)
                    : `${currency.code} ••••`}
                </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: <PaidIcon sx={{ fontSize: 18 }} style={{ color: '#ffffff' }} />, label: 'Total Earned', val: walletLoading || !balanceReady ? '…' : formatCurrency(affLifetimeGhs, currency), color: '#ffffff' },
                    { icon: <PeopleAltIcon sx={{ fontSize: 18 }} style={{ color: '#4ade80' }} />, label: 'Referrals', val: walletLoading ? '…' : String(affTotalReferrals), color: '#4ade80' },
                    { icon: <AccountBalanceWalletIcon sx={{ fontSize: 18 }} style={{ color: '#ffffff' }} />, label: 'Available', val: walletLoading || !balanceReady ? '…' : formatCurrency(affBalanceGhs, currency), color: '#ffffff' },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-2xl p-3 text-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex justify-center mb-1">{stat.icon}</div>
                      <p className="text-[9px] text-white/30 mb-0.5">{stat.label}</p>
                      <p className="text-[11px] font-bold" style={{ color: stat.color }}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/affiliate"
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white/70 flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <OpenInNewIcon fontSize="small" />
                  Manage Referrals
                </Link>
              </div>
            )}

            {/* Recent Transactions */}
            <div
              className="rounded-3xl p-5"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Recent Transactions
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchWallet}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <RefreshIcon sx={{ fontSize: 15 }} />
                  </button>
                  <Link
                    to="/wallet"
                    className="text-[11px] font-bold hover:underline"
                    style={{ color: '#4ade80' }}
                  >
                    View all
                  </Link>
                </div>
              </div>

              {walletLoading || !balanceReady ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <Skeleton w="w-9 h-9 rounded-full shrink-0" h="h-9" />
                    <div className="flex-1 space-y-2">
                      <Skeleton w="w-28" h="h-4" />
                      <Skeleton w="w-20" h="h-3" />
                    </div>
                    <Skeleton w="w-20" h="h-5" />
                  </div>
                ))
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <MoneyOffIcon sx={{ fontSize: 40 }} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm text-white/30">No transactions yet.</p>
                </div>
              ) : (
                transactions.map((tx, idx) => {
                  const credit = isCredit(tx.kind);
                  const isLast = idx === transactions.length - 1;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 py-3.5"
                      style={!isLast ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: credit ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.06)' }}
                      >
                        {credit
                          ? <SouthWestIcon sx={{ fontSize: 16 }} style={{ color: '#4ade80' }} />
                          : <NorthEastIcon sx={{ fontSize: 16 }} style={{ color: '#ffffff' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{txLabel(tx.kind)}</p>
                        <p className="text-xs text-white/30 mt-0.5">{formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-sm font-bold tabular-nums"
                          style={{ color: credit ? '#4ade80' : '#ffffff' }}
                        >
                          {credit ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                        <p className="text-[11px] text-white/25 mt-0.5">
                          Bal: {formatCurrency(tx.balanceAfter, currency)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* KYC */}
            <div
              className="rounded-3xl p-5"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <VerifiedUserIcon sx={{ fontSize: 16 }} style={{ color: '#4ade80' }} />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30">KYC Verification</h2>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Identity Verification</p>
                  <p className="text-xs mt-0.5 leading-relaxed text-white/40">
                    {user.kycStatus === 'verified'
                      ? 'Your identity has been verified.'
                      : user.kycStatus === 'pending'
                      ? 'Verification is in progress.'
                      : 'Verify your identity to unlock all features.'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl"
                    style={
                      user.kycStatus === 'verified'
                        ? { backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }
                        : user.kycStatus === 'pending'
                        ? { backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
                        : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }
                    }
                  >
                    {user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1)}
                  </span>
                  {user.kycStatus === 'unverified' && (
                    <button
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97]"
                      style={{ backgroundColor: '#16a34a' }}
                    >
                      Start KYC
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Admin panel CTA */}
            {isAdmin && (
              <button
                onClick={() => setAdminModalOpen(true)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                style={{ backgroundColor: '#16a34a' }}
              >
                <AdminPanelSettingsIcon fontSize="small" />
                Open Admin Panel
              </button>
            )}
          </>
        )}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <PersonIcon sx={{ fontSize: 16 }} style={{ color: '#4ade80' }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Personal Info</span>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1 text-xs font-bold"
                  style={{ color: '#4ade80' }}
                >
                  <EditIcon sx={{ fontSize: 13 }} />
                  Edit
                </button>
              )}
            </div>

            {editMode ? (
              <div className="px-5 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(['firstName', 'lastName'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">
                        {field === 'firstName' ? 'First Name' : 'Last Name'}
                      </label>
                      <input
                        type="text"
                        value={editForm[field]}
                        onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                        style={inputStyle}
                        disabled={editLoading}
                        placeholder={field === 'firstName' ? 'First' : 'Last'}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    style={inputStyle}
                    disabled={editLoading}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                    style={inputStyle}
                    disabled={editLoading}
                    placeholder="e.g. GH"
                    maxLength={2}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setEditMode(false)}
                    disabled={editLoading}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white/60 flex items-center justify-center gap-2 transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <CloseIcon fontSize="small" />
                    Cancel
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={editLoading}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    {editLoading ? <><Spinner /> Saving…</> : <><SaveIcon fontSize="small" />Save Changes</>}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {profileLoading
                  ? [1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center px-5 py-3.5"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <Skeleton w="w-20" h="h-3.5" />
                        <Skeleton w="w-28" h="h-3.5" />
                      </div>
                    ))
                  : (
                    <>
                      {[
                        { label: 'Full Name', value: displayName || '—' },
                        { label: 'Email',     value: apiEmail    || '—' },
                        { label: 'Phone',     value: apiPhone    || '—' },
                        { label: 'Country',   value: apiCountry  || '—' },
                        { label: 'Role',      value: roleLabel },
                      ].map(({ label, value }, idx, arr) => (
                        <div
                          key={label}
                          className="flex items-center justify-between px-5 py-3.5"
                          style={idx < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                        >
                          <span className="text-sm text-white/40">{label}</span>
                          <span className="text-sm font-semibold text-white ml-4 truncate">{value}</span>
                        </div>
                      ))}
                    </>
                  )}
              </div>
            )}
          </div>
        )}

        {/* ─── PREFERENCES TAB ─── */}
        {activeTab === 'preferences' && (
          <>
            {/* Notifications */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="flex items-center gap-2 px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <NotificationsIcon sx={{ fontSize: 16 }} style={{ color: '#4ade80' }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Notifications</span>
              </div>
              {(
                [
                  { key: 'push',  label: 'Push Notifications',  sub: 'In-app alerts & updates' },
                  { key: 'sms',   label: 'SMS Alerts',          sub: 'Text messages to your phone' },
                  { key: 'email', label: 'Email Notifications', sub: 'Updates sent to your inbox' },
                ] as const
              ).map(({ key, label, sub }, idx, arr) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-5 py-3.5 gap-3"
                  style={idx < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs mt-0.5 text-white/40">{sub}</p>
                  </div>
                  <Toggle
                    checked={notifications[key]}
                    onChange={() => setNotifications((p) => ({ ...p, [key]: !p[key] }))}
                  />
                </div>
              ))}
            </div>

            {/* Responsible Gambling */}
            <div
              className="rounded-3xl p-5"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <VerifiedUserIcon sx={{ fontSize: 16 }} style={{ color: '#4ade80' }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Responsible Gambling</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">
                    {currencyLoading ? 'Daily Deposit Limit' : `Daily Deposit Limit (${currency.code})`}
                  </label>
                  <input
                    type="number"
                    value={depositLimit}
                    onChange={(e) => setDepositLimit(e.target.value)}
                    placeholder="No limit set"
                    style={inputStyle}
                    min="0"
                    disabled={currencyLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">
                    Session Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={sessionLimit}
                    onChange={(e) => setSessionLimit(e.target.value)}
                    placeholder="No limit set"
                    style={inputStyle}
                    min="0"
                  />
                </div>
                <button
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97]"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  Save Limits
                </button>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                  <button
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      color: '#4ade80',
                      backgroundColor: 'rgba(22,163,74,0.08)',
                      border: '1px solid rgba(22,163,74,0.25)',
                    }}
                  >
                    Self-Exclusion
                  </button>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{
                color: '#4ade80',
                backgroundColor: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.25)',
              }}
            >
              <LogoutIcon fontSize="small" />
              Sign Out
            </button>

            <p className="text-center text-[10px] text-white/20 font-medium pb-2">
              WinningBet · Bet Responsibly · 18+
            </p>
          </>
        )}
      </div>
    </div>
  );
}