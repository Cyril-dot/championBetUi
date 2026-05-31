import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://futballbackend-production-2b7e.up.railway.app";
const MIN_DEPOSIT_GHS = 200;

/* ─── Types & Data ─────────────────────────────────────────────────────────── */
interface Country {
  code: string;
  name: string;
  flag: string;
  flagImg: string;
  currency: string;
  symbol: string;
  gateways: ("moolre" | "paystack" | "binance")[];
}

const COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana",         flag: "🇬🇭", flagImg: "https://flagcdn.com/w40/gh.png", currency: "GHS", symbol: "GH₵",  gateways: ["moolre", "binance"] },
  { code: "NG", name: "Nigeria",        flag: "🇳🇬", flagImg: "https://flagcdn.com/w40/ng.png", currency: "NGN", symbol: "₦",    gateways: ["paystack", "binance"] },
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

// ─── NETWORK LOGOS ────────────────────────────────────────────────────────────
// Replace these paths with your own uploaded logo files.
// e.g. if you upload mtn.png → use "/logos/mtn.png" or import it directly.
const MOMO_NETWORKS = [
  {
    id: "MTN",
    label: "MTN MoMo",
    // ↓ Replace with your uploaded MTN logo path
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/29/MTN-Logo.png",
    fallbackBg: "#FFCB00",
    fallbackInitial: "M",
  },
  {
    id: "VODAFONE",
    label: "Telecel Cash",
    // ↓ Replace with your uploaded Telecel logo path
    logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYqBE5Z2TJCiY6TNe5xgJLiOJLgcxnjyddKw&s",
    fallbackBg: "#e30613",
    fallbackInitial: "T",
  },
  {
    id: "AIRTELTIGO",
    label: "AirtelTigo Money",
    // ↓ Replace with your uploaded AirtelTigo logo path
    logo: "https://www.gsma.com/get-involved/gsma-membership/wp-content/uploads/2014/06/AirtelTigo-Logo-White-background.png",
    fallbackBg: "#e2001a",
    fallbackInitial: "AT",
  },
];

const BINANCE_ADDRESS = "TWXJ98mLBTu4MVBRS8ZqtBdvk8D8Frdb6Y";
const CRYPTO_COINS    = ["USDT", "BTC", "ETH", "BNB", "USDC"];
const CRYPTO_NETWORKS = ["TRC20", "BEP20", "ERC20", "Arbitrum", "Optimism"];

/* ─── Small helpers ─────────────────────────────────────────────────────────── */
function FlagImg({ country, size = 24 }: { country: Country; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return <span style={{ fontSize: size * 0.9 }}>{country.flag}</span>;
  return (
    <img
      src={country.flagImg}
      alt={country.name}
      width={size}
      height={size * 0.67}
      onError={() => setErr(true)}
      style={{ borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

// Network logo with fallback coloured initial badge
function NetworkLogo({ network, size = 32 }: { network: typeof MOMO_NETWORKS[0]; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: network.fallbackBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 800, color: "#fff", flexShrink: 0,
        letterSpacing: "-0.5px",
      }}>
        {network.fallbackInitial}
      </div>
    );
  }
  return (
    <img
      src={network.logo}
      alt={network.label}
      width={size}
      height={size}
      onError={() => setErr(true)}
      style={{ borderRadius: 6, objectFit: "contain", background: "#fff", padding: 3, flexShrink: 0 }}
    />
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 6,
        cursor: "pointer", border: "none",
        background: ok ? "rgba(255,255,255,0.12)" : "rgba(220,38,38,0.18)",
        color: ok ? "#fff" : "#ef4444",
        transition: "all 0.2s", fontFamily: "inherit",
      }}
    >
      {/* Google Material Icon */}
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        {ok ? "check_circle" : "content_copy"}
      </span>
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function Spin() {
  return (
    <span style={{
      display: "inline-block", width: 15, height: 15,
      border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
      borderRadius: "50%", animation: "_spin 0.7s linear infinite",
    }} />
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function DepositPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!t) navigate("/login", { replace: true });
  }, [navigate]);

  const tok = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  /* ── state ── */
  const [country,     setCountry]     = useState<Country | null>(null);
  const [gateway,     setGateway]     = useState<"moolre" | "paystack" | "binance" | null>(null);
  const [ipDetecting, setIpDetecting] = useState(true);

  const [rates, setRates] = useState<Record<string, number>>({});

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

  const rateFor    = (cur: string) => cur === "GHS" ? 1 : (rates[cur] ?? 1);
  const minLocal   = (cur: string) => +(MIN_DEPOSIT_GHS * rateFor(cur)).toFixed(2);
  const localToGhs = (amt: number, cur: string) => cur === "GHS" ? amt : amt / rateFor(cur);

  const quickAmts = (cur: string) =>
    [200, 500, 1000, 2000, 5000, 10000, 20000, 50000].map(v => +(v * rateFor(cur)).toFixed(0));

  /* shared */
  const [amount,  setAmount]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [info,    setInfo]    = useState("");
  const [step,    setStep]    = useState<"form" | "approve" | "proof" | "success" | "done">("form");

  /* moolre */
  const [phone,     setPhone]     = useState("");
  const [momoNet,   setMomoNet]   = useState("MTN");
  const [sub,       setSub]       = useState<"wait" | "sms" | "verify">("wait");
  const [extRef,    setExtRef]    = useState("");
  const [countdown, setCountdown] = useState(120);
  const [smsCode,   setSmsCode]   = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* paystack */
  const [psEmail, setPsEmail] = useState("");

  /* binance */
  const [txid,        setTxid]        = useState("");
  const [cryptoAmt,   setCryptoAmt]   = useState("");
  const [coin,        setCoin]        = useState("USDT");
  const [cryptoNet,   setCryptoNet]   = useState("TRC20");
  const [expectedGhs, setExpectedGhs] = useState("");
  const [senderAddr,  setSenderAddr]  = useState("");
  const [userNote,    setUserNote]    = useState("");
  const [bErrs,       setBErrs]       = useState<Record<string, string>>({});

  /* support panel */
  const [supportOpen, setSupportOpen] = useState(false);

  /* countdown */
  useEffect(() => {
    if (step === "approve" && sub === "wait") {
      setCountdown(120);
      timerRef.current = setInterval(() =>
        setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; }), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, sub]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const post = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || "Request failed.");
    return data;
  };

  const handleSelectCountry = (c: Country) => {
    setCountry(c); setGateway(null); setError(""); setAmount(""); setStep("form");
    if (c.gateways.length === 1) setGateway(c.gateways[0]);
  };

  const selectGateway = (gw: "moolre" | "paystack" | "binance") => {
    setGateway(gw); setError(""); setAmount(""); setStep("form");
  };

  /* ── handlers ── */
  const handleMoolreInit = async () => {
    setError("");
    const cur = country!.currency;
    const localAmt = parseFloat(amount);
    const min = minLocal(cur);
    if (!localAmt || localAmt < min) return setError(`Min deposit: ${country!.symbol}${min.toLocaleString()}`);
    if (!/^0\d{9}$/.test(phone.trim())) return setError("Enter a valid 10-digit number starting with 0.");
    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/init", { amount: localToGhs(localAmt, cur), phone: phone.trim(), network: momoNet });
      setExtRef(data?.data?.externalref || "");
      setSub(data?.data?.actionRequired ? "sms" : "wait");
      setStep("approve");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const handleSmsSubmit = async () => {
    setError("");
    if (!smsCode.trim()) return setError("Enter the SMS code.");
    setLoading(true);
    try {
      await post("/api/wallet/deposit/moolre/otp", { externalref: extRef, otp: smsCode.trim() });
      setSmsCode(""); setSub("wait");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(""); setInfo("");
    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/verify", { externalref: extRef });
      const r = data?.data;
      if (r?.credited)            setStep("done");
      else if (r?.txstatus === 0) setInfo("Still pending — approve the prompt then verify again.");
      else if (r?.txstatus === 2) setError("Payment cancelled. Start a new deposit.");
      else                        setInfo(r?.message || "Status unclear. Try again.");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const handlePaystack = async () => {
    setError("");
    const cur = country!.currency;
    const localAmt = parseFloat(amount);
    const min = minLocal(cur);
    if (!localAmt || localAmt < min) return setError(`Min deposit: ${country!.symbol}${min.toLocaleString()}`);
    if (!/\S+@\S+\.\S+/.test(psEmail)) return setError("Valid email required.");
    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/paystack/init", { amount: localToGhs(localAmt, cur), email: psEmail.trim(), currency: cur });
      const url = data?.data?.authorization_url;
      if (url) window.location.href = url;
      else setError("No payment link. Try again.");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const validateBinance = () => {
    const e: Record<string, string> = {};
    if (!txid.trim() || txid.trim().length < 10) e.txid = "Valid TXID required (min 10 chars)";
    if (!cryptoAmt || isNaN(+cryptoAmt) || +cryptoAmt <= 0) e.cryptoAmt = "Enter the amount you sent";
    if (!expectedGhs || isNaN(+expectedGhs) || +expectedGhs < 1) e.expectedGhs = "Enter expected GH₵ credit";
    setBErrs(e); return Object.keys(e).length === 0;
  };

  const handleBinanceSubmit = async () => {
    if (!validateBinance()) return;
    setLoading(true); setError("");
    try {
      await post("/api/wallet/deposit/binance/submit", {
        txid: txid.trim(), cryptoAmount: parseFloat(cryptoAmt), coin, network: cryptoNet,
        expectedGhsAmount: parseFloat(expectedGhs),
        senderAddress: senderAddr.trim() || undefined,
        userNote: userNote.trim() || undefined,
      });
      setStep("success");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setCountry(null); setGateway(null); setAmount(""); setPhone(""); setMomoNet("MTN");
    setError(""); setInfo(""); setExtRef(""); setSmsCode(""); setSub("wait"); setPsEmail("");
    setTxid(""); setCryptoAmt(""); setCoin("USDT"); setCryptoNet("TRC20");
    setExpectedGhs(""); setSenderAddr(""); setUserNote(""); setBErrs({}); setStep("form");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  /* ══════════════════════════════════════════════════════════════
     DESIGN TOKENS
  ══════════════════════════════════════════════════════════════ */
  const T = {
    bg:      "#0a0a0a",
    surface: "#141414",
    raised:  "#1c1c1c",
    border:  "rgba(255,255,255,0.07)",
    red:     "#e02020",
    redLow:  "rgba(224,32,32,0.1)",
    redMid:  "rgba(224,32,32,0.25)",
    gold:    "#d4a843",
    goldLow: "rgba(212,168,67,0.1)",
    green:   "#22c55e",
    greenLow:"rgba(34,197,94,0.1)",
    white:   "#f5f5f0",
    dim:     "rgba(245,245,240,0.38)",
    faint:   "rgba(245,245,240,0.06)",
  };

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

  const ErrBox = ({ msg }: { msg: string }) => (
    <div style={{ background: "rgba(224,32,32,0.08)", border: "1px solid rgba(224,32,32,0.28)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 12, marginBottom: 16, lineHeight: 1.55, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>warning</span>
      {msg}
    </div>
  );

  const InfoBox = ({ msg }: { msg: string }) => (
    <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.dim, fontSize: 12, marginBottom: 16, lineHeight: 1.55, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>info</span>
      {msg}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     AMOUNT FIELD
  ══════════════════════════════════════════════════════════════ */
  const AmountField = () => {
    const cur   = country!.currency;
    const sym   = country!.symbol;
    const min   = minLocal(cur);
    const qa    = quickAmts(cur);
    const local = parseFloat(amount);
    const ghsEq = local > 0 && cur !== "GHS" ? localToGhs(local, cur) : null;
    const rate  = rateFor(cur);

    return (
      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>Amount ({cur})</label>

        {cur !== "GHS" && rate !== 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, background: T.faint, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", width: "fit-content" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: T.gold }}>currency_exchange</span>
            <span style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px" }}>Live Rate</span>
            <span style={{ fontSize: 11, color: T.gold, fontWeight: 700 }}>1 GH₵ = {sym}{rate.toFixed(4)}</span>
            <span style={{ fontSize: 9, color: T.dim }}>· Min: {sym}{min.toLocaleString()}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "stretch", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
          <span style={{ padding: "0 14px", display: "flex", alignItems: "center", color: T.dim, fontSize: 12, fontWeight: 700, borderRight: `1px solid ${T.border}`, background: "rgba(255,255,255,0.03)", flexShrink: 0, letterSpacing: "0.05em" }}>{sym}</span>
          <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.white, fontSize: 22, fontWeight: 700, padding: "11px 14px", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: T.dim }}>Min: {sym}{min.toLocaleString()}{cur !== "GHS" ? ` ≈ GH₵${MIN_DEPOSIT_GHS}` : ""}</span>
          {ghsEq && <span style={{ fontSize: 11, color: "rgba(245,245,240,0.22)" }}>≈ GH₵{ghsEq.toFixed(2)}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {qa.map((q, i) => (
            <button key={i} onClick={() => setAmount(String(q))} style={{
              background: parseFloat(amount) === q ? T.redLow : T.faint,
              border: `1px solid ${parseFloat(amount) === q ? T.red : T.border}`,
              borderRadius: 8, padding: "7px 0",
              color: parseFloat(amount) === q ? "#f87171" : T.dim,
              fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit",
            }}>
              {q >= 1000000 ? `${(q / 1000000).toFixed(1)}M` : q >= 1000 ? `${(q / 1000).toFixed(0)}k` : q}
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     COUNTRY DROPDOWN
  ══════════════════════════════════════════════════════════════ */
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

  const CountryDropdown = () => (
    <div ref={dropRef} style={{ position: "relative", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.red, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>1</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Select your country</span>
        {ipDetecting && (
          <span style={{ fontSize: 10, color: T.dim, display: "flex", alignItems: "center", gap: 4 }}>
            <Spin /> detecting…
          </span>
        )}
        {!ipDetecting && country && (
          <span style={{ fontSize: 10, color: T.green, display: "flex", alignItems: "center", gap: 3 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>my_location</span>
            auto-detected
          </span>
        )}
      </div>
      <button onClick={() => setDropOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        background: T.raised, border: `1px solid ${dropOpen ? T.red : T.border}`,
        borderRadius: 10, padding: "11px 14px", cursor: "pointer", fontFamily: "inherit",
        transition: "border 0.15s",
      }}>
        {country ? (
          <>
            <FlagImg country={country} size={24} />
            <span style={{ flex: 1, textAlign: "left", color: T.white, fontSize: 14, fontWeight: 600 }}>{country.name}</span>
            <span style={{ fontSize: 11, color: T.dim, marginRight: 6 }}>{country.currency}</span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: T.dim, fontSize: 13 }}>Choose a country…</span>
        )}
        <span className="material-symbols-outlined" style={{ color: T.dim, fontSize: 18, transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          expand_more
        </span>
      </button>

      {dropOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.7)", overflow: "hidden",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.dim }}>search</span>
            <input autoFocus type="text" placeholder="Search country or currency…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp, padding: "6px 0", fontSize: 13, marginBottom: 0, background: "none", border: "none", flex: 1 }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.map(c => {
              const hasInstant = c.gateways.includes("moolre") || c.gateways.includes("paystack");
              return (
                <button key={c.code} onClick={() => { handleSelectCountry(c); setDropOpen(false); setSearch(""); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", background: country?.code === c.code ? T.redLow : "none",
                    border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer",
                    fontFamily: "inherit", transition: "background 0.1s",
                  }}>
                  <FlagImg country={c} size={22} />
                  <span style={{ flex: 1, textAlign: "left", color: T.white, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: T.dim, marginRight: 8 }}>{c.currency}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em",
                    background: hasInstant ? T.redLow : T.goldLow,
                    color: hasInstant ? "#f87171" : T.gold,
                    border: `1px solid ${hasInstant ? T.redMid : "rgba(212,168,67,0.3)"}`,
                  }}>
                    {hasInstant ? "INSTANT" : "CRYPTO"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     GATEWAY TABS
  ══════════════════════════════════════════════════════════════ */
  const GatewayTabs = () => {
    if (!country || country.gateways.length <= 1) return null;
    const tabs: { id: "moolre" | "paystack" | "binance"; icon: string; matIcon: string; label: string; sub: string }[] =
      country.code === "GH"
        ? [
            { id: "moolre",  icon: "📲", matIcon: "phone_android", label: "Mobile Money",   sub: "MTN · Telecel · AirtelTigo" },
            { id: "binance", icon: "₿",  matIcon: "currency_bitcoin", label: "Crypto",      sub: "USDT · BTC · ETH · BNB" },
          ]
        : [
            { id: "paystack", icon: "💳", matIcon: "credit_card", label: "Paystack",         sub: "Cards · Bank · USSD · MoMo" },
            { id: "binance",  icon: "₿",  matIcon: "currency_bitcoin", label: "Crypto",      sub: "USDT · BTC · ETH · BNB" },
          ];

    return (
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Payment method</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {tabs.map(t => {
            const active   = gateway === t.id;
            const isCrypto = t.id === "binance";
            return (
              <button key={t.id} onClick={() => selectGateway(t.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                  padding: "13px 14px",
                  background: active ? (isCrypto ? T.goldLow : T.redLow) : T.raised,
                  border: `1.5px solid ${active ? (isCrypto ? "rgba(212,168,67,0.5)" : T.red) : T.border}`,
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: active ? (isCrypto ? T.gold : "#f87171") : T.dim }}>
                  {t.matIcon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{t.label}</span>
                <span style={{ fontSize: 10, color: T.dim, lineHeight: 1.4 }}>{t.sub}</span>
                {active && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: isCrypto ? T.gold : "#f87171", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check_circle</span>
                    SELECTED
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     TRUST BADGES
  ══════════════════════════════════════════════════════════════ */
  const TrustBadges = () => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Trusted Payment Partners</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "Moolre",   matIcon: "phone_android", desc: "MoMo" },
          { label: "Paystack", matIcon: "credit_card",   desc: "Cards & Bank" },
          { label: "Binance",  matIcon: "currency_bitcoin", desc: "Crypto" },
        ].map(b => (
          <div key={b.label} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: T.faint, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 10px",
          }}>
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

  /* ══════════════════════════════════════════════════════════════
     MOOLRE PANEL
  ══════════════════════════════════════════════════════════════ */
  const MoolreForm = () => (
    <div>
      {error && <ErrBox msg={error} />}
      <AmountField />
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>MoMo Phone Number</label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim, padding: "0 12px", borderRight: `1px solid ${T.border}`, height: "100%", display: "flex", alignItems: "center" }}>phone</span>
          <input type="tel" placeholder="0244123456" value={phone} maxLength={10}
            onChange={e => setPhone(e.target.value)}
            style={{ ...inp, border: "none", borderRadius: 0, background: "none" }} />
        </div>
        <div style={{ fontSize: 11, color: T.dim, marginTop: 5 }}>10 digits starting with 0</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Network</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {MOMO_NETWORKS.map(n => (
            <button key={n.id} onClick={() => setMomoNet(n.id)} style={{
              display: "flex", alignItems: "center", gap: 11,
              background: momoNet === n.id ? T.redLow : T.raised,
              border: `1px solid ${momoNet === n.id ? T.red : T.border}`,
              borderRadius: 9, padding: "10px 13px", cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit",
            }}>
              <NetworkLogo network={n} size={30} />
              <span style={{ color: momoNet === n.id ? "#f87171" : T.dim, fontSize: 13, fontWeight: 600, flex: 1, textAlign: "left" }}>{n.label}</span>
              {momoNet === n.id && (
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#f87171" }}>check_circle</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 13px", marginBottom: 18, fontSize: 12, color: T.dim, lineHeight: 1.55, display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>smartphone</span>
        A USSD prompt will be sent to your phone. Approve it within 2 mins.
      </div>
      <button onClick={handleMoolreInit} disabled={loading || !amount || !phone}
        style={{ ...btnPrimary, opacity: loading || !amount || !phone ? 0.38 : 1, marginBottom: 8 }}>
        {loading
          ? <><Spin /> Initiating…</>
          : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send_to_mobile</span>Send MoMo Prompt · GH₵{parseFloat(amount) || "0.00"}</>
        }
      </button>
    </div>
  );

  const MoolreApprove = () => (
    <div>
      {error && <ErrBox msg={error} />}
      {sub === "sms" && (
        <>
          <div style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.22)", borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: T.gold, display: "block", marginBottom: 8 }}>sms</span>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.gold, marginBottom: 5 }}>Check your SMS</div>
            <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.6 }}>MTN sent a code to <strong style={{ color: T.white }}>{phone}</strong>. Enter it below.</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>SMS Code</label>
            <input type="text" inputMode="numeric" placeholder="······" value={smsCode} maxLength={8} autoFocus
              onChange={e => setSmsCode(e.target.value.replace(/\D/g, ""))}
              style={{ ...inp, fontSize: 24, fontWeight: 700, letterSpacing: 10, textAlign: "center", border: `1.5px solid ${T.red}` }} />
          </div>
          <button onClick={handleSmsSubmit} disabled={loading || smsCode.length < 4}
            style={{ ...btnPrimary, opacity: loading || smsCode.length < 4 ? 0.38 : 1, marginBottom: 8 }}>
            {loading ? <><Spin /> Verifying…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>Submit Code</>}
          </button>
          <button onClick={() => { setSub("wait"); setError(""); setStep("form"); }} style={btnGhost}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Start Over
          </button>
        </>
      )}
      {sub === "wait" && (
        <>
          <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18, marginBottom: 14, textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: T.dim, display: "block", marginBottom: 8 }}>vibration</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.white, marginBottom: 5 }}>Check your phone</div>
            <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.65 }}>
              USSD prompt sent to <strong style={{ color: T.white }}>{phone}</strong>.<br />
              Approve <strong style={{ color: "#f87171" }}>GH₵{parseFloat(amount).toFixed(2)}</strong>.
            </div>
            {countdown > 0
              ? <div style={{ marginTop: 10, fontSize: 12, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                  Expires in <strong style={{ color: T.white }}>{fmt(countdown)}</strong>
                </div>
              : <div style={{ marginTop: 10, fontSize: 12, color: "#f87171" }}>May have expired — verify below</div>
            }
          </div>
          <button onClick={() => { setSub("verify"); setError(""); setInfo(""); }} style={{ ...btnPrimary, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>I've Approved — Verify
          </button>
          <button onClick={() => { setStep("form"); setError(""); }} style={btnGhost}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Start Over
          </button>
        </>
      )}
      {sub === "verify" && (
        <>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: T.dim, display: "block", marginBottom: 8 }}>manage_search</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.white, marginBottom: 4 }}>Verify Payment</div>
            <div style={{ fontSize: 12, color: T.dim }}>Checking GH₵{parseFloat(amount).toFixed(2)}</div>
          </div>
          {info && <InfoBox msg={info} />}
          <button onClick={handleVerify} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.38 : 1, marginBottom: 8 }}>
            {loading ? <><Spin /> Verifying…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>search_check</span>Verify Payment</>}
          </button>
          <button onClick={() => { setSub("wait"); setError(""); setInfo(""); }} style={{ ...btnGhost, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>hourglass_empty</span>Still Waiting
          </button>
          <button onClick={() => { setStep("form"); setError(""); }} style={{ ...btnGhost, border: "none", color: "rgba(245,245,240,0.18)" }}>
            Start Over
          </button>
        </>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     PAYSTACK PANEL
  ══════════════════════════════════════════════════════════════ */
  const PaystackForm = () => (
    <div>
      {error && <ErrBox msg={error} />}
      <AmountField />
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Email Address</label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim, padding: "0 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", alignSelf: "stretch" }}>mail</span>
          <input type="email" placeholder="your@email.com" value={psEmail} onChange={e => setPsEmail(e.target.value)}
            style={{ ...inp, border: "none", borderRadius: 0, background: "none" }} />
        </div>
        <div style={{ fontSize: 11, color: T.dim, marginTop: 5 }}>Required by Paystack</div>
      </div>
      <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 13px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: T.dim, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Accepted</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { icon: "credit_card", label: "Card" },
            { icon: "account_balance", label: "Bank" },
            { icon: "dialpad", label: "USSD" },
            { icon: "phone_android", label: "MoMo" },
          ].map(m => (
            <span key={m.label} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: T.redLow, color: "#f87171", border: `1px solid ${T.redMid}`, display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{m.icon}</span>{m.label}
            </span>
          ))}
        </div>
      </div>
      <button onClick={handlePaystack} disabled={loading || !amount || !psEmail}
        style={{ ...btnPrimary, opacity: loading || !amount || !psEmail ? 0.38 : 1, marginBottom: 8 }}>
        {loading
          ? <><Spin /> Redirecting…</>
          : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>Pay {country!.symbol}{parseFloat(amount) || "0.00"} via Paystack</>
        }
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     BINANCE PANELS
  ══════════════════════════════════════════════════════════════ */
  const BinanceInfo = () => (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 18 }}>currency_bitcoin</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>Send USDT to this address</div>
            <div style={{ fontSize: 11, color: T.dim }}>Network: <strong style={{ color: "#f87171" }}>TRC20 (TRON)</strong></div>
          </div>
        </div>
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Wallet Address</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.white, wordBreak: "break-all", lineHeight: 1.7, marginBottom: 10 }}>{BINANCE_ADDRESS}</div>
          <CopyBtn text={BINANCE_ADDRESS} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[["Network", "TRC20"], ["Coin", "USDT"], ["Min.", "≈ GH₵200"]].map(([l, v]) => (
            <div key={l} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 5px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(224,32,32,0.07)", border: `1px solid ${T.redMid}`, borderRadius: 7, padding: "8px 11px", fontSize: 11, color: "#f87171", lineHeight: 1.55, display: "flex", gap: 7 }}>
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
          style={{ fontSize: 11, fontWeight: 800, padding: "7px 13px", borderRadius: 8, background: T.gold, color: "#0a0a0a", textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          Sign Up <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
        </a>
      </div>
      <button onClick={() => setStep("proof")} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>I've Sent — Submit Proof
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_search</span>
        Reviewed &amp; credited within 1–5 mins
      </div>
    </div>
  );

  const BinanceProof = () => {
    const fe = (k: string) => bErrs[k] ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bErrs[k]}</div> : null;
    const fi = (k: string): React.CSSProperties => ({ ...inp, border: `1px solid ${bErrs[k] ? "rgba(224,32,32,0.5)" : T.border}` });
    return (
      <div>
        {error && <ErrBox msg={error} />}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Transaction Hash (TXID) <span style={{ color: T.red }}>*</span></label>
          <input type="text" value={txid} onChange={e => { setTxid(e.target.value); setBErrs(p => ({ ...p, txid: "" })); }}
            placeholder="Paste blockchain TXID" style={fi("txid")} />
          {fe("txid")}
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>
            Find in your Binance withdrawal history.
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
            <input type="number" value={expectedGhs} placeholder="0.00" min="0" step="any"
              onChange={e => { setExpectedGhs(e.target.value); setBErrs(p => ({ ...p, expectedGhs: "" })); }} style={fi("expectedGhs")} />
            {fe("expectedGhs")}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Sender Wallet <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
          <input type="text" value={senderAddr} placeholder="Address you sent from" onChange={e => setSenderAddr(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>Note to Admin <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
          <textarea value={userNote} onChange={e => setUserNote(e.target.value)} placeholder="Any extra info" rows={3}
            style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
        </div>
        <button onClick={handleBinanceSubmit} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.38 : 1, marginBottom: 8 }}>
          {loading ? <><Spin /> Submitting…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>Submit Deposit Proof</>}
        </button>
        <button onClick={() => setStep("form")} style={btnGhost}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
        </button>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     SUCCESS / DONE SCREENS
  ══════════════════════════════════════════════════════════════ */
  const SuccessScreen = ({ type }: { type: "momo" | "crypto" }) => (
    <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: type === "momo" ? "rgba(34,197,94,0.12)" : T.goldLow,
        border: `2px solid ${type === "momo" ? "rgba(34,197,94,0.35)" : "rgba(212,168,67,0.35)"}`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: type === "momo" ? "#4ade80" : T.gold }}>
          {type === "momo" ? "check_circle" : "hourglass_top"}
        </span>
      </div>
      {type === "momo" ? (
        <>
          <div style={{ fontWeight: 800, fontSize: 26, color: "#4ade80", marginBottom: 4 }}>GH₵{parseFloat(amount).toFixed(2)}</div>
          <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>Added to your Bet 360 wallet</div>
          <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18, textAlign: "left" }}>
            {[
              ["Amount", `GH₵ ${parseFloat(amount).toFixed(2)}`],
              ["Network", MOMO_NETWORKS.find(n => n.id === momoNet)?.label ?? momoNet],
              ["Phone", phone],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.dim, fontSize: 12 }}>{k}</span>
                <span style={{ color: T.white, fontSize: 12, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.white, marginBottom: 6 }}>Proof Submitted</div>
          <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.65, marginBottom: 20 }}>
            Your crypto deposit is under review.<br />
            Admin will credit your Bet 360 wallet within <strong style={{ color: T.white }}>1–5 minutes</strong>.
          </div>
        </>
      )}
      <button onClick={() => window.location.href = "/"} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>Back to Home
      </button>
      <button onClick={reset} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>Make Another Deposit
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     SUPPORT PANEL
  ══════════════════════════════════════════════════════════════ */
  const SupportPanel = () => (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
      overflow: "hidden", marginTop: 16, animation: "_fadeUp 0.3s ease",
    }}>
      <button
        onClick={() => setSupportOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "14px 20px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.green }}>support_agent</span>
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Need help? Contact Support</div>
          <div style={{ fontSize: 11, color: T.dim }}>We're online 24/7 — response in under 5 mins</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: T.dim, fontSize: 18, transform: supportOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          expand_more
        </span>
      </button>

      {supportOpen && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { matIcon: "chat",        label: "Live Chat",     desc: "Chat with us on WhatsApp",  href: "https://wa.me/233000000000", color: "#25D366" },
              { matIcon: "mail",        label: "Email Support", desc: "support@bet360.com",         href: "mailto:support@bet360.com",  color: "#60a5fa" },
              { matIcon: "send",        label: "Telegram",      desc: "@Bet360Support",             href: "https://t.me/Bet360Support",  color: "#2AABEE" },
            ].map(ch => (
              <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", gap: 12,
                background: T.raised, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "11px 13px", textDecoration: "none",
                transition: "border 0.15s",
              }}>
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
            <span>
              <strong style={{ color: T.white }}>Support hours:</strong> 24 hours, 7 days a week.<br />
              For deposit issues, have your <strong style={{ color: T.white }}>TXID / phone number</strong> ready.
            </span>
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     PANEL ROUTER
  ══════════════════════════════════════════════════════════════ */
  const renderPanel = () => {
    if (!country || !gateway) return null;
    if (gateway === "moolre") {
      if (step === "approve") return <MoolreApprove />;
      if (step === "done")    return <SuccessScreen type="momo" />;
      return <MoolreForm />;
    }
    if (gateway === "paystack") return <PaystackForm />;
    if (gateway === "binance") {
      if (step === "proof")   return <BinanceProof />;
      if (step === "success") return <SuccessScreen type="crypto" />;
      return <BinanceInfo />;
    }
    return null;
  };

  const panelTitle = () => {
    if (!gateway) return null;
    if (gateway === "moolre") {
      if (step === "approve") return "Approve Payment";
      if (step === "done")    return "Deposit Successful";
      return "Mobile Money";
    }
    if (gateway === "paystack") return "Pay with Paystack";
    if (gateway === "binance") {
      if (step === "proof")   return "Payment Proof";
      if (step === "success") return "Under Review";
      return "Crypto Deposit";
    }
    return null;
  };

  /* ══════════════════════════════════════════════════════════════
     ROOT RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          font-family: 'Material Symbols Outlined';
          font-style: normal;
          font-weight: normal;
          line-height: 1;
          display: inline-block;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
          vertical-align: middle;
          user-select: none;
        }

        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        body { margin:0; background:#0a0a0a; }
        @keyframes _spin { to { transform: rotate(360deg); } }
        @keyframes _fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
        input::placeholder, textarea::placeholder { color:rgba(245,245,240,0.2); }
        select option { background:#141414; color:#f5f5f0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        a:hover { opacity:0.85; }
        button:hover:not(:disabled) { opacity:0.88; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px 60px", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 20, animation: "_fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e02020" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#e02020", textTransform: "uppercase", letterSpacing: "1.2px" }}>Bet 360 · Secure Deposit</span>
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

          {/* ── Trust badges ── */}
          <div style={{ animation: "_fadeUp 0.45s ease" }}>
            <TrustBadges />
          </div>

          {/* ── Main card ── */}
          <div style={{
            background: "#141414", borderRadius: 16, overflow: "visible",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            animation: "_fadeUp 0.5s ease",
          }}>
            <div style={{ padding: "20px 20px 24px" }}>
              <CountryDropdown />

              {country && country.gateways.length > 1 && <GatewayTabs />}

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
                  {ipDetecting
                    ? <><Spin /> &nbsp;Detecting your location…</>
                    : <>Select your country above to see<br />available payment methods.</>
                  }
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(245,245,240,0.18)", display: "flex", alignItems: "center", gap: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                256-bit encrypted · Bet 360
              </span>
              <span style={{ fontSize: 10, color: "rgba(245,245,240,0.14)" }}>Moolre · Paystack · Binance</span>
            </div>
          </div>

          {/* ── Support section ── */}
          <SupportPanel />

          {/* ── Footer note ── */}
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(245,245,240,0.14)", lineHeight: 1.7, animation: "_fadeUp 0.6s ease" }}>
            By depositing you agree to Bet 360's<br />
            <a href="/terms" style={{ color: "rgba(245,245,240,0.28)", textDecoration: "underline" }}>Terms of Service</a>
            {" · "}
            <a href="/privacy" style={{ color: "rgba(245,245,240,0.28)", textDecoration: "underline" }}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </>
  );
}