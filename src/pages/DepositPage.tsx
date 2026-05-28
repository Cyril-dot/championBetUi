import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store";

// ── Constants ──────────────────────────────────────────────────────────────────
const MIN_GHS       = 1;
const QUICK_AMOUNTS = [1, 500, 1000, 2000, 5000, 10000];
const TX_SUCCESS    = 1;
const TX_FAILED     = 2;
const API_BASE      = "https://futballbackend-production-aefb.up.railway.app";
const POLL_INTERVAL = 5000;

// ── Network Logos ──────────────────────────────────────────────────────────────
const MTNLogo = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#FFCC00"/>
    <text x="20" y="15" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="Arial Black, Arial" fill="#000" letterSpacing="0.5">MTN</text>
    <text x="20" y="25" textAnchor="middle" fontSize="5.5" fontWeight="700" fontFamily="Arial, sans-serif" fill="#000" letterSpacing="0.3">MOMO</text>
    <rect x="8" y="27" width="24" height="2.5" rx="1.2" fill="#000" opacity="0.15"/>
  </svg>
);

const TelecelLogo = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#E2001A"/>
    <text x="20" y="17" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="Arial Black, Arial" fill="#fff" letterSpacing="0.3">TELE</text>
    <text x="20" y="26" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="Arial Black, Arial" fill="#fff" letterSpacing="0.3">CEL</text>
  </svg>
);

const AirtelTigoLogo = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#EF3E23"/>
    <text x="20" y="16" textAnchor="middle" fontSize="5.5" fontWeight="900" fontFamily="Arial Black, Arial" fill="#fff" letterSpacing="0.2">AIRTEL</text>
    <text x="20" y="25" textAnchor="middle" fontSize="5.5" fontWeight="900" fontFamily="Arial Black, Arial" fill="#fff" letterSpacing="0.2">TIGO</text>
  </svg>
);

const NETWORKS = [
  { id: "MTN",        label: "MTN",        sub: "MoMo",  color: "#c89a00", bg: "#fff8dc", Logo: MTNLogo },
  { id: "VODAFONE",   label: "Telecel",    sub: "Cash",  color: "#b30015", bg: "#fff0f0", Logo: TelecelLogo },
  { id: "AIRTELTIGO", label: "AirtelTigo", sub: "Money", color: "#0058a3", bg: "#eaf3ff", Logo: AirtelTigoLogo },
];

// ── Auth token helper — mirrors LoginPage.saveSession ──────────────────────────
// saveSession writes to localStorage always, and also sessionStorage when !remember.
// So localStorage is the reliable source — same as what the Header's wallet API uses.
function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Phone normalisation ────────────────────────────────────────────────────────
// Moolre requires the number to start with "0", no country code.
// Handles: "0244123456", "233244123456", "+233244123456", "244123456"
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  if (digits.startsWith("0"))   return digits;
  return "0" + digits;
}

// ── API helpers ────────────────────────────────────────────────────────────────
async function moolreInit(amount, phone, network) {
  const normalisedPhone = normalisePhone(phone);
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: JSON.stringify({ amount, phone: normalisedPhone, network }),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json?.message || json?.error || `Request failed (HTTP ${res.status}). Please try again.`);
  const inner = json?.data ?? json;
  const externalref = inner?.externalref ?? "";
  if (!externalref) throw new Error("No transaction reference returned. Please try again.");
  return { externalref, message: inner?.message ?? "Please approve the USSD prompt on your phone." };
}

async function moolreVerify(externalref) {
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: JSON.stringify({ externalref }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  const inner = json?.data ?? json;
  return {
    credited: Boolean(inner?.credited),
    txstatus: Number(inner?.txstatus ?? -1),
    message:  String(inner?.message  ?? ""),
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtGHS(n) {
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(n);
  } catch { return `GHS ${Number(n).toFixed(2)}`; }
}
function fmtQuick(n) { return n >= 1000 ? `${n / 1000}k` : String(n); }

// ── Global CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

  @keyframes dp-spin        { to { transform: rotate(360deg); } }
  @keyframes dp-fadeUp      { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes dp-popIn       { 0%{transform:scale(.94);opacity:0} 65%{transform:scale(1.02)} 100%{transform:scale(1);opacity:1} }
  @keyframes dp-breathe     { 0%,100%{box-shadow:0 0 0 0 rgba(24,95,165,.2)} 50%{box-shadow:0 0 0 8px rgba(24,95,165,0)} }
  @keyframes dp-pulse-ring  { 0%{transform:scale(1);opacity:.55} 100%{transform:scale(1.65);opacity:0} }
  @keyframes dp-blink       { 0%,100%{opacity:.25} 50%{opacity:1} }
  @keyframes dp-auth-slide  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  .dp * { box-sizing:border-box; font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
  .dp input[type=number]::-webkit-inner-spin-button,
  .dp input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
  .dp input[type=number] { -moz-appearance:textfield; }

  .dp .page {
    min-height: calc(100vh - 4rem);
    background: var(--bg-page, #f0f6ff);
    display:flex; align-items:center; justify-content:center;
    padding:1.5rem 1rem;
  }

  .dp .card {
    background: var(--card-bg, #fff);
    border-radius:20px;
    box-shadow:0 4px 32px rgba(24,95,165,.10),0 1px 4px rgba(24,95,165,.06);
    padding:1.75rem 1.5rem;
    width:100%; max-width:440px;
    animation:dp-fadeUp .28s ease both;
  }

  /* ── Auth gate card ──────────────────────────────────────────────────────── */
  .dp .auth-gate {
    border-radius:20px;
    background: var(--card-bg, #fff);
    box-shadow:0 4px 32px rgba(24,95,165,.10),0 1px 4px rgba(24,95,165,.06);
    padding:2.5rem 2rem;
    width:100%; max-width:400px;
    display:flex; flex-direction:column; align-items:center; gap:1.25rem;
    animation:dp-auth-slide .3s ease both;
    text-align:center;
  }
  .dp .auth-gate-icon {
    width:64px; height:64px; border-radius:50%;
    background:linear-gradient(135deg,#e6f1fb 0%,#dbeafe 100%);
    border:2px solid #b5d4f4;
    display:flex; align-items:center; justify-content:center; font-size:28px;
  }
  .dp .auth-gate-title {
    font-size:18px; font-weight:800; letter-spacing:-.02em;
    color: var(--text-main, #0c447c); margin:0;
  }
  .dp .auth-gate-sub {
    font-size:13px; color: var(--text-muted, #378ADD);
    line-height:1.6; margin:0;
  }
  .dp .auth-gate-actions { display:flex; flex-direction:column; gap:10px; width:100%; }
  .dp .btn-login {
    width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px 18px; border-radius:12px; border:none;
    background:#185FA5; color:#fff;
    font-size:14px; font-weight:700; cursor:pointer; transition:all .15s;
    box-shadow:0 4px 12px rgba(24,95,165,.3);
    text-decoration:none;
  }
  .dp .btn-login:hover { background:#0c447c; transform:translateY(-1px); }
  .dp .btn-register {
    width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
    padding:12px 18px; border-radius:12px;
    border:1.5px solid #b5d4f4; background:#e6f1fb;
    color:#185FA5; font-size:14px; font-weight:700; cursor:pointer; transition:all .15s;
    text-decoration:none;
  }
  .dp .btn-register:hover { border-color:#185FA5; background:#d0e8f9; }

  /* ── Card header ─────────────────────────────────────────────────────────── */
  .dp .card-header { display:flex; align-items:center; gap:10px; margin-bottom:1.25rem; }
  .dp .header-icon {
    width:38px; height:38px; border-radius:11px; background:#185FA5;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .dp .header-title { font-size:16px; font-weight:800; color:#0c447c; margin:0; letter-spacing:-.02em; }
  .dp .header-sub   { font-size:10px; font-weight:600; color:#378ADD; margin:1px 0 0; }

  /* User pill — shows logged-in name */
  .dp .user-pill {
    margin-left:auto; display:flex; align-items:center; gap:6px;
    padding:4px 10px; border-radius:100px;
    background:#e6f1fb; border:1px solid #b5d4f4;
    font-size:10px; font-weight:700; color:#185FA5; white-space:nowrap;
  }
  .dp .user-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; flex-shrink:0; }

  .dp .progress-track { height:3px; border-radius:2px; background:#e6f1fb; margin-bottom:1.25rem; overflow:hidden; }
  .dp .progress-fill  { height:100%; border-radius:2px; background:linear-gradient(90deg,#185FA5,#378ADD); transition:width .4s cubic-bezier(.4,0,.2,1); }

  .dp .step-row   { display:flex; align-items:center; gap:0; margin-bottom:3px; }
  .dp .step-dot   { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; flex-shrink:0; transition:all .25s; }
  .dp .step-dot.done   { background:#185FA5; color:#fff; }
  .dp .step-dot.active { background:#0c447c; color:#fff; }
  .dp .step-dot.idle   { background:#e6f1fb; color:#378ADD; }
  .dp .step-line       { flex:1; height:2px; background:#e6f1fb; transition:background .25s; }
  .dp .step-line.done  { background:#185FA5; }
  .dp .step-labels     { display:flex; justify-content:space-between; margin-top:3px; margin-bottom:1.25rem; }
  .dp .step-lbl        { font-size:8px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; flex:1; text-align:center; }

  .dp .sec-label { display:block; font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#378ADD; margin-bottom:6px; }
  .dp .divider   { border:none; border-top:1px solid #e6f1fb; margin:0 0 1.25rem; }

  .dp .field-card { border:1.5px solid #b5d4f4; border-radius:13px; padding:12px; background:#f7fbff; margin-bottom:10px; }

  .dp .amount-row { display:flex; align-items:center; border:1.5px solid #b5d4f4; border-radius:10px; background:#fff; overflow:hidden; transition:border-color .15s; }
  .dp .amount-row:focus-within { border-color:#185FA5; box-shadow:0 0 0 3px rgba(24,95,165,.1); }
  .dp .amount-row.err { border-color:#f87171; }
  .dp .amount-prefix { padding:0 12px; height:50px; display:flex; align-items:center; border-right:1.5px solid #e6f1fb; font-size:9px; font-weight:800; letter-spacing:.08em; color:#185FA5; background:#e6f1fb; flex-shrink:0; }
  .dp .amount-input  { flex:1; height:50px; padding:0 14px; background:transparent; border:none; outline:none; font-size:24px; font-weight:800; color:#0c447c; font-family:'JetBrains Mono',monospace; letter-spacing:-.02em; }
  .dp .amount-input::placeholder { color:#b5d4f4; }
  .dp .amount-hint { font-size:10px; font-weight:600; margin-top:5px; }

  .dp .quick-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:5px; margin-top:10px; }
  .dp .quick-chip { padding:6px 3px; border-radius:7px; text-align:center; border:1.5px solid #b5d4f4; background:#fff; font-size:10px; font-weight:700; color:#378ADD; cursor:pointer; transition:all .12s; }
  .dp .quick-chip:hover { border-color:#185FA5; color:#0c447c; background:#e6f1fb; }
  .dp .quick-chip.on { border-color:#185FA5; background:#185FA5; color:#fff; }

  .dp .phone-row { display:flex; align-items:center; border:1.5px solid #b5d4f4; border-radius:10px; background:#fff; overflow:hidden; transition:border-color .15s; }
  .dp .phone-row:focus-within { border-color:#185FA5; box-shadow:0 0 0 3px rgba(24,95,165,.1); }
  .dp .phone-row.err { border-color:#f87171; }
  .dp .phone-prefix { padding:0 12px; height:44px; display:flex; align-items:center; border-right:1.5px solid #e6f1fb; font-size:12px; font-weight:700; color:#185FA5; background:#e6f1fb; flex-shrink:0; font-family:'JetBrains Mono',monospace; }
  .dp .phone-input  { flex:1; height:44px; padding:0 12px; background:transparent; border:none; outline:none; font-size:15px; font-weight:700; color:#0c447c; font-family:'JetBrains Mono',monospace; letter-spacing:.05em; }
  .dp .phone-input::placeholder { color:#b5d4f4; }

  .dp .net-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-top:10px; }
  .dp .net-card { display:flex; flex-direction:column; align-items:center; gap:5px; padding:11px 6px; border-radius:12px; border:1.5px solid #b5d4f4; background:#fff; cursor:pointer; transition:all .15s; position:relative; }
  .dp .net-card:hover { border-color:#185FA5; background:#f0f6ff; }
  .dp .net-name { font-size:9px; font-weight:800; letter-spacing:.02em; text-align:center; line-height:1.3; color:#378ADD; }
  .dp .net-check { position:absolute; top:5px; right:5px; width:14px; height:14px; border-radius:50%; background:#185FA5; display:flex; align-items:center; justify-content:center; font-size:8px; color:#fff; font-weight:800; }

  .dp .tip      { display:flex; gap:8px; align-items:flex-start; padding:9px 11px; border-radius:10px; background:#e6f1fb; border:1px solid #b5d4f4; font-size:11px; color:#378ADD; line-height:1.6; margin-bottom:10px; }
  .dp .box-err  { padding:9px 12px; border-radius:10px; background:#fff0f0; border:1.5px solid #f4a0a8; font-size:11px; color:#9b1c1c; line-height:1.55; font-weight:500; margin-bottom:8px; }
  .dp .box-info { padding:9px 12px; border-radius:10px; background:#e6f1fb; border:1.5px solid #b5d4f4; font-size:11px; color:#0c447c; line-height:1.55; font-weight:500; margin-bottom:8px; }
  .dp .box-ok   { padding:9px 12px; border-radius:10px; background:#ecfdf5; border:1.5px solid #6ee7b7; font-size:11px; color:#065f46; line-height:1.55; font-weight:500; margin-bottom:8px; }

  .dp .btn-primary { width:100%; display:flex; align-items:center; justify-content:center; gap:7px; padding:12px 18px; border-radius:10px; border:none; background:#185FA5; color:#fff; font-size:13px; font-weight:700; letter-spacing:.01em; cursor:pointer; transition:all .15s; box-shadow:0 4px 12px rgba(24,95,165,.25); font-family:'Plus Jakarta Sans',sans-serif; }
  .dp .btn-primary:hover:not(:disabled) { background:#0c447c; transform:translateY(-1px); box-shadow:0 6px 16px rgba(24,95,165,.3); }
  .dp .btn-primary:active:not(:disabled) { transform:translateY(0); }
  .dp .btn-primary:disabled { background:#b5d4f4; cursor:not-allowed; box-shadow:none; }

  .dp .btn-ghost { width:100%; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 18px; border-radius:10px; border:1.5px solid #b5d4f4; background:#e6f1fb; color:#185FA5; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s; margin-top:7px; font-family:'Plus Jakarta Sans',sans-serif; }
  .dp .btn-ghost:hover { border-color:#185FA5; background:#d0e8f9; }

  .dp .spinner { width:15px; height:15px; border-radius:50%; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; animation:dp-spin .65s linear infinite; flex-shrink:0; }

  .dp .await-card { border-radius:16px; padding:22px 16px; background:#f7fbff; border:1.5px solid #b5d4f4; display:flex; flex-direction:column; align-items:center; gap:16px; animation:dp-popIn .3s ease both; }
  .dp .pulse-wrap  { position:relative; width:68px; height:68px; }
  .dp .pulse-ring  { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(24,95,165,.3); animation:dp-pulse-ring 1.8s ease-out infinite; }
  .dp .pulse-ring2 { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(24,95,165,.18); animation:dp-pulse-ring 1.8s ease-out .6s infinite; }
  .dp .await-icon  { position:relative; z-index:1; width:68px; height:68px; border-radius:50%; background:#e6f1fb; border:2px solid #b5d4f4; display:flex; align-items:center; justify-content:center; font-size:26px; animation:dp-breathe 2.4s ease-in-out infinite; }

  .dp .poll-dots { display:flex; gap:4px; align-items:center; }
  .dp .poll-dot  { width:4px; height:4px; border-radius:50%; background:#378ADD; animation:dp-blink 1.4s ease-in-out infinite; }
  .dp .poll-dot:nth-child(2) { animation-delay:.2s; }
  .dp .poll-dot:nth-child(3) { animation-delay:.4s; }

  .dp .result-card { border-radius:16px; padding:22px 16px; display:flex; flex-direction:column; align-items:center; gap:14px; animation:dp-popIn .3s ease both; }
  .dp .result-icon { width:58px; height:58px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; }

  .dp .ref-box   { background:#e6f1fb; border-radius:8px; padding:8px 12px; width:100%; font-size:10px; font-family:'JetBrains Mono',monospace; color:#0c447c; word-break:break-all; line-height:1.6; }
  .dp .ref-label { font-size:8px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#378ADD; display:block; margin-bottom:2px; }

  .dp .security-note { text-align:center; font-size:10px; color:#b5d4f4; font-weight:500; margin-top:4px; }
`;

// ── Step Indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const idx    = { amount: 0, awaiting: 1, success: 2, error: 2 }[step];
  const labels = ["Details", "Approve", "Done"];
  return (
    <>
      <div className="step-row">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? "1" : "0" }}>
            <div className={`step-dot ${i < idx ? "done" : i === idx ? "active" : "idle"}`}>
              {i < idx ? "✓" : i + 1}
            </div>
            {i < 2 && <div className={`step-line ${i < idx ? "done" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="step-labels">
        {labels.map((l, i) => (
          <div key={l} className="step-lbl" style={{ color: i === idx ? "#0c447c" : i < idx ? "#185FA5" : "#b5d4f4" }}>
            {l}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Auth Gate — shown when user is not logged in ────────────────────────────────
function AuthGate() {
  return (
    <div className="dp">
      <style>{GLOBAL_CSS}</style>
      <div className="page">
        <div className="auth-gate">
          <div className="auth-gate-icon">💳</div>
          <p className="auth-gate-title">Log in to Deposit</p>
          <p className="auth-gate-sub">
            You need to be logged in to make a deposit.<br />
            Join thousands of users on ZynoBet.
          </p>
          <div className="auth-gate-actions">
            <Link to="/login" className="btn-login">
              🔑 Log In
            </Link>
            <Link to="/register" className="btn-register">
              ✨ Create Account
            </Link>
          </div>
          <p style={{ fontSize: 10, color: "#b5d4f4", margin: 0 }}>
            🔒 Secured by Moolre · USSD Direct Charge
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────
function Shell({ children, step, user }) {
  const progress = { amount: 33, awaiting: 66, success: 100, error: 100 }[step];
  // Show first name from the store user object, same pattern as Header
  const firstName = user?.fullName?.split(" ")[0] ?? user?.email ?? "";

  return (
    <div className="dp">
      <style>{GLOBAL_CSS}</style>
      <div className="page">
        <div className="card">
          {/* Header */}
          <div className="card-header">
            <div className="header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="6" y1="15" x2="10" y2="15" />
              </svg>
            </div>
            <div>
              <p className="header-title">Deposit Funds</p>
              <p className="header-sub">Mobile Money · GHS</p>
            </div>
            {/* User pill — mirrors the avatar pattern in Header */}
            {firstName && (
              <div className="user-pill">
                <div className="user-dot" />
                {firstName}
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <StepIndicator step={step} />
          <hr className="divider" />

          {children}
        </div>
      </div>
    </div>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled = false, loading = false }) {
  return (
    <button className="btn-primary" onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}
function GhostBtn({ children, onClick }) {
  return <button className="btn-ghost" onClick={onClick}>{children}</button>;
}

// ── Step 1: Amount + Phone + Network ──────────────────────────────────────────
function AmountStep({ amount, setAmount, phone, setPhone, network, setNetwork, onPay, loading, error }) {
  const parsed      = parseFloat(amount);
  const amountValid = !isNaN(parsed) && parsed >= MIN_GHS;
  const phoneClean  = phone.replace(/\D/g, "");
  const phoneValid  = phoneClean.length >= 9 && phoneClean.length <= 12;
  const canPay      = amountValid && phoneValid && network !== "";

  return (
    <div>
      {/* Amount */}
      <div className="field-card">
        <span className="sec-label">Amount</span>
        <div className={`amount-row${amount && !amountValid ? " err" : ""}`}>
          <div className="amount-prefix">GHS</div>
          <input
            className="amount-input"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min={MIN_GHS}
            autoFocus
          />
        </div>
        <div className="amount-hint" style={{ color: amount && !amountValid ? "#e53e3e" : "#378ADD" }}>
          {amount && !amountValid ? `Minimum deposit is ${fmtGHS(MIN_GHS)}` : `Minimum: ${fmtGHS(MIN_GHS)}`}
        </div>
        <div className="quick-grid">
          {QUICK_AMOUNTS.map((qa) => (
            <button
              key={qa}
              className={`quick-chip${amount === qa.toString() ? " on" : ""}`}
              onClick={() => setAmount(qa.toString())}
            >
              {fmtQuick(qa)}
            </button>
          ))}
        </div>
      </div>

      {/* Phone + Network */}
      <div className="field-card">
        <span className="sec-label">MoMo Phone Number</span>
        <div className={`phone-row${phone && !phoneValid ? " err" : ""}`}>
          <div className="phone-prefix">+233</div>
          <input
            className="phone-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="0244 123 456"
            inputMode="numeric"
          />
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, marginTop: 5, color: phone && !phoneValid ? "#e53e3e" : "#378ADD" }}>
          {phone && !phoneValid
            ? "Enter a valid MoMo number (e.g. 0244123456)"
            : "Enter your full number starting with 0 (e.g. 0244123456)"}
        </div>

        <span className="sec-label" style={{ marginTop: 12 }}>Select Network</span>
        <div className="net-grid">
          {NETWORKS.map((n) => {
            const { Logo } = n;
            return (
              <div
                key={n.id}
                className="net-card"
                style={network === n.id ? { border: `1.5px solid ${n.color}`, background: n.bg } : {}}
                onClick={() => setNetwork(n.id)}
              >
                <Logo />
                <div className="net-name" style={{ color: network === n.id ? n.color : "#378ADD" }}>
                  {n.label}<br />{n.sub}
                </div>
                {network === n.id && <div className="net-check" style={{ background: n.color }}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="tip">
        <span style={{ fontSize: 13, flexShrink: 0 }}>📲</span>
        <span>
          A <strong style={{ color: "#0c447c" }}>USSD prompt</strong> will be sent to your MoMo phone.
          Approve it within 2 minutes to complete your deposit.
        </span>
      </div>

      {error && <div className="box-err">⚠️ {error}</div>}

      <PrimaryBtn onClick={onPay} disabled={!canPay} loading={loading}>
        {!loading && (canPay ? `Send USSD Prompt · ${fmtGHS(parsed)}` : "Fill in amount, phone & network")}
      </PrimaryBtn>
      <p className="security-note" style={{ marginTop: 8 }}>🔒 Secured by Moolre · USSD Direct Charge</p>
    </div>
  );
}

// ── Step 2: Awaiting ───────────────────────────────────────────────────────────
function AwaitingStep({ amount, phone, network, externalRef, verifyMsg, verifyLoading, pollCount, onVerify, onCancel }) {
  const net         = NETWORKS.find((n) => n.id === network);
  const Logo        = net?.Logo;
  const displayPhone = normalisePhone(phone || "");

  return (
    <div className="await-card">
      <div className="pulse-wrap">
        <div className="pulse-ring" /><div className="pulse-ring2" />
        <div className="await-icon">📲</div>
      </div>

      <div style={{ textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#378ADD", marginBottom: 5 }}>
          Awaiting Approval
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.03em", fontFamily: "JetBrains Mono, monospace", color: "#0c447c" }}>
          {fmtGHS(amount)}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8, padding: "5px 14px", borderRadius: 100, background: "#e6f1fb", border: "1.5px solid #b5d4f4", fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#0c447c" }}>
          {Logo && <Logo />}
          {displayPhone}
        </div>
        <div style={{ fontSize: 11, color: "#378ADD", marginTop: 10, lineHeight: 1.65 }}>
          Check your phone for a <strong style={{ color: "#0c447c" }}>USSD prompt</strong> and approve the payment.
        </div>
      </div>

      {externalRef && (
        <div className="ref-box">
          <span className="ref-label">Transaction Reference</span>
          {externalRef}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "#378ADD", fontWeight: 600 }}>
        <div className="poll-dots">
          <div className="poll-dot" /><div className="poll-dot" /><div className="poll-dot" />
        </div>
        Checking automatically ({pollCount})
      </div>

      {verifyMsg && (
        <div
          className={verifyMsg.toLowerCase().includes("fail") || verifyMsg.toLowerCase().includes("cancel") ? "box-err" : "box-info"}
          style={{ width: "100%", margin: 0 }}
        >
          {verifyMsg}
        </div>
      )}

      <div style={{ width: "100%" }}>
        <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
          {!verifyLoading && "I've Approved — Verify Payment"}
        </PrimaryBtn>
        <GhostBtn onClick={onCancel}>← Cancel & Start Over</GhostBtn>
      </div>
    </div>
  );
}

// ── Step 3a: Success ───────────────────────────────────────────────────────────
function SuccessStep({ amount, externalRef, onWallet, onAgain }) {
  return (
    <div className="result-card" style={{ background: "#ecfdf5", border: "1.5px solid #6ee7b7" }}>
      <div className="result-icon" style={{ background: "#d1fae5" }}>✅</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#065f46", marginBottom: 5 }}>Payment Confirmed</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.03em", fontFamily: "JetBrains Mono, monospace", color: "#0c447c" }}>
          {fmtGHS(amount)}
        </div>
        <div style={{ fontSize: 11, color: "#059669", marginTop: 5, fontWeight: 600 }}>Your wallet has been credited.</div>
        {externalRef && (
          <div style={{ fontSize: 9, color: "#378ADD", fontFamily: "JetBrains Mono, monospace", marginTop: 8, wordBreak: "break-all" }}>
            Ref: {externalRef}
          </div>
        )}
      </div>
      <div style={{ width: "100%" }}>
        <PrimaryBtn onClick={onWallet}>💳 Go to Wallet</PrimaryBtn>
        <GhostBtn onClick={onAgain}>Make Another Deposit</GhostBtn>
      </div>
    </div>
  );
}

// ── Step 3b: Error ─────────────────────────────────────────────────────────────
function ErrorStep({ msg, onRetry }) {
  return (
    <div className="result-card" style={{ background: "#fff0f0", border: "1.5px solid #f4a0a8" }}>
      <div className="result-icon" style={{ background: "#fee2e2", fontSize: 24 }}>❌</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9b1c1c", marginBottom: 5 }}>Payment Failed</div>
        <div style={{ fontSize: 12, color: "#c53030", lineHeight: 1.65 }}>
          {msg || "Something went wrong. Please try again."}
        </div>
      </div>
      <div style={{ width: "100%" }}>
        <PrimaryBtn onClick={onRetry}>Try Again</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DepositPage() {
  // ── Auth: use the store exactly like Header does ─────────────────────────────
  const { user } = useAppStore();
  const navigate = useNavigate();

  const [step,          setStep]          = useState("amount");
  const [amount,        setAmount]        = useState("");
  const [phone,         setPhone]         = useState("");
  const [network,       setNetwork]       = useState("");
  const [externalRef,   setExternalRef]   = useState("");
  const [errorMsg,      setErrorMsg]      = useState("");
  const [initLoading,   setInitLoading]   = useState(false);
  const [initError,     setInitError]     = useState("");
  const [verifyMsg,     setVerifyMsg]     = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [pollCount,     setPollCount]     = useState(0);

  const pollTimer = useRef(null);

  // Resume in-progress payment on page reload (only if still logged in)
  useEffect(() => {
    if (!user) return;
    const savedRef     = localStorage.getItem("moolre_externalref");
    const savedAmount  = localStorage.getItem("moolre_amount");
    const savedPhone   = localStorage.getItem("moolre_phone");
    const savedNetwork = localStorage.getItem("moolre_network");
    if (savedRef && savedAmount) {
      setExternalRef(savedRef);
      setAmount(savedAmount);
      if (savedPhone)   setPhone(savedPhone);
      if (savedNetwork) setNetwork(savedNetwork);
      setStep("awaiting");
    }
  }, [user]);

  // Auto-poll while on awaiting screen
  useEffect(() => {
    if (step !== "awaiting" || !externalRef) return;
    const poll = async () => {
      setPollCount((c) => c + 1);
      try {
        const { credited, txstatus } = await moolreVerify(externalRef);
        if (credited || txstatus === TX_SUCCESS) { clearSavedRef(); setStep("success"); }
        else if (txstatus === TX_FAILED)          { clearSavedRef(); setErrorMsg("Payment failed or was cancelled."); setStep("error"); }
        else                                      { pollTimer.current = setTimeout(poll, POLL_INTERVAL); }
      } catch { pollTimer.current = setTimeout(poll, POLL_INTERVAL); }
    };
    pollTimer.current = setTimeout(poll, POLL_INTERVAL);
    return () => { if (pollTimer.current) clearTimeout(pollTimer.current); };
  }, [step, externalRef]);

  const clearSavedRef = () =>
    ["moolre_externalref", "moolre_amount", "moolre_phone", "moolre_network"]
      .forEach((k) => localStorage.removeItem(k));

  const handlePay = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < MIN_GHS || !phone || !network) return;
    setInitLoading(true);
    setInitError("");
    try {
      const { externalref, message } = await moolreInit(amount, phone, network);
      localStorage.setItem("moolre_externalref", externalref);
      localStorage.setItem("moolre_amount",      amount);
      localStorage.setItem("moolre_phone",       phone);
      localStorage.setItem("moolre_network",     network);
      setExternalRef(externalref);
      setVerifyMsg(message);
      setStep("awaiting");
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Could not start payment. Please try again.");
    } finally {
      setInitLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!externalRef) return;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setVerifyLoading(true);
    setVerifyMsg("");
    try {
      const { credited, txstatus, message } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) {
        clearSavedRef(); setStep("success");
      } else if (txstatus === TX_FAILED) {
        clearSavedRef(); setErrorMsg("Payment failed or was cancelled."); setStep("error");
      } else {
        setVerifyMsg(message || "Payment still pending. Please approve the USSD prompt on your phone.");
        pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL);
      }
    } catch (e) {
      setVerifyMsg(e instanceof Error ? e.message : "Could not verify. Please try again.");
      pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAutoPoll = async () => {
    if (!externalRef) return;
    setPollCount((c) => c + 1);
    try {
      const { credited, txstatus } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) { clearSavedRef(); setStep("success"); }
      else if (txstatus === TX_FAILED)          { clearSavedRef(); setErrorMsg("Payment failed or was cancelled."); setStep("error"); }
      else                                      { pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL); }
    } catch { pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL); }
  };

  const resetAll = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    clearSavedRef();
    setStep("amount"); setAmount(""); setPhone(""); setNetwork("");
    setExternalRef(""); setErrorMsg(""); setVerifyMsg(""); setInitError("");
    setPollCount(0);
  };

  // ── Not logged in → show auth gate (same check as Header) ─────────────────
  if (!user) return <AuthGate />;

  const parsedAmount =
    parseFloat(amount) ||
    parseFloat(localStorage.getItem("moolre_amount") || "0");

  return (
    <Shell step={step} user={user}>
      {step === "amount" && (
        <AmountStep
          amount={amount}   setAmount={setAmount}
          phone={phone}     setPhone={setPhone}
          network={network} setNetwork={setNetwork}
          onPay={handlePay} loading={initLoading} error={initError}
        />
      )}
      {step === "awaiting" && (
        <AwaitingStep
          amount={parsedAmount}
          phone={phone   || localStorage.getItem("moolre_phone")   || ""}
          network={network || localStorage.getItem("moolre_network") || ""}
          externalRef={externalRef}
          verifyMsg={verifyMsg} verifyLoading={verifyLoading}
          pollCount={pollCount}
          onVerify={handleVerify} onCancel={resetAll}
        />
      )}
      {step === "success" && (
        <SuccessStep
          amount={parsedAmount} externalRef={externalRef}
          onWallet={() => navigate("/wallet")} onAgain={resetAll}
        />
      )}
      {step === "error" && (
        <ErrorStep msg={errorMsg} onRetry={resetAll} />
      )}
    </Shell>
  );
}
