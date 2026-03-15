"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"DEPOSIT" | "WITHDRAW" | "PROFIT">("DEPOSIT");
  
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profits, setProfits] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      
      try {
        // --- 1. DEPOSIT ---
        const listDepoSnap = await getDocs(query(collection(db, "deposits"), where("user_uid", "==", user.uid)));
        const listDepo = listDepoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort manual di sisi client (mencegah error index)
        listDepo.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDeposits(listDepo);

        // --- 2. WITHDRAW ---
        const listWDSnap = await getDocs(query(collection(db, "withdrawals"), where("user_uid", "==", user.uid)));
        const listWD = listWDSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        listWD.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setWithdrawals(listWD);

        // --- 3. PROFIT LOGS ---
        const bonusSnap = await getDocs(query(collection(db, "bonuses"), where("uid", "==", user.uid)));
        const dailySnap = await getDocs(query(collection(db, "profit_logs"), where("uid", "==", user.uid)));

        let combinedProfits = [
            ...bonusSnap.docs.map(d => ({ id: d.id, type: "REFERRAL", ...d.data() })),
            ...dailySnap.docs.map(d => ({ id: d.id, type: "MINING", ...d.data() }))
        ];

        // Sort gabungan (Mencegah Invalid Date)
        combinedProfits.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.timestamp).getTime();
            const dateB = new Date(b.created_at || b.timestamp).getTime();
            return dateB - dateA;
        });
        setProfits(combinedProfits);

      } catch (err) { 
        console.error("Gagal ambil history:", err); 
      } finally { 
        setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
  
  const formatDate = (dateInput: any) => {
    if(!dateInput) return "Waktu tidak ada";
    // Handle jika input adalah string ISO atau Firestore Timestamp
    const d = dateInput.seconds ? new Date(dateInput.seconds * 1000) : new Date(dateInput);
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace('.', ':');
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 animate-pulse font-mono tracking-widest">LOADING HISTORY...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-10">
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold tracking-wide">RIWAYAT TRANSAKSI</h1>
      </nav>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex bg-[#111] p-1 rounded-xl border border-white/10 gap-1">
            {(["DEPOSIT", "WITHDRAW", "PROFIT"] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                    activeTab === tab 
                    ? (tab === "DEPOSIT" ? "bg-yellow-600 text-black" : tab === "WITHDRAW" ? "bg-blue-600 text-white" : "bg-purple-600 text-white") 
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "WITHDRAW" ? "PENARIKAN" : tab}
              </button>
            ))}
        </div>

        {/* List Content */}
        <div className="space-y-3">
            {activeTab === "DEPOSIT" && deposits.length === 0 && <p className="text-center text-gray-600 py-10 text-xs">Belum ada deposit.</p>}
            {activeTab === "DEPOSIT" && deposits.map((item) => (
                <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                    <div><div className="text-sm font-bold text-white">Deposit Saldo</div><p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-yellow-500">+ {formatIDR(item.total_transfer)}</p><span className="text-[9px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded uppercase border border-green-800/50">{item.status}</span></div>
                </div>
            ))}

            {activeTab === "WITHDRAW" && withdrawals.length === 0 && <p className="text-center text-gray-600 py-10 text-xs">Belum ada penarikan.</p>}
            {activeTab === "WITHDRAW" && withdrawals.map((item) => (
                <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                    <div><div className="text-sm font-bold text-white">Penarikan Dana</div><p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-red-500">- {formatIDR(item.amount)}</p><span className="text-[9px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded uppercase border border-blue-800/50">{item.status}</span></div>
                </div>
            ))}

            {activeTab === "PROFIT" && profits.length === 0 && <p className="text-center text-gray-600 py-10 text-xs">Belum ada profit.</p>}
            {activeTab === "PROFIT" && profits.map((item) => (
                <div key={item.id} className={`bg-[#111] border rounded-xl p-4 flex justify-between items-center ${item.type === 'REFERRAL' ? 'border-purple-900/30' : 'border-green-900/30'}`}>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{item.type === 'REFERRAL' ? `Bonus Tim (Lvl ${item.level})` : 'Profit Harian'}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{formatDate(item.created_at || item.timestamp)}</p>
                        {item.from_nama && <p className="text-[9px] text-purple-400 italic">Dari: {item.from_nama}</p>}
                    </div>
                    <div className="text-right"><p className="text-sm font-mono font-bold text-green-400">+ {formatIDR(item.amount)}</p></div>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
}