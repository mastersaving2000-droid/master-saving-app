"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

// --- TELEGRAM CONFIG ---
const TELEGRAM_BOT_TOKEN = "8487855373:AAEZ8Al7Su6BzqCECCuF7iRgULk1bBS7Ly0"; 
const TELEGRAM_CHAT_ID = "788284460"; 

// --- FALLBACK DATA (Jika API Error/Limit) ---
const FALLBACK_CRYPTO = [
  { pair: "BTC", price: 1520000000, change: 2.5 },
  { pair: "ETH", price: 42000000, change: -1.2 },
  { pair: "SOL", price: 2300000, change: 5.4 },
  { pair: "BNB", price: 9000000, change: 0.5 },
  { pair: "XRP", price: 9200, change: 1.1 },
];

const FALLBACK_FOREX = [
  { pair: "USD", price: 15850, change: 0.1 },
  { pair: "SGD", price: 11800, change: 0.2 },
  { pair: "EUR", price: 17100, change: -0.3 },
  { pair: "MYR", price: 3400, change: 0.0 },
  { pair: "CNY", price: 2200, change: -0.1 },
];

interface UserData {
  profile: { nama: string; hp: string; bank_name?: string; rek_number?: string; rek_name?: string; };
  finance: { saldo_utama: number; last_profit_calc: string; };
  network: { my_referral_code: string; };
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveSaldo, setLiveSaldo] = useState<number>(0);
  
  // Data Market Real
  const [cryptoData, setCryptoData] = useState<any[]>(FALLBACK_CRYPTO);
  const [forexData, setForexData] = useState<any[]>(FALLBACK_FOREX);

  // State Modal & Form
  const [activeModal, setActiveModal] = useState<"WD" | "NETWORK" | "DEPOSIT_PAYMENT" | null>(null);
  const [wdAmount, setWdAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Deposit
  const [depoAmount, setDepoAmount] = useState("");
  const [uniqueCode, setUniqueCode] = useState(0);
  const [proofFile, setProofFile] = useState<File | null>(null);

  // State Network
  const [downlines, setDownlines] = useState<{lvl1: string[], lvl2: string[], lvl3: string[]}>({ lvl1: [], lvl2: [], lvl3: [] });

  // 1. FETCH REAL MARKET DATA (NEW FEATURE)
  useEffect(() => {
    const fetchMarketData = async () => {
        try {
            // A. Fetch Crypto (CoinGecko Free API)
            const resCrypto = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple&vs_currencies=idr&include_24hr_change=true");
            const dataCrypto = await resCrypto.json();
            
            if(dataCrypto.bitcoin) {
                setCryptoData([
                    { pair: "BTC", price: dataCrypto.bitcoin.idr, change: dataCrypto.bitcoin.idr_24h_change },
                    { pair: "ETH", price: dataCrypto.ethereum.idr, change: dataCrypto.ethereum.idr_24h_change },
                    { pair: "SOL", price: dataCrypto.solana.idr, change: dataCrypto.solana.idr_24h_change },
                    { pair: "BNB", price: dataCrypto.binancecoin.idr, change: dataCrypto.binancecoin.idr_24h_change },
                    { pair: "XRP", price: dataCrypto.ripple.idr, change: dataCrypto.ripple.idr_24h_change },
                ]);
            }

            // B. Fetch Forex (Open Exchange Rates Free)
            const resForex = await fetch("https://open.er-api.com/v6/latest/USD");
            const dataForex = await resForex.json();
            
            if(dataForex.rates) {
                const IDR = dataForex.rates.IDR;
                setForexData([
                    { pair: "USD", price: IDR, change: 0.15 }, // Change dummy karena API free jarang kasih % change
                    { pair: "SGD", price: IDR / dataForex.rates.SGD, change: 0.1 },
                    { pair: "EUR", price: IDR / dataForex.rates.EUR, change: -0.2 },
                    { pair: "MYR", price: IDR / dataForex.rates.MYR, change: 0.05 },
                    { pair: "JPY", price: IDR / dataForex.rates.JPY, change: -0.1 },
                ]);
            }

        } catch (e) {
            console.log("Gagal fetch market data, pakai fallback.");
        }
    };
    
    fetchMarketData();
  }, []);

  // 2. LISTENER REALTIME
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { router.push("/login"); return; }
      const docRef = doc(db, "users", currentUser.uid);
      const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);
          const now = new Date().getTime();
          const lastUpdate = data.finance.last_profit_calc ? new Date(data.finance.last_profit_calc).getTime() : now;
          const diffSeconds = Math.max(0, (now - lastUpdate) / 1000);
          const profitPerSec = (data.finance.saldo_utama * 0.025) / 604800;
          setLiveSaldo(data.finance.saldo_utama + (profitPerSec * diffSeconds));
        }
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [router]);

  // 3. MINING EFFECT
  useEffect(() => {
    if (!userData || userData.finance.saldo_utama <= 0) return;
    const profitPerSec = (userData.finance.saldo_utama * 0.025) / 604800;
    const interval = setInterval(() => { setLiveSaldo(prev => prev + (profitPerSec / 10)); }, 100);
    return () => clearInterval(interval);
  }, [userData]);

  // 4. CODE GENERATOR
  useEffect(() => {
    if (depoAmount && parseInt(depoAmount) >= 10000) { setUniqueCode(Math.floor(Math.random() * 899) + 100); } 
    else { setUniqueCode(0); }
  }, [depoAmount]);

  // --- ACTIONS ---
  const openDepositModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(depoAmount) < 10000 || !depoAmount) { alert("Minimal Rp 10.000"); return; }
    setActiveModal("DEPOSIT_PAYMENT");
  }

  const handleDepositSubmit = async () => {
    if (!userData) return;
    if (!proofFile) { alert("Upload Bukti!"); return; }
    setIsSubmitting(true);
    const amount = parseInt(depoAmount);
    try {
      const totalTransfer = amount + uniqueCode;
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("photo", proofFile);
      formData.append("caption", `🔥 DEPOSIT BARU\nUser: ${userData.profile.nama}\nTotal: Rp ${totalTransfer.toLocaleString()}`);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData }).catch(()=>null);
      await addDoc(collection(db, "deposits"), {
        user_uid: auth.currentUser?.uid, user_nama: userData.profile.nama, amount_base: amount, unique_code: uniqueCode, total_transfer: totalTransfer, status: "pending", created_at: new Date().toISOString(),
      });
      alert("Terkirim! Tunggu Admin."); setDepoAmount(""); setProofFile(null); setActiveModal(null);
    } catch (err) { alert("Gagal."); } finally { setIsSubmitting(false); }
  };

  const handleWithdraw = async () => {
    if (!userData) return;
    const amount = parseInt(wdAmount);
    if (amount > liveSaldo) { alert("Saldo Kurang!"); return; }
    if (amount < 50000) { alert("Min WD 50.000"); return; }
    const bankInfo = userData.profile.bank_name ? `${userData.profile.bank_name} - ${userData.profile.rek_number} a.n ${userData.profile.rek_name}` : userData.profile.hp; 
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "withdrawals"), {
        user_uid: auth.currentUser?.uid,
        user_nama: userData.profile.nama,
        amount: amount,
        ewallet: bankInfo, 
        status: "pending",
        created_at: new Date().toISOString(),
      });
      alert("Request WD Terkirim!"); setActiveModal(null); setWdAmount("");
    } catch (err) { alert("Gagal WD."); } finally { setIsSubmitting(false); }
  };

  const loadNetwork = async () => {
    setActiveModal("NETWORK");
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [snap1, snap2, snap3] = await Promise.all([
        getDocs(query(collection(db, "users"), where("network.upline_1", "==", uid))),
        getDocs(query(collection(db, "users"), where("network.upline_2", "==", uid))),
        getDocs(query(collection(db, "users"), where("network.upline_3", "==", uid)))
      ]);
      setDownlines({ lvl1: snap1.docs.map(d => d.data().network.my_referral_code), lvl2: snap2.docs.map(d => d.data().network.my_referral_code), lvl3: snap3.docs.map(d => d.data().network.my_referral_code), });
    } catch (err) { console.error(err); }
  };

  const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const formatLive = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2 }).format(n);
  const formatSmallIDR = (n: number) => new Intl.NumberFormat("id-ID").format(Math.floor(n));

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse">CONNECTING...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 font-sans">
      {/* KEYFRAMES FOR VERTICAL SCROLL */}
      <style jsx global>{`
        @keyframes scrollUp { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
        .animate-vertical { animation: scrollUp 15s linear infinite; }
      `}</style>

      <nav className="fixed top-0 w-full z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center justify-between">
        <span className="font-bold tracking-wider text-yellow-500">MASTER SAVING</span>
        <div className="flex gap-2">
            <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">👤</button>
            <button onClick={() => confirm("Logout?") && signOut(auth)} className="text-xs text-red-500 border border-red-900 px-3 py-1 rounded-full">EXIT</button>
        </div>
      </nav>

      <main className="max-w-md mx-auto pt-20 px-4 space-y-6">
        
        {/* ASSETS CARD */}
        <div className="bg-[#111] rounded-xl p-6 border border-white/10 relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 p-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div></div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Assets</p>
          <h1 className="text-3xl font-bold text-white tabular-nums">{formatLive(liveSaldo)}</h1>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-gray-500">
             <span>Profit: <span className="text-green-400">+2.5% / Week</span></span>
             <span>Base: {formatIDR(userData?.finance.saldo_utama || 0)}</span>
          </div>
        </div>

        {/* --- PAPAN BURSA REALTIME (VERTIKAL SPLIT) --- */}
        <div className="grid grid-cols-2 gap-3 h-40">
            
            {/* KOLOM KIRI: VALUTA ASING (FOREX) */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-lg overflow-hidden relative">
                <div className="bg-[#151515] p-2 text-[9px] text-gray-500 font-bold text-center border-b border-white/5 uppercase tracking-wider">
                    KURS IDR (LIVE)
                </div>
                <div className="h-full overflow-hidden relative">
                    <div className="animate-vertical absolute w-full px-3">
                        {/* Data Diduplikasi agar looping mulus */}
                        {[...forexData, ...forexData].map((m, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                                <div>
                                    <div className="text-[10px] font-bold text-white">{m.pair}/IDR</div>
                                    <div className="text-[9px] text-gray-500">Forex</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-mono text-yellow-500">{formatSmallIDR(m.price)}</div>
                                    <div className={`text-[9px] ${m.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* KOLOM KANAN: CRYPTO MARKET */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-lg overflow-hidden relative">
                <div className="bg-[#151515] p-2 text-[9px] text-gray-500 font-bold text-center border-b border-white/5 uppercase tracking-wider">
                    CRYPTO MARKET
                </div>
                <div className="h-full overflow-hidden relative">
                    <div className="animate-vertical absolute w-full px-3">
                        {[...cryptoData, ...cryptoData].map((m, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                                <div>
                                    <div className="text-[10px] font-bold text-white">{m.pair}</div>
                                    <div className="text-[9px] text-gray-500">IDR</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-mono text-blue-400">{formatSmallIDR(m.price)}</div>
                                    <div className={`text-[9px] ${m.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {m.change >= 0 ? '+' : ''}{m.change.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
        {/* ---------------------------------------------- */}

        {/* MENU GRID */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => setActiveModal("WD")} className="bg-[#111] p-2 rounded-xl border border-white/5 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
            <div className="text-blue-400 font-bold text-lg">↓</div><p className="text-[9px] text-gray-400">WD</p>
          </button>
          <button onClick={() => router.push("/history")} className="bg-[#111] p-2 rounded-xl border border-white/5 hover:border-yellow-500/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
            <div className="text-yellow-500 font-bold text-lg">🕒</div><p className="text-[9px] text-gray-400">Riwayat</p>
          </button>
          <button onClick={loadNetwork} className="bg-[#111] p-2 rounded-xl border border-white/5 hover:border-purple-500/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
            <div className="text-purple-400 font-bold text-lg">∞</div><p className="text-[9px] text-gray-400">Tim</p>
          </button>
          <button onClick={() => router.push("/profile")} className="bg-[#111] p-2 rounded-xl border border-white/5 hover:border-green-500/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
            <div className="text-green-400 font-bold text-lg">⚙</div><p className="text-[9px] text-gray-400">Akun</p>
          </button>
        </div>

        {/* DEPOSIT FORM */}
        <div className="bg-[#111] rounded-xl p-5 border border-yellow-600/30">
          <h2 className="text-sm font-bold text-yellow-500 mb-4">⚡ INSTANT DEPOSIT</h2>
          <form onSubmit={openDepositModal} className="space-y-4">
            <input type="number" placeholder="Nominal (Min 10.000)" value={depoAmount} onChange={e=>setDepoAmount(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white font-bold outline-none focus:border-yellow-500" />
            <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded text-sm uppercase">LANJUT KE PEMBAYARAN</button>
          </form>
        </div>
        
        {/* REFERRAL */}
        <div className="bg-[#111] p-4 rounded-xl border border-white/5 flex justify-between items-center">
            <div><p className="text-[10px] text-gray-500">KODE REFERRAL</p><p className="font-mono text-lg text-yellow-500">{userData?.network.my_referral_code}</p></div>
            <button onClick={() => navigator.clipboard.writeText(userData?.network.my_referral_code || "")} className="text-xs bg-gray-800 px-3 py-1 rounded">COPY</button>
        </div>
      </main>

      {/* POPUP DEPOSIT */}
      {activeModal === "DEPOSIT_PAYMENT" && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#151515] w-full max-w-sm rounded-2xl border border-yellow-500/30 p-1 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                <div className="bg-[#0f0f0f] rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3"><h3 className="font-bold text-white text-lg">TAGIHAN</h3><button onClick={() => setActiveModal(null)} className="text-gray-500 font-bold">✕</button></div>
                    <div className="text-center py-2"><p className="text-xs text-gray-500">TOTAL TRANSFER</p><p className="text-3xl font-black text-yellow-500">{formatIDR(parseInt(depoAmount) + uniqueCode)}</p></div>
                    <div className="bg-white p-4 rounded-lg flex flex-col items-center"><img src="/qris.jpg" alt="QRIS" className="w-full max-w-[220px]" /><p className="text-[10px] text-black font-bold mt-2">SCAN QRIS</p></div>
                    <div className="text-center py-3 bg-red-900/10 border-2 border-dashed border-red-900/50 rounded-lg"><p className="text-[10px] font-black text-red-500 animate-pulse uppercase">⚠ SCREENSHOT HALAMAN INI</p><p className="text-[10px] text-white">UPLOAD BUKTI TRANSFER</p></div>
                    <input type="file" onChange={e => e.target.files && setProofFile(e.target.files[0])} className="w-full text-xs text-gray-400 border border-gray-700 rounded p-1"/>
                    <button onClick={handleDepositSubmit} disabled={isSubmitting} className="w-full bg-yellow-600 text-black font-bold py-3 rounded-lg text-sm">{isSubmitting ? "MENGIRIM..." : "KONFIRMASI BAYAR"}</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL WD */}
      {activeModal === "WD" && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#151515] w-full max-w-sm rounded-2xl border border-gray-700 p-6">
            <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">Withdraw Profit</h3><button onClick={()=>setActiveModal(null)}>✕</button></div>
            <p className="text-2xl font-bold mb-2">{formatLive(liveSaldo)}</p>
            {userData?.profile.bank_name ? (
                <div className="bg-blue-900/20 p-2 rounded mb-4 border border-blue-500/30">
                    <p className="text-[10px] text-blue-400 uppercase">Akan ditransfer ke:</p>
                    <p className="text-xs font-bold text-white">{userData.profile.bank_name} - {userData.profile.rek_number}</p>
                    <p className="text-xs text-gray-400">a.n {userData.profile.rek_name}</p>
                    <button onClick={()=>router.push("/profile")} className="text-[10px] text-yellow-500 underline mt-1">Ganti Rekening</button>
                </div>
            ) : (
                <p className="text-xs text-red-400 mb-4 bg-red-900/20 p-2 rounded border border-red-500/20">⚠ Anda belum atur rekening. <button onClick={()=>router.push("/profile")} className="underline font-bold">KLIK DISINI</button></p>
            )}
            <input type="number" placeholder="Jumlah WD" value={wdAmount} onChange={e=>setWdAmount(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white mb-4" />
            <button onClick={handleWithdraw} disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded">REQUEST PAYOUT</button>
          </div>
        </div>
      )}

      {/* MODAL NETWORK */}
      {activeModal === "NETWORK" && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#151515] w-full max-w-sm rounded-2xl border border-gray-700 p-6 h-[70vh] flex flex-col">
            <div className="flex justify-between mb-4"><h3 className="font-bold">Network</h3><button onClick={()=>setActiveModal(null)}>✕</button></div>
            <div className="overflow-y-auto space-y-4">
                <div className="bg-gray-800 p-2 rounded"><h4 className="text-xs font-bold text-yellow-500">LVL 1 (5%) - {downlines.lvl1.length}</h4><p className="text-xs text-gray-400">{downlines.lvl1.join(", ")}</p></div>
                <div className="bg-gray-800 p-2 rounded"><h4 className="text-xs font-bold text-blue-500">LVL 2 (3%) - {downlines.lvl2.length}</h4><p className="text-xs text-gray-400">{downlines.lvl2.join(", ")}</p></div>
                <div className="bg-gray-800 p-2 rounded"><h4 className="text-xs font-bold text-purple-500">LVL 3 (1%) - {downlines.lvl3.length}</h4><p className="text-xs text-gray-400">{downlines.lvl3.join(", ")}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}