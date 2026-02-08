"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"DEPOSIT" | "WITHDRAW" | "BONUS">("DEPOSIT");
  
  // Data State
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      
      try {
        // 1. DATA DEPOSIT
        const snapDepo = await getDocs(query(collection(db, "deposits"), where("user_uid", "==", user.uid)));
        const listDepo = snapDepo.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        listDepo.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDeposits(listDepo);

        // 2. DATA WITHDRAW
        const snapWD = await getDocs(query(collection(db, "withdrawals"), where("user_uid", "==", user.uid)));
        const listWD = snapWD.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        listWD.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setWithdrawals(listWD);

        // 3. DATA BONUS (REFERRAL) - BARU!
        const snapBonus = await getDocs(query(collection(db, "bonuses"), where("uid", "==", user.uid)));
        const listBonus = snapBonus.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        listBonus.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBonuses(listBonus);

      } catch (err) {
        console.error("Gagal ambil history:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "approved": 
      case "success": return <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-500/30">BERHASIL</span>;
      case "pending": return <span className="text-[10px] bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30 animate-pulse">PROSES</span>;
      case "rejected": return <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-1 rounded border border-red-500/30">DITOLAK</span>;
      default: return <span className="text-[10px] text-gray-500">{status}</span>;
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 text-xs tracking-widest">LOADING HISTORY...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-10">
      
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold tracking-wide">RIWAYAT TRANSAKSI</h1>
      </nav>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* TABS SWITCHER (3 TAB) */}
        <div className="flex bg-[#111] p-1 rounded-xl border border-white/10 gap-1">
            <button onClick={() => setActiveTab("DEPOSIT")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === "DEPOSIT" ? "bg-yellow-600 text-black shadow" : "text-gray-500"}`}>DEPOSIT</button>
            <button onClick={() => setActiveTab("WITHDRAW")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === "WITHDRAW" ? "bg-blue-600 text-white shadow" : "text-gray-500"}`}>PENARIKAN</button>
            <button onClick={() => setActiveTab("BONUS")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === "BONUS" ? "bg-purple-600 text-white shadow" : "text-gray-500"}`}>BONUS</button>
        </div>

        <div className="space-y-3">
            
            {/* --- LIST DEPOSIT --- */}
            {activeTab === "DEPOSIT" && (
                deposits.length === 0 ? <div className="text-center py-10 text-gray-600 text-xs">Belum ada riwayat.</div> :
                deposits.map((item) => (
                    <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center hover:border-yellow-500/30 transition">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-white">Deposit Saldo</span>{getStatusBadge(item.status)}</div>
                            <p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p>
                        </div>
                        <div className="text-right"><p className="text-sm font-mono font-bold text-yellow-500">+ {formatIDR(item.total_transfer)}</p></div>
                    </div>
                ))
            )}

            {/* --- LIST WITHDRAW --- */}
            {activeTab === "WITHDRAW" && (
                withdrawals.length === 0 ? <div className="text-center py-10 text-gray-600 text-xs">Belum ada riwayat.</div> :
                withdrawals.map((item) => (
                    <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center hover:border-blue-500/30 transition">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-white">Withdraw</span>{getStatusBadge(item.status)}</div>
                            <p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p>
                            <p className="text-[10px] text-gray-600 mt-1">Ke: {item.ewallet}</p>
                        </div>
                        <div className="text-right"><p className="text-sm font-mono font-bold text-red-500">- {formatIDR(item.amount)}</p></div>
                    </div>
                ))
            )}

            {/* --- LIST BONUS (REFERRAL) --- */}
            {activeTab === "BONUS" && (
                bonuses.length === 0 ? <div className="text-center py-10 text-gray-600 text-xs">Belum ada bonus referral. Ajak teman deposit!</div> :
                bonuses.map((item) => (
                    <div key={item.id} className="bg-[#111] border border-purple-900/30 rounded-xl p-4 flex justify-between items-center hover:border-purple-500 transition">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-white">Bonus Level {item.level}</span>
                                <span className="text-[10px] bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">SUKSES</span>
                            </div>
                            <p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Dari: <span className="text-purple-300 font-bold">{item.from_nama}</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-mono font-bold text-green-400">+ {formatIDR(item.amount)}</p>
                        </div>
                    </div>
                ))
            )}

        </div>
      </main>
    </div>
  );
}