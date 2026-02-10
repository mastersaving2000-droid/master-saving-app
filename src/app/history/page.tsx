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
  const [profits, setProfits] = useState<any[]>([]); // Gabungan Profit Mining & Bonus Referral

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      
      try {
        // 1. DEPOSIT
        const listDepo = (await getDocs(query(collection(db, "deposits"), where("user_uid", "==", user.uid)))).docs.map(d => ({ id: d.id, ...d.data() }));
        listDepo.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDeposits(listDepo);

        // 2. WITHDRAW
        const listWD = (await getDocs(query(collection(db, "withdrawals"), where("user_uid", "==", user.uid)))).docs.map(d => ({ id: d.id, ...d.data() }));
        listWD.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setWithdrawals(listWD);

        // 3. PROFIT LOGS (Bonus Referral + Daily Mining)
        // Kita ambil dari collection 'bonuses' (Referral) DAN 'profit_logs' (Harian)
        const bonusSnap = await getDocs(query(collection(db, "bonuses"), where("uid", "==", user.uid)));
        const dailySnap = await getDocs(query(collection(db, "profit_logs"), where("uid", "==", user.uid)));

        let combinedProfits = [
            ...bonusSnap.docs.map(d => ({ id: d.id, type: "REFERRAL", ...d.data() })),
            ...dailySnap.docs.map(d => ({ id: d.id, type: "MINING", ...d.data() }))
        ];

        // Sort gabungan berdasarkan tanggal
        combinedProfits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setProfits(combinedProfits);

      } catch (err) { console.error(err); } finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, [router]);

  const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const formatDate = (isoString: string) => new Date(isoString).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-10">
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold tracking-wide">RIWAYAT</h1>
      </nav>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        <div className="flex bg-[#111] p-1 rounded-xl border border-white/10 gap-1">
            <button onClick={() => setActiveTab("DEPOSIT")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${activeTab === "DEPOSIT" ? "bg-yellow-600 text-black" : "text-gray-500"}`}>DEPOSIT</button>
            <button onClick={() => setActiveTab("WITHDRAW")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${activeTab === "WITHDRAW" ? "bg-blue-600 text-white" : "text-gray-500"}`}>PENARIKAN</button>
            <button onClick={() => setActiveTab("PROFIT")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${activeTab === "PROFIT" ? "bg-purple-600 text-white" : "text-gray-500"}`}>PROFIT</button>
        </div>

        <div className="space-y-3">
            {activeTab === "DEPOSIT" && deposits.map((item) => (
                <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                    <div><div className="text-sm font-bold text-white">Deposit Saldo</div><p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-yellow-500">+ {formatIDR(item.total_transfer)}</p><span className="text-[9px] bg-green-900 text-green-400 px-1 rounded uppercase">{item.status}</span></div>
                </div>
            ))}
            {activeTab === "WITHDRAW" && withdrawals.map((item) => (
                <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                    <div><div className="text-sm font-bold text-white">Withdraw</div><p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-red-500">- {formatIDR(item.amount)}</p><span className="text-[9px] bg-blue-900 text-blue-400 px-1 rounded uppercase">{item.status}</span></div>
                </div>
            ))}
            {activeTab === "PROFIT" && profits.map((item) => (
                <div key={item.id} className={`bg-[#111] border rounded-xl p-4 flex justify-between items-center ${item.type === 'REFERRAL' ? 'border-purple-900/30' : 'border-green-900/30'}`}>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{item.type === 'REFERRAL' ? `Bonus Tim (Lvl ${item.level})` : 'Profit Harian'}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{formatDate(item.created_at)}</p>
                        {item.from_nama && <p className="text-[9px] text-purple-400">Dari: {item.from_nama}</p>}
                    </div>
                    <div className="text-right"><p className="text-sm font-mono font-bold text-green-400">+ {formatIDR(item.amount)}</p></div>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
}