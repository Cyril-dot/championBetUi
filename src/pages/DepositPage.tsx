import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://championbet.onrender.com";
const MIN_DEPOSIT_GHS = 550;

/* ─── Bank Transfer Details (Nigeria — Paga) ────────────────────────────────── */
const BANK_NAME        = "Paga Bank";
const BANK_ACCT_NAME   = "Muhammad Gabi";
const BANK_ACCT_NUMBER = "3066791253";
const MIN_DEPOSIT_NGN  = 67100;

/* ─── Binance / Crypto Constants ────────────────────────────────────────────── */
const BINANCE_ADDRESS = "TNxZMMoqCtfc98gJeUiDVZrLzoFMQfVYX5";
const BINANCE_NETWORK = "TRC20";
const BINANCE_COIN    = "USDT";
const CRYPTO_COINS    = ["USDT", "BTC", "ETH", "BNB", "USDC"];
const CRYPTO_NETWORKS = ["TRC20", "BEP20", "ERC20", "Arbitrum", "Optimism"];
const SUPPORT_EMAIL   = "championbetofficial@gmail.com";

/* ─── ImgBB (screenshot hosting) ─────────────────────────────────────────────*/
const IMGBB_API_KEY = "bdd12743a2e929bcdd4a6843dea9295e";

async function uploadToImgBB(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `ImgBB upload failed (${res.status})`);
  }
  const data = await res.json();
  const url: string = data?.data?.url;
  if (!url) throw new Error("ImgBB returned no URL — check your API key.");
  return url;
}

/* ─── Types & Data ─────────────────────────────────────────────────────────── */
interface Country {
  code: string;
  name: string;
  flag: string;
  flagImg: string;
  currency: string;
  symbol: string;
  gateways: ("paystack" | "binance" | "bank_ng")[];
}

const COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana",         flag: "🇬🇭", flagImg: "https://flagcdn.com/w40/gh.png", currency: "GHS", symbol: "GH₵",  gateways: ["paystack", "binance"] },
  { code: "NG", name: "Nigeria",        flag: "🇳🇬", flagImg: "https://flagcdn.com/w40/ng.png", currency: "NGN", symbol: "₦",    gateways: ["bank_ng", "binance"] },
  { code: "KE", name: "Kenya",          flag: "🇰🇪", flagImg: "https://flagcdn.com/w40/ke.png", currency: "KES", symbol: "KSh",  gateways: ["binance"] },
  { code: "TZ", name: "Tanzania",       flag: "🇹🇿", flagImg: "https://flagcdn.com/w40/tz.png", currency: "TZS", symbol: "TSh",  gateways: ["binance"] },
  { code: "UG", name: "Uganda",         flag: "🇺🇬", flagImg: "https://flagcdn.com/w40/ug.png", currency: "UGX", symbol: "USh",  gateways: ["binance"] },
  { code: "SN", name: "Senegal",        flag: "🇸🇳", flagImg: "https://flagcdn.com/w40/sn.png", currency: "XOF", symbol: "CFA",  gateways: ["binance"] },
  { code: "CI", name: "Côte d'Ivoire",  flag: "🇨🇮", flagImg: "https://flagcdn.com/w40/ci.png", currency: "XOF", symbol: "CFA",  gateways: ["binance"] },
  { code: "CM", name: "Cameroon",       flag: "🇨🇲", flagImg: "https://flagcdn.com/w40/cm.png", currency: "XAF", symbol: "FCFA", gateways: ["binance"] },
  { code: "ZM", name: "Zambia",         flag: "🇿🇲", flagImg: "https://flagcdn.com/w40/zm.png", currency: "ZMW", symbol: "ZK",   gateways: ["binance"] },
  { code: "ZA", name: "South Africa",   flag: "🇿🇦", flagImg: "https://flagcdn.com/w40/za.png", currency: "ZAR", symbol: "R",    gateways: ["binance"] },
  { code: "US", name: "United States",  flag: "🇺🇸", flagImg: "https://flagcdn.com/w40/us.png", currency: "USD", symbol: "$",    gateways: ["binance"] },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", flagImg: "https://flagcdn.com/w40/gb.png", currency: "GBP", symbol: "£",    gateways: ["binance"] },
  { code: "DE", name: "Germany",        flag: "🇩🇪", flagImg: "https://flagcdn.com/w40/de.png", currency: "EUR", symbol: "€",    gateways: ["binance"] },
  { code: "FR", name: "France",         flag: "🇫🇷", flagImg: "https://flagcdn.com/w40/fr.png", currency: "EUR", symbol: "€",    gateways: ["binance"] },
];

/* ─── Design Tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg:       "#0a0a0a",
  surface:  "#141414",
  raised:   "#1c1c1c",
  border:   "rgba(255,255,255,0.07)",
  red:      "#16a34a",
  redLow:   "rgba(22,163,74,0.1)",
  redMid:   "rgba(22,163,74,0.25)",
  gold:     "#d4a843",
  goldLow:  "rgba(212,168,67,0.1)",
  goldMid:  "rgba(212,168,67,0.28)",
  green:    "#22c55e",
  greenLow: "rgba(34,197,94,0.1)",
  greenMid: "rgba(34,197,94,0.22)",
  white:    "#f5f5f0",
  dim:      "rgba(245,245,240,0.38)",
  faint:    "rgba(245,245,240,0.06)",
};

/* ─── Stable style objects ───────────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: T.raised, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "11px 14px",
  color: T.white, fontSize: 14, outline: "none", fontFamily: "inherit",
  transition: "border 0.15s",
};

const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "13px", border: "none", borderRadius: 10,
  fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
  background: T.red, color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  transition: "opacity 0.15s", fontFamily: "inherit",
};

const btnGreen: React.CSSProperties = {
  ...btnPrimary, background: "linear-gradient(135deg,#16a34a,#15803d)",
};

const btnGhost: React.CSSProperties = {
  width: "100%", padding: "12px",
  background: "transparent", border: `1px solid ${T.border}`,
  borderRadius: 10, color: T.dim, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700,
  color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6,
};

/* ─── Small helpers ─────────────────────────────────────────────────────────── */
function FlagImg({ country, size = 24 }: { country: Country; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return <span style={{ fontSize: size * 0.9 }}>{country.flag}</span>;
  return <img src={country.flagImg} alt={country.name} width={size} height={size * 0.67} onError={() => setErr(true)} style={{ borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 6, cursor: "pointer", border: "none", background: ok ? "rgba(255,255,255,0.12)" : "rgba(22,163,74,0.18)", color: ok ? "#fff" : "#4ade80", transition: "all 0.2s", fontFamily: "inherit" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{ok ? "check_circle" : "content_copy"}</span>
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function Spin() {
  return <span style={{ display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "_spin 0.7s linear infinite" }} />;
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: "rgba(224,32,32,0.08)", border: "1px solid rgba(224,32,32,0.28)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 12, marginBottom: 16, lineHeight: 1.55, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>warning</span>
      {msg}
    </div>
  );
}

function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image."));
      img.onload = () => {
        const MAX_W = 800;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve(dataUrl.length > 524288 ? canvas.toDataURL("image/jpeg", 0.45) : dataUrl);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════════ */

/* ── Trust Badges ── */
function TrustBadges() {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Trusted Payment Partners</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "Paystack",  matIcon: "credit_card",         desc: "Cards · Ghana" },
          { label: "Bank",      matIcon: "account_balance",      desc: "Transfer" },
          { label: "Binance",   matIcon: "currency_bitcoin",     desc: "Crypto" },
        ].map(b => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6, background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim }}>{b.matIcon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{b.label}</div>
              <div style={{ fontSize: 9, color: T.dim }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Country Dropdown ── */
interface CountryDropdownProps {
  country: Country | null;
  ipDetecting: boolean;
  onSelect: (c: Country) => void;
}
function CountryDropdown({ country, ipDetecting, onSelect }: CountryDropdownProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const [search,   setSearch]   = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.currency.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropRef} style={{ position: "relative", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.red, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>1</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Select your country</span>
        {ipDetecting && <span style={{ fontSize: 10, color: T.dim, display: "flex", alignItems: "center", gap: 4 }}><Spin /> detecting…</span>}
        {!ipDetecting && country && <span style={{ fontSize: 10, color: T.green, display: "flex", alignItems: "center", gap: 3 }}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>my_location</span>auto-detected</span>}
      </div>
      <button onClick={() => setDropOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: T.raised, border: `1px solid ${dropOpen ? T.red : T.border}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", fontFamily: "inherit", transition: "border 0.15s" }}>
        {country ? (
          <><FlagImg country={country} size={24} /><span style={{ flex: 1, textAlign: "left", color: T.white, fontSize: 14, fontWeight: 600 }}>{country.name}</span><span style={{ fontSize: 11, color: T.dim, marginRight: 6 }}>{country.currency}</span></>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: T.dim, fontSize: 13 }}>Choose a country…</span>
        )}
        <span className="material-symbols-outlined" style={{ color: T.dim, fontSize: 18, transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>expand_more</span>
      </button>

      {dropOpen && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.dim }}>search</span>
            <input autoFocus type="text" placeholder="Search country or currency…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp, padding: "6px 0", fontSize: 13, marginBottom: 0, background: "none", border: "none", flex: 1 }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.map(c => {
              const hasPaystack = c.gateways.includes("paystack");
              const hasBank     = c.gateways.includes("bank_ng");
              const badge = hasPaystack ? { label: "CARD",   bg: T.redLow,   color: "#4ade80", border: T.redMid }
                          : hasBank     ? { label: "BANK",   bg: T.greenLow, color: T.green,   border: T.greenMid }
                          :               { label: "CRYPTO", bg: T.goldLow,  color: T.gold,    border: "rgba(212,168,67,0.3)" };
              return (
                <button key={c.code} onClick={() => { onSelect(c); setDropOpen(false); setSearch(""); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: country?.code === c.code ? T.redLow : "none", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s" }}>
                  <FlagImg country={c} size={22} />
                  <span style={{ flex: 1, textAlign: "left", color: T.white, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: T.dim, marginRight: 8 }}>{c.currency}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em", background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Gateway Tabs ── */
interface GatewayTabsProps {
  country: Country;
  gateway: "paystack" | "binance" | "bank_ng" | null;
  onSelect: (gw: "paystack" | "binance" | "bank_ng") => void;
}
function GatewayTabs({ country, gateway, onSelect }: GatewayTabsProps) {
  if (!country || country.gateways.length <= 1) return null;

  type TabDef = { id: "paystack" | "binance" | "bank_ng"; matIcon: string; label: string; sub: string };
  const allTabs: TabDef[] = [
    { id: "paystack",  matIcon: "credit_card",        label: "Card / Paystack", sub: "Visa · Mastercard · GHS" },
    { id: "bank_ng",   matIcon: "account_balance",    label: "Bank Transfer",   sub: "Paga · Nigeria" },
    { id: "binance",   matIcon: "currency_bitcoin",   label: "Crypto",          sub: "USDT · BTC · ETH · BNB" },
  ];
  const tabs = allTabs.filter(t => country.gateways.includes(t.id));

  return (
    <div style={{ marginBottom: 22 }}>
      <label style={lbl}>Payment method</label>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 8 }}>
        {tabs.map(t => {
          const active    = gateway === t.id;
          const isCrypto  = t.id === "binance";
          const isBank    = t.id === "bank_ng";
          const accentClr = isCrypto ? T.gold : isBank ? T.green : "#4ade80";
          const accentBg  = isCrypto ? T.goldLow : isBank ? T.greenLow : T.redLow;
          const accentBd  = isCrypto ? "rgba(212,168,67,0.5)" : isBank ? T.greenMid : T.red;
          return (
            <button key={t.id} onClick={() => onSelect(t.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "13px 14px", background: active ? accentBg : T.raised, border: `1.5px solid ${active ? accentBd : T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: active ? accentClr : T.dim }}>{t.matIcon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>{t.label}</span>
              <span style={{ fontSize: 9, color: T.dim, lineHeight: 1.4 }}>{t.sub}</span>
              {active && (
                <span style={{ fontSize: 9, fontWeight: 800, color: accentClr, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check_circle</span>SELECTED
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Support Panel ── */
function SupportPanel() {
  const [supportOpen, setSupportOpen] = useState(false);
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", marginTop: 16, animation: "_fadeUp 0.3s ease" }}>
      <button onClick={() => setSupportOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.green }}>support_agent</span>
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Need help? Contact Support</div>
          <div style={{ fontSize: 11, color: T.dim }}>We're online 24/7 — response in under 5 mins</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: T.dim, fontSize: 18, transform: supportOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>expand_more</span>
      </button>
      {supportOpen && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { matIcon: "chat", label: "Telegram Support", desc: "@Championbet_Agent",  href: "https://t.me/Championbet_Agent", color: "#2AABEE" },
              { matIcon: "mail", label: "Email Support",    desc: SUPPORT_EMAIL,         href: `mailto:${SUPPORT_EMAIL}`,        color: "#60a5fa" },
            ].map(ch => (
              <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 13px", textDecoration: "none", transition: "border 0.15s" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: ch.color, flexShrink: 0 }}>{ch.matIcon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{ch.label}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>{ch.desc}</div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: ch.color }}>arrow_forward</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 14, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 9, padding: "10px 13px", fontSize: 11, color: T.dim, lineHeight: 1.6, display: "flex", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: T.green, flexShrink: 0, marginTop: 1 }}>schedule</span>
            <span><strong style={{ color: T.white }}>Support hours:</strong> 24 hours, 7 days a week.<br />For deposit issues, have your <strong style={{ color: T.white }}>phone number / reference</strong> ready.</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAYSTACK — Ghana Card/Online Payments
══════════════════════════════════════════════════════════════════════════════ */
interface PaystackFormProps {
  error: string;
  amount: string; setAmount: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
}
function PaystackForm({ error, amount, setAmount, loading, onSubmit }: PaystackFormProps) {
  const QUICK_GHS = [550, 1000, 2000, 5000, 10000, 20000];
  const numAmt = parseFloat(amount);
  const valid = !isNaN(numAmt) && numAmt >= MIN_DEPOSIT_GHS;

  return (
    <div>
      {error && <ErrBox msg={error} />}

      {/* Info banner */}
      <div style={{ background: T.redLow, border: `1px solid ${T.redMid}`, borderRadius: 9, padding: "9px 13px", marginBottom: 16, fontSize: 12, color: "#4ade80", lineHeight: 1.55, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>info</span>
        Minimum deposit: <strong>GH₵{MIN_DEPOSIT_GHS.toLocaleString()}</strong>. You'll be redirected to Paystack's secure checkout.
      </div>

      {/* Card logos / badges */}
      <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#4ade80" }}>verified_user</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>Secured by Paystack</div>
          <div style={{ fontSize: 11, color: T.dim }}>Visa · Mastercard · Mobile Money · Bank Transfer</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["visa", "payment", "credit_card"].map(icon => (
            <span key={icon} className="material-symbols-outlined" style={{ fontSize: 20, color: T.dim }}>{icon}</span>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Deposit Amount (GH₵) <span style={{ color: T.red }}>*</span></label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${!amount || valid ? T.border : "rgba(224,32,32,0.5)"}`, borderRadius: 10, overflow: "hidden" }}>
          <span style={{ padding: "0 12px", borderRight: `1px solid ${T.border}`, fontSize: 14, fontWeight: 700, color: "#4ade80", display: "flex", alignItems: "center", height: "100%", whiteSpace: "nowrap" }}>GH₵</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Min ${MIN_DEPOSIT_GHS}`}
            min={MIN_DEPOSIT_GHS}
            style={{ ...inp, border: "none", borderRadius: 0, background: "none", fontSize: 18, fontWeight: 700 }}
          />
        </div>
        {amount && !valid && (
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>
            Minimum deposit is GH₵{MIN_DEPOSIT_GHS}
          </div>
        )}
      </div>

      {/* Quick amounts */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 }}>Quick amounts</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {QUICK_GHS.map(q => (
            <button key={q} onClick={() => setAmount(String(q))}
              style={{ background: amount === String(q) ? T.redLow : T.faint, border: `1px solid ${amount === String(q) ? T.red : T.border}`, borderRadius: 8, padding: "7px 0", color: amount === String(q) ? "#4ade80" : T.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit" }}>
              {q >= 1000 ? `${q / 1000}k` : q}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onSubmit} disabled={loading || !valid}
        style={{ ...btnPrimary, opacity: loading || !valid ? 0.38 : 1, marginBottom: 8 }}>
        {loading
          ? <><Spin /> Redirecting to Paystack…</>
          : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>Pay GH₵{amount || "0"} with Paystack</>
        }
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 4 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>lock</span>
        256-bit SSL encrypted payment — powered by Paystack
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BINANCE / CRYPTO
══════════════════════════════════════════════════════════════════════════════ */

/* ── Binance Screenshot Uploader (optional, ImgBB-hosted) ── */
interface BinanceScreenshotUploaderProps {
  screenshot: string;
  preview: string;
  uploading: boolean;
  error?: string;
  onFileChange: (file: File) => void;
  onRemove: () => void;
}
function BinanceScreenshotUploader({ screenshot, preview, uploading, error, onFileChange, onRemove }: BinanceScreenshotUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileChange(file);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={lbl}>
        Payment Screenshot{" "}
        <span style={{ color: T.dim, textTransform: "none", fontSize: 10, fontWeight: 400 }}>(recommended · auto-uploaded)</span>
      </label>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleInputChange} />
      <button type="button" onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          position: "relative", width: "100%",
          padding: preview ? 0 : "20px 16px",
          borderRadius: 10, cursor: uploading ? "wait" : "pointer",
          boxSizing: "border-box", overflow: "hidden",
          background: screenshot ? T.goldLow : T.faint,
          border: `2px dashed ${error ? "rgba(224,32,32,0.5)" : screenshot ? T.goldMid : T.border}`,
          color: screenshot ? T.gold : T.dim,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "inherit", transition: "all 0.2s",
        }}>
        {preview ? (
          <img src={preview} alt="Payment proof" style={{ width: "100%", maxHeight: 180, objectFit: "contain", opacity: uploading ? 0.5 : 1, display: "block" }} />
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add_photo_alternate</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Tap to upload screenshot</span>
            <span style={{ fontSize: 10, color: "rgba(245,245,240,0.2)" }}>PNG · JPG · WEBP — max 10 MB</span>
          </>
        )}
        {uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Spin /><span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Uploading…</span>
          </div>
        )}
      </button>
      {screenshot && !uploading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <div style={{ fontSize: 11, color: T.gold, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
            Uploaded — tap image to change
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, cursor: "pointer", border: "none", background: "rgba(224,32,32,0.15)", color: "#f87171", fontFamily: "inherit" }}>
            Remove
          </button>
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: "#f87171", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{error}
        </div>
      )}
      {!screenshot && !uploading && !error && (
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
          Optional but speeds up admin verification. Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: T.gold }}>{SUPPORT_EMAIL}</a>{" "}
          if you prefer to attach later.
        </div>
      )}
    </div>
  );
}

/* ── Binance Info ── */
interface BinanceInfoProps { error: string; onNext: () => void; }
function BinanceInfo({ error, onNext }: BinanceInfoProps) {
  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 18 }}>currency_bitcoin</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>Send USDT to this address</div>
            <div style={{ fontSize: 11, color: T.dim }}>Network: <strong style={{ color: "#4ade80" }}>{BINANCE_NETWORK} (TRON)</strong></div>
          </div>
        </div>
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Wallet Address</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.white, wordBreak: "break-all", lineHeight: 1.7, marginBottom: 10 }}>{BINANCE_ADDRESS}</div>
          <CopyBtn text={BINANCE_ADDRESS} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[["Network", BINANCE_NETWORK], ["Coin", BINANCE_COIN], ["Min.", `GH₵${MIN_DEPOSIT_GHS}`]].map(([l, v]) => (
            <div key={l} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 5px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(224,32,32,0.07)", border: "1px solid rgba(224,32,32,0.3)", borderRadius: 7, padding: "8px 11px", fontSize: 11, color: "#f87171", lineHeight: 1.55, display: "flex", gap: 7 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
          Only send <strong>USDT via TRC20</strong>. Wrong network = <strong>permanent loss of funds</strong>.
        </div>
      </div>
      <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Also Accepted</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CRYPTO_COINS.map(c => (
            <span key={c} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: T.goldLow, color: T.gold, border: "1px solid rgba(212,168,67,0.25)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ background: T.goldLow, border: "1px solid rgba(212,168,67,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: T.gold, flexShrink: 0 }}>account_balance_wallet</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: T.gold }}>New to Binance?</div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2, lineHeight: 1.4 }}>Create a free account to buy &amp; send crypto in minutes.</div>
        </div>
        <a href="https://www.binance.com/en/register" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 800, padding: "7px 13px", borderRadius: 8, background: T.gold, color: "#0a0f0b", textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          Sign Up <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
        </a>
      </div>
      <button onClick={onNext} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>I've Sent — Submit Proof
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_search</span>
        Reviewed &amp; credited within 1–5 mins
      </div>
    </div>
  );
}

/* ── Binance Proof Form ── */
interface BinanceProofProps {
  error: string;
  txid: string; setTxid: (v: string) => void;
  cryptoAmt: string; setCryptoAmt: (v: string) => void;
  coin: string; setCoin: (v: string) => void;
  cryptoNet: string; setCryptoNet: (v: string) => void;
  expectedGhs: string; setExpectedGhs: (v: string) => void;
  senderAddr: string; setSenderAddr: (v: string) => void;
  userNote: string; setUserNote: (v: string) => void;
  screenshotUrl: string; screenshotPreview: string; screenshotUploading: boolean;
  onScreenshotFile: (file: File) => void; onScreenshotRemove: () => void;
  bErrs: Record<string, string>; setBErrs: (fn: (p: Record<string, string>) => Record<string, string>) => void;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}
function BinanceProof({
  error, txid, setTxid, cryptoAmt, setCryptoAmt, coin, setCoin, cryptoNet, setCryptoNet,
  expectedGhs, setExpectedGhs, senderAddr, setSenderAddr, userNote, setUserNote,
  screenshotUrl, screenshotPreview, screenshotUploading, onScreenshotFile, onScreenshotRemove,
  bErrs, setBErrs, loading, onSubmit, onBack,
}: BinanceProofProps) {
  const fe = (k: string) => bErrs[k] ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bErrs[k]}</div> : null;
  const fi = (k: string): React.CSSProperties => ({ ...inp, border: `1px solid ${bErrs[k] ? "rgba(224,32,32,0.5)" : T.border}` });
  const submitDisabled = loading || screenshotUploading;

  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 9, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: T.gold, lineHeight: 1.55, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>info</span>
        Minimum deposit: <strong>GH₵{MIN_DEPOSIT_GHS}</strong>. Submissions below this will be rejected.
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Transaction Hash (TXID) <span style={{ color: T.red }}>*</span></label>
        <input type="text" value={txid}
          onChange={e => { setTxid(e.target.value); setBErrs(p => ({ ...p, txid: "" })); }}
          placeholder="Paste blockchain TXID" style={fi("txid")} />
        {fe("txid")}
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>Find in your Binance withdrawal history. Must be 10–128 characters.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Coin <span style={{ color: T.red }}>*</span></label>
          <select value={coin} onChange={e => setCoin(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
            {CRYPTO_COINS.map(c => <option key={c} style={{ background: "#141414" }}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Network <span style={{ color: T.red }}>*</span></label>
          <select value={cryptoNet} onChange={e => setCryptoNet(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
            {CRYPTO_NETWORKS.map(n => <option key={n} style={{ background: "#141414" }}>{n}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Amount Sent ({coin}) <span style={{ color: T.red }}>*</span></label>
          <input type="number" value={cryptoAmt} placeholder="0.00" min="0" step="any"
            onChange={e => { setCryptoAmt(e.target.value); setBErrs(p => ({ ...p, cryptoAmt: "" })); }} style={fi("cryptoAmt")} />
          {fe("cryptoAmt")}
        </div>
        <div>
          <label style={lbl}>Expected GH₵ Credit <span style={{ color: T.red }}>*</span></label>
          <input type="number" value={expectedGhs} placeholder={`Min GH₵${MIN_DEPOSIT_GHS}`} min="0" step="any"
            onChange={e => { setExpectedGhs(e.target.value); setBErrs(p => ({ ...p, expectedGhs: "" })); }} style={fi("expectedGhs")} />
          {fe("expectedGhs")}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Sender Wallet <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <input type="text" value={senderAddr} placeholder="Address you sent from"
          onChange={e => { setSenderAddr(e.target.value); setBErrs(p => ({ ...p, senderAddr: "" })); }} style={fi("senderAddr")} />
        {fe("senderAddr")}
      </div>

      <BinanceScreenshotUploader
        screenshot={screenshotUrl}
        preview={screenshotPreview}
        uploading={screenshotUploading}
        error={bErrs.screenshot}
        onFileChange={onScreenshotFile}
        onRemove={onScreenshotRemove}
      />

      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Note to Admin <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <textarea value={userNote}
          onChange={e => { setUserNote(e.target.value); setBErrs(p => ({ ...p, userNote: "" })); }}
          placeholder="Any extra info" rows={3}
          style={{ ...fi("userNote"), resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
        {fe("userNote")}
      </div>

      <button onClick={onSubmit} disabled={submitDisabled} style={{ ...btnPrimary, opacity: submitDisabled ? 0.38 : 1, marginBottom: 8 }}>
        {loading
          ? <><Spin /> Submitting…</>
          : screenshotUploading
          ? <><Spin /> Uploading screenshot…</>
          : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>Submit Deposit Proof</>}
      </button>
      <button onClick={onBack} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
      </button>
    </div>
  );
}

/* ── Crypto Success Screen ── */
interface CryptoSuccessScreenProps {
  coin: string; cryptoNet: string; cryptoAmt: string; expectedGhs: string;
  txid: string; screenshotUrl: string; depositId?: string; depositStatus?: string;
  onHome: () => void; onReset: () => void;
}
function CryptoSuccessScreen({ coin, cryptoNet, cryptoAmt, expectedGhs, txid, screenshotUrl, depositId, depositStatus, onHome, onReset }: CryptoSuccessScreenProps) {
  const rows: [string, string][] = [
    ["Method",     `Crypto — ${coin} (${cryptoNet})`],
    ["Amount",     `${cryptoAmt || "—"} ${coin}`],
    ["Expected",   `GH₵ ${expectedGhs || "—"}`],
    ["TXID",       txid || "—"],
    ["Screenshot", screenshotUrl ? "Uploaded ✓" : "Not provided"],
    ["Reference",  depositId || "—"],
    ["Date",       new Date().toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })],
    ["Status",     depositStatus || "PENDING — Admin Review"],
    ["Support",    SUPPORT_EMAIL],
  ];
  return (
    <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: T.goldLow, border: "2px solid rgba(212,168,67,0.35)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: T.gold }}>hourglass_top</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 20, color: T.white, marginBottom: 6 }}>Proof Submitted</div>
      <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.65, marginBottom: 18 }}>
        Your crypto deposit is under review.<br />
        Admin will credit your ChampionBet wallet within <strong style={{ color: T.white }}>1–5 minutes</strong>.
      </div>
      <div style={{ background: T.goldLow, border: `1px solid ${T.goldMid}`, borderRadius: 12, padding: "14px 16px", marginBottom: 18, textAlign: "left" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
            <span style={{ color: T.dim, fontSize: 12, flexShrink: 0 }}>{k}</span>
            <span style={{ color: k === "Screenshot" && screenshotUrl ? T.green : T.white, fontSize: 12, fontWeight: 700, textAlign: "right", wordBreak: "break-all", maxWidth: "62%" }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => window.print()} style={{ ...btnGhost, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>Print / Save Receipt
      </button>
      <button onClick={onHome} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>Back to Home
      </button>
      <button onClick={onReset} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>Make Another Deposit
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BANK NG (Paga)
══════════════════════════════════════════════════════════════════════════════ */

/* ── Bank NG Info ── */
interface BankNgInfoProps { error: string; onNext: () => void; }
function BankNgInfo({ error, onNext }: BankNgInfoProps) {
  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: T.greenLow, border: `1px solid ${T.greenMid}`, borderRadius: 9, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: T.green, lineHeight: 1.55, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>info</span>
        Minimum deposit: <strong>₦{MIN_DEPOSIT_NGN.toLocaleString()}</strong>
      </div>
      <div style={{ background: T.raised, border: `1px solid ${T.greenMid}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.greenLow, border: `1px solid ${T.greenMid}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: T.green, fontSize: 18 }}>account_balance</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>Transfer to this account</div>
            <div style={{ fontSize: 11, color: T.dim }}>Then submit your payment proof below</div>
          </div>
        </div>
        {[
          { icon: "corporate_fare", label: "Bank Name",      value: BANK_NAME,        mono: false },
          { icon: "person",         label: "Account Name",   value: BANK_ACCT_NAME,   mono: false },
          { icon: "tag",            label: "Account Number", value: BANK_ACCT_NUMBER, mono: true  },
        ].map(row => (
          <div key={row.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "11px 13px", marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{row.icon}</span>{row.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: row.mono ? "'DM Mono', monospace" : "inherit", fontSize: row.mono ? 22 : 13, fontWeight: 700, color: T.white, letterSpacing: row.mono ? 3 : 0 }}>{row.value}</span>
              <CopyBtn text={row.value} />
            </div>
          </div>
        ))}
        <div style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.22)", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: T.gold, lineHeight: 1.6, display: "flex", gap: 7 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
          Always include your <strong>username or phone number</strong> in the transfer narration so we can identify your payment.
        </div>
      </div>
      <button onClick={onNext} style={{ ...btnGreen, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>I've Sent the Money — Submit Proof
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_search</span>
        Verified within 5–10 minutes
      </div>
    </div>
  );
}

/* ── Bank NG Form ── */
interface BankNgFormProps {
  error: string;
  bankRef: string; setBankRef: (v: string) => void;
  bankAmtSent: string; setBankAmtSent: (v: string) => void;
  bankExpected: string; setBankExpected: (v: string) => void;
  bankSender: string; setBankSender: (v: string) => void;
  bankNote: string; setBankNote: (v: string) => void;
  bankScreenshot: string; setBankScreenshot: (v: string) => void;
  bankCompressing: boolean;
  bankErrs: Record<string, string>; setBankErrs: (fn: (p: Record<string, string>) => Record<string, string>) => void;
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onBack: () => void;
}
function BankNgForm({ error, bankRef, setBankRef, bankAmtSent, setBankAmtSent, bankExpected, setBankExpected, bankSender, setBankSender, bankNote, setBankNote, bankScreenshot, setBankScreenshot, bankCompressing, bankErrs, setBankErrs, loading, onFileChange, onSubmit, onBack }: BankNgFormProps) {
  const fe = (k: string) => bankErrs[k]
    ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bankErrs[k]}</div>
    : null;
  const fi = (k: string): React.CSSProperties => ({ ...inp, border: `1px solid ${bankErrs[k] ? "rgba(224,32,32,0.5)" : T.border}` });
  const QUICK_NGN = [67100, 100000, 150000, 200000, 500000, 1000000];

  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Transfer Reference / Narration <span style={{ color: T.red }}>*</span></label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${bankErrs.ref ? "rgba(224,32,32,0.5)" : T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim, padding: "0 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", height: "100%" }}>tag</span>
          <input type="text" value={bankRef}
            onChange={e => { setBankRef(e.target.value); setBankErrs(p => ({ ...p, ref: "" })); }}
            placeholder="Your name, username, or receipt reference"
            style={{ ...inp, border: "none", borderRadius: 0, background: "none" }} />
        </div>
        {fe("ref")}
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Use the exact narration you entered during the transfer.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Amount Sent (₦) <span style={{ color: T.red }}>*</span></label>
          <input type="number" value={bankAmtSent} placeholder={`Min ₦${MIN_DEPOSIT_NGN.toLocaleString()}`}
            onChange={e => { setBankAmtSent(e.target.value); setBankErrs(p => ({ ...p, amt: "" })); }}
            style={fi("amt")} />
          {fe("amt")}
        </div>
        <div>
          <label style={lbl}>Expected ₦ Credit <span style={{ color: T.red }}>*</span></label>
          <input type="number" value={bankExpected} placeholder="0.00"
            onChange={e => { setBankExpected(e.target.value); setBankErrs(p => ({ ...p, exp: "" })); }}
            style={fi("exp")} />
          {fe("exp")}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 }}>Quick fill</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {QUICK_NGN.map(q => (
            <button key={q} onClick={() => { setBankAmtSent(String(q)); setBankExpected(String(q)); setBankErrs(p => ({ ...p, amt: "", exp: "" })); }}
              style={{ background: bankAmtSent === String(q) ? T.redLow : T.faint, border: `1px solid ${bankAmtSent === String(q) ? T.red : T.border}`, borderRadius: 8, padding: "7px 0", color: bankAmtSent === String(q) ? "#4ade80" : T.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit" }}>
              {q >= 1000000 ? `${q / 1000000}M` : q >= 1000 ? `${q / 1000}k` : q}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Sender Account Name <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <input type="text" value={bankSender} placeholder="Name on your bank account"
          onChange={e => setBankSender(e.target.value)} style={inp} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Payment Screenshot <span style={{ color: T.red }}>*</span></label>
        {bankScreenshot ? (
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.greenMid}`, background: "#0a0f0b" }}>
            <img src={bankScreenshot} alt="Payment screenshot" style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block" }} />
            {bankCompressing && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>
            )}
            {!bankCompressing && (
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer", background: "rgba(0,0,0,0.7)", color: T.dim, fontFamily: "inherit" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>upload</span>Change
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
                </label>
                <button onClick={() => setBankScreenshot("")}
                  style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: "none", background: "rgba(224,32,32,0.7)", color: "#fff", fontFamily: "inherit" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>Remove
                </button>
              </div>
            )}
            {!bankCompressing && (
              <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: "rgba(34,197,94,0.85)", color: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check_circle</span>Ready
              </div>
            )}
          </div>
        ) : (
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: 100, border: `2px dashed ${bankErrs.screenshot ? "rgba(224,32,32,0.5)" : T.border}`,
            borderRadius: 10, cursor: bankCompressing ? "wait" : "pointer",
            background: T.faint, transition: "all 0.2s",
          }}>
            {bankCompressing
              ? <><Spin /><span style={{ fontSize: 11, color: T.dim, marginTop: 8 }}>Processing…</span></>
              : <>
                  <span className="material-symbols-outlined" style={{ fontSize: 30, color: T.dim, marginBottom: 6 }}>add_photo_alternate</span>
                  <span style={{ fontSize: 12, color: T.dim, fontWeight: 600 }}>Tap or drag screenshot here</span>
                  <span style={{ fontSize: 10, color: "rgba(245,245,240,0.2)", marginTop: 3 }}>JPG · PNG · WEBP · Max 8 MB</span>
                </>
            }
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
          </label>
        )}
        {fe("screenshot")}
        {!bankErrs.screenshot && !bankScreenshot && (
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Upload a photo of your payment receipt or confirmation screen.</div>
        )}
        {!bankErrs.screenshot && bankScreenshot && (
          <div style={{ fontSize: 11, color: T.green, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
            Screenshot attached — will be sent with your deposit proof
          </div>
        )}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Note to Admin <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <textarea value={bankNote} onChange={e => setBankNote(e.target.value)} placeholder="Any extra info" rows={3}
          style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
      </div>
      <button onClick={onSubmit} disabled={loading || bankCompressing}
        style={{ ...btnGreen, opacity: loading || bankCompressing ? 0.38 : 1, marginBottom: 8 }}>
        {loading ? <><Spin /> Submitting…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>Submit Transfer Proof</>}
      </button>
      <button onClick={onBack} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
      </button>
    </div>
  );
}

/* ── Shared Pending Success (Bank NG) ── */
interface PendingSuccessProps { label: string; mins: string; onHome: () => void; onReset: () => void; }
function PendingSuccess({ label, mins, onHome, onReset }: PendingSuccessProps) {
  return (
    <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: T.greenLow, border: `2px solid ${T.greenMid}` }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: T.green }}>hourglass_top</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 20, color: T.white, marginBottom: 6 }}>Proof Submitted!</div>
      <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.7, marginBottom: 22 }}>
        Your {label} is under review.<br />
        Admin will verify and credit your wallet within <strong style={{ color: T.white }}>{mins}</strong>.
      </div>
      <button onClick={onHome} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>Back to Home
      </button>
      <button onClick={onReset} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>Make Another Deposit
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function DepositPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!t) navigate("/login", { replace: true });
  }, [navigate]);

  const tok = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  /* ── country / gateway ── */
  const [country,     setCountry]     = useState<Country | null>(null);
  const [gateway,     setGateway]     = useState<"paystack" | "binance" | "bank_ng" | null>(null);
  const [ipDetecting, setIpDetecting] = useState(true);
  const [rates,       setRates]       = useState<Record<string, number>>({});

  useEffect(() => {
    const detect = async () => {
      try {
        const res  = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        const code = data?.country_code as string;
        const found = COUNTRIES.find(c => c.code === code);
        if (found) {
          setCountry(found);
          if (found.gateways.length === 1) setGateway(found.gateways[0]);
        }
      } catch { /* silent */ }
      finally { setIpDetecting(false); }
    };
    detect();
  }, []);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/GHS")
      .then(r => r.json()).then(d => { if (d?.rates) setRates(d.rates); }).catch(() => {});
  }, []);

  const rateFor = useCallback((cur: string) => cur === "GHS" ? 1 : (rates[cur] ?? 1), [rates]);

  /* ── shared state ── */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [step,    setStep]    = useState<
    "form"
    | "proof" | "success"                        // crypto
    | "paystack_form" | "paystack_success"        // paystack
    | "bank_info" | "bank_form" | "bank_success"  // nigeria bank
  >("form");

  /* ── paystack state ── */
  const [paystackAmount, setPaystackAmount] = useState("");

  /* ── binance state ── */
  const [txid,        setTxid]        = useState("");
  const [cryptoAmt,   setCryptoAmt]   = useState("");
  const [coin,        setCoin]        = useState(BINANCE_COIN);
  const [cryptoNet,   setCryptoNet]   = useState(BINANCE_NETWORK);
  const [expectedGhs, setExpectedGhs] = useState("");
  const [senderAddr,  setSenderAddr]  = useState("");
  const [userNote,    setUserNote]    = useState("");
  const [bErrs,       setBErrs]       = useState<Record<string, string>>({});

  const [screenshotUrl,       setScreenshotUrl]       = useState("");
  const [screenshotPreview,   setScreenshotPreview]   = useState("");
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [submittedDeposit,    setSubmittedDeposit]    = useState<{ id?: string; status?: string } | null>(null);

  /* ── bank form state ── */
  const [bankRef,         setBankRef]         = useState("");
  const [bankAmtSent,     setBankAmtSent]     = useState("");
  const [bankExpected,    setBankExpected]    = useState("");
  const [bankSender,      setBankSender]      = useState("");
  const [bankNote,        setBankNote]        = useState("");
  const [bankScreenshot,  setBankScreenshot]  = useState("");
  const [bankCompressing, setBankCompressing] = useState(false);
  const [bankErrs,        setBankErrs]        = useState<Record<string, string>>({});

  const post = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data?.message || data?.error || `Server error ${res.status}`);
    return data;
  };

  const handleSelectCountry = useCallback((c: Country) => {
    setCountry(c); setGateway(null); setError(""); setStep("form");
    if (c.gateways.length === 1) {
      const gw = c.gateways[0];
      setGateway(gw);
      if (gw === "paystack") setStep("paystack_form");
      else if (gw === "bank_ng") setStep("bank_info");
    }
  }, []);

  const selectGateway = useCallback((gw: "paystack" | "binance" | "bank_ng") => {
    setGateway(gw); setError("");
    if (gw === "paystack") setStep("paystack_form");
    else if (gw === "bank_ng") setStep("bank_info");
    else setStep("form");
  }, []);

  /* ── Paystack: submit ── */
  const handlePaystackSubmit = async () => {
    const amt = parseFloat(paystackAmount);
    if (!amt || isNaN(amt) || amt < MIN_DEPOSIT_GHS) {
      setError(`Minimum deposit is GH₵${MIN_DEPOSIT_GHS}`);
      return;
    }
    setLoading(true); setError("");
    try {
      const data = await post("/api/wallet/deposit/paystack/init", { amount: amt });
      // Unwrap nested data object (Paystack returns { status, message, data: { authorization_url } })
      const inner = data?.data?.data ?? data?.data ?? data;
      const authUrl: string = inner?.authorization_url || inner?.data?.authorization_url;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("Could not retrieve Paystack payment URL. Please try again.");
      }
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  /* ── Binance: screenshot handlers ── */
  const handleBinanceScreenshotFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setBErrs(p => ({ ...p, screenshot: "Please select an image file." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBErrs(p => ({ ...p, screenshot: "Image must be under 10 MB." }));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setScreenshotPreview(objectUrl);
    setScreenshotUploading(true);
    setBErrs(p => ({ ...p, screenshot: "" }));
    try {
      const url = await uploadToImgBB(file);
      setScreenshotUrl(url);
    } catch (e: unknown) {
      setBErrs(p => ({ ...p, screenshot: e instanceof Error ? e.message : "Upload failed. Try again." }));
      setScreenshotUrl("");
      URL.revokeObjectURL(objectUrl);
      setScreenshotPreview("");
    } finally {
      setScreenshotUploading(false);
    }
  };

  const handleBinanceScreenshotRemove = () => {
    setScreenshotUrl(""); setScreenshotPreview(""); setBErrs(p => ({ ...p, screenshot: "" }));
  };

  /* ── Binance: validation ── */
  const validateBinance = () => {
    const e: Record<string, string> = {};
    const trimmedTxid = txid.trim();
    if (!trimmedTxid || trimmedTxid.length < 10 || trimmedTxid.length > 128) {
      e.txid = "TXID must be between 10 and 128 characters";
    }
    if (!cryptoAmt || isNaN(+cryptoAmt) || +cryptoAmt <= 0) e.cryptoAmt = "Enter the amount you sent";
    if (!expectedGhs || isNaN(+expectedGhs) || +expectedGhs < MIN_DEPOSIT_GHS) {
      e.expectedGhs = `Minimum deposit is GH₵${MIN_DEPOSIT_GHS}. Enter the correct expected credit.`;
    }
    if (senderAddr.trim().length > 256) e.senderAddr = "Sender address is too long (max 256 characters)";
    if (userNote.trim().length > 1000)  e.userNote  = "Note is too long (max 1000 characters)";
    if (screenshotUploading) e.screenshot = "Please wait for the screenshot to finish uploading";
    setBErrs(e); return Object.keys(e).length === 0;
  };

  const handleBinanceSubmit = async () => {
    if (!validateBinance()) return;
    setLoading(true); setError("");
    try {
      const data = await post("/api/wallet/binance-deposits", {
        txid: txid.trim(), cryptoAmount: parseFloat(cryptoAmt), coin, network: cryptoNet,
        expectedGhsAmount: parseFloat(expectedGhs),
        senderAddress: senderAddr.trim() || undefined,
        screenshotUrl: screenshotUrl.trim() || undefined,
        userNote: userNote.trim() || undefined,
      });
      setSubmittedDeposit({ id: data?.data?.id, status: data?.data?.status });
      setStep("success");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  /* ── Screenshot handler (Bank NG) ── */
  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankCompressing(true);
    try {
      const dataUrl = await compressImageToBase64(file);
      setBankScreenshot(dataUrl);
      setBankErrs(p => ({ ...p, screenshot: "" }));
    } catch { setBankErrs(p => ({ ...p, screenshot: "Could not process image. Try another file." })); }
    finally { setBankCompressing(false); }
  };

  /* ── Nigeria bank validation & submit ── */
  const validateBank = () => {
    const e: Record<string, string> = {};
    if (!bankRef.trim() || bankRef.trim().length < 3) e.ref = "Transfer reference / narration is required";
    const amt = parseFloat(bankAmtSent);
    if (!amt || isNaN(amt) || amt <= 0)  e.amt = "Enter the amount you transferred";
    else if (amt < MIN_DEPOSIT_NGN)      e.amt = `Minimum deposit is ₦${MIN_DEPOSIT_NGN.toLocaleString()}`;
    if (!bankExpected || isNaN(+bankExpected) || +bankExpected < 1) e.exp = "Enter expected wallet credit";
    if (!bankScreenshot) e.screenshot = "A payment screenshot is required";
    setBankErrs(e); return Object.keys(e).length === 0;
  };

  const handleBankSubmit = async () => {
    if (!validateBank()) return;
    setLoading(true); setError("");
    try {
      await post("/api/wallet/bank-deposits", {
        transferReference: bankRef.trim(),
        ngnAmountSent:     parseFloat(bankAmtSent),
        expectedNgnCredit: parseFloat(bankExpected),
        senderAccountName: bankSender.trim() || undefined,
        screenshotUrl:     bankScreenshot,
        userNote:          bankNote.trim() || undefined,
      });
      setStep("bank_success");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  /* ── Reset bank state ── */
  const resetBankState = useCallback(() => {
    setBankRef(""); setBankAmtSent(""); setBankExpected(""); setBankSender("");
    setBankNote(""); setBankScreenshot(""); setBankErrs({});
  }, []);

  /* ── Reset binance state ── */
  const resetBinanceState = useCallback(() => {
    setTxid(""); setCryptoAmt(""); setCoin(BINANCE_COIN); setCryptoNet(BINANCE_NETWORK);
    setExpectedGhs(""); setSenderAddr(""); setUserNote(""); setBErrs({});
    setScreenshotUrl(""); setScreenshotPreview(""); setScreenshotUploading(false);
    setSubmittedDeposit(null);
  }, []);

  /* ── Full reset ── */
  const reset = useCallback(() => {
    setCountry(null); setGateway(null); setError("");
    resetBinanceState(); resetBankState();
    setPaystackAmount("");
    setStep("form");
  }, [resetBankState, resetBinanceState]);

  /* ── Panel title ── */
  const panelTitle = () => {
    if (!gateway) return null;
    if (gateway === "paystack") {
      if (step === "paystack_success") return "Payment Successful";
      return "Card / Online Payment";
    }
    if (gateway === "binance") {
      if (step === "proof")   return "Payment Proof";
      if (step === "success") return "Under Review";
      return "Crypto Deposit";
    }
    if (gateway === "bank_ng") {
      if (step === "bank_form")    return "Payment Proof";
      if (step === "bank_success") return "Under Review";
      return "Bank Transfer · NG";
    }
    return null;
  };

  /* ── Panel router ── */
  const renderPanel = () => {
    if (!country || !gateway) return null;

    /* ── Paystack ── */
    if (gateway === "paystack") {
      if (step === "paystack_success") return (
        <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: T.redLow, border: `2px solid ${T.redMid}` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#4ade80" }}>check_circle</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.white, marginBottom: 6 }}>Payment Successful!</div>
          <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.7, marginBottom: 22 }}>
            Your wallet has been credited.<br />Check your balance to confirm.
          </div>
          <button onClick={() => (window.location.href = "/")} style={{ ...btnPrimary, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>Back to Home
          </button>
          <button onClick={reset} style={btnGhost}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>Make Another Deposit
          </button>
        </div>
      );
      return (
        <PaystackForm
          error={error}
          amount={paystackAmount}
          setAmount={setPaystackAmount}
          loading={loading}
          onSubmit={handlePaystackSubmit}
        />
      );
    }

    /* ── Binance ── */
    if (gateway === "binance") {
      if (step === "proof") return (
        <BinanceProof
          error={error}
          txid={txid} setTxid={setTxid}
          cryptoAmt={cryptoAmt} setCryptoAmt={setCryptoAmt}
          coin={coin} setCoin={setCoin}
          cryptoNet={cryptoNet} setCryptoNet={setCryptoNet}
          expectedGhs={expectedGhs} setExpectedGhs={setExpectedGhs}
          senderAddr={senderAddr} setSenderAddr={setSenderAddr}
          userNote={userNote} setUserNote={setUserNote}
          screenshotUrl={screenshotUrl}
          screenshotPreview={screenshotPreview}
          screenshotUploading={screenshotUploading}
          onScreenshotFile={handleBinanceScreenshotFile}
          onScreenshotRemove={handleBinanceScreenshotRemove}
          bErrs={bErrs} setBErrs={setBErrs}
          loading={loading}
          onSubmit={handleBinanceSubmit}
          onBack={() => setStep("form")}
        />
      );
      if (step === "success") return (
        <CryptoSuccessScreen
          coin={coin} cryptoNet={cryptoNet} cryptoAmt={cryptoAmt} expectedGhs={expectedGhs}
          txid={txid} screenshotUrl={screenshotUrl}
          depositId={submittedDeposit?.id} depositStatus={submittedDeposit?.status}
          onHome={() => (window.location.href = "/")} onReset={reset}
        />
      );
      return <BinanceInfo error={error} onNext={() => { resetBinanceState(); setStep("proof"); }} />;
    }

    /* ── Bank NG (Paga) ── */
    if (gateway === "bank_ng") {
      if (step === "bank_form") return (
        <BankNgForm
          error={error}
          bankRef={bankRef} setBankRef={setBankRef}
          bankAmtSent={bankAmtSent} setBankAmtSent={setBankAmtSent}
          bankExpected={bankExpected} setBankExpected={setBankExpected}
          bankSender={bankSender} setBankSender={setBankSender}
          bankNote={bankNote} setBankNote={setBankNote}
          bankScreenshot={bankScreenshot} setBankScreenshot={setBankScreenshot}
          bankCompressing={bankCompressing}
          bankErrs={bankErrs} setBankErrs={setBankErrs}
          loading={loading}
          onFileChange={handleScreenshot}
          onSubmit={handleBankSubmit}
          onBack={() => setStep("bank_info")}
        />
      );
      if (step === "bank_success") return (
        <PendingSuccess label="bank transfer" mins="5–10 minutes" onHome={() => (window.location.href = "/")} onReset={reset} />
      );
      return <BankNgInfo error={error} onNext={() => { resetBankState(); setStep("bank_form"); }} />;
    }

    return null;
  };

  /* ── Root render ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; font-family:'Material Symbols Outlined'; font-style:normal; font-weight:normal; line-height:1; display:inline-block; text-transform:none; letter-spacing:normal; word-wrap:normal; white-space:nowrap; direction:ltr; vertical-align:middle; user-select:none; }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{margin:0;background:#0a0a0a;}
        @keyframes _spin{to{transform:rotate(360deg);}}
        @keyframes _fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input::placeholder,textarea::placeholder{color:rgba(245,245,240,0.2);}
        select option{background:#141414;color:#f5f5f0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
        a:hover{opacity:0.85;}
        button:hover:not(:disabled){opacity:0.88;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px 60px", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Header */}
          <div style={{ marginBottom: 20, animation: "_fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "1.2px" }}>ChampionBet · Secure Deposit</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f5f5f0", letterSpacing: "-0.5px", lineHeight: 1.1 }}>Fund your<br />account</h1>
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(245,245,240,0.38)" }}>
              Min: <span style={{ color: "#f5f5f0", fontWeight: 600 }}>GH₵{MIN_DEPOSIT_GHS}</span>
              {country && country.currency !== "GHS" && rates[country.currency]
                ? <> ≈ <span style={{ color: "#f5f5f0", fontWeight: 600 }}>{country.symbol}{(MIN_DEPOSIT_GHS * rateFor(country.currency)).toFixed(2)}</span> {country.currency}</>
                : " — converted to your currency"
              }
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ animation: "_fadeUp 0.45s ease" }}>
            <TrustBadges />
          </div>

          {/* Main card */}
          <div style={{ background: "#141414", borderRadius: 16, overflow: "visible", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "_fadeUp 0.5s ease" }}>
            <div style={{ padding: "20px 20px 24px" }}>

              <CountryDropdown country={country} ipDetecting={ipDetecting} onSelect={handleSelectCountry} />

              {country && country.gateways.length > 1 && (
                <GatewayTabs country={country} gateway={gateway} onSelect={selectGateway} />
              )}

              {country && gateway && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,245,240,0.38)", textTransform: "uppercase", letterSpacing: "0.7px" }}>{panelTitle()}</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  </div>
                </div>
              )}

              {renderPanel()}

              {country && !gateway && country.gateways.length <= 1 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(245,245,240,0.38)", fontSize: 13 }}>Loading payment options…</div>
              )}

              {!country && (
                <div style={{ textAlign: "center", padding: "28px 0 8px", color: "rgba(245,245,240,0.38)", fontSize: 13, lineHeight: 1.7 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, display: "block", marginBottom: 10, opacity: 0.4 }}>public</span>
                  {ipDetecting ? <><Spin /> &nbsp;Detecting your location…</> : <>Select your country above to see<br />available payment methods.</>}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(245,245,240,0.18)", display: "flex", alignItems: "center", gap: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                256-bit encrypted · ChampionBet
              </span>
              <span style={{ fontSize: 10, color: "rgba(245,245,240,0.14)" }}>Paystack · Bank · Crypto</span>
            </div>
          </div>

          {/* Support */}
          <SupportPanel />

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(245,245,240,0.14)", lineHeight: 1.7, animation: "_fadeUp 0.6s ease" }}>
            By depositing you agree to ChampionBet's<br />
            <a href="/terms" style={{ color: "rgba(245,245,240,0.28)", textDecoration: "underline" }}>Terms of Service</a>
            {" · "}
            <a href="/privacy" style={{ color: "rgba(245,245,240,0.28)", textDecoration: "underline" }}>Privacy Policy</a>
          </div>

        </div>
      </div>
    </>
  );
}
