"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"DEPOSIT" | "WITHDRAW" | "PROFIT">("PROFIT");
  
  // State untuk data yang sudah di-group
  const [groupedData, setGroupedData] = useState<any>({});

  // State kontrol accordion
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      
      try {
        setLoading(true);

        // 1. AMBIL SEMUA DATA SEKALIGUS
        const [depoSnap, wdSnap, bonusSnap, dailySnap] = await Promise.all([
            getDocs(query(collection(db, "deposits"), where("user_uid", "==", user.uid))),
            getDocs(query(collection(db, "withdrawals"), where("user_uid", "==", user.uid))),
            getDocs(query(collection(db, "bonuses"), where("uid", "==", user.uid))),
            getDocs(query(collection(db, "profit_logs"), where("uid", "==", user.uid)))
        ]);

        // 2. PROSES SEMUA TAB KE DALAM GROUPING
        const allProcessed = {
            DEPOSIT: groupUniversalData(depoSnap.docs.map(d => ({ id: d.id, type: "DEPO", ...d.data() }))),
            WITHDRAW: groupUniversalData(wdSnap.docs.map(d => ({ id: d.id, type: "WD", ...d.data() }))),
            PROFIT: groupUniversalData([
                ...bonusSnap.docs.map(d => ({ id: d.id, type: "REFERRAL", ...d.data() })),
                ...dailySnap.docs.map(d => ({ id: d.id, type: "MINING", ...d.data() }))
            ])
        };

        setGroupedData(allProcessed);

        // Auto-expand bulan terbaru di tab yang aktif
        const currentMonths = Object.keys(allProcessed[activeTab]);
        if(currentMonths.length > 0) setExpandedMonth(currentMonths[0]);

      } catch (err) { console.error(err); } finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, [router, activeTab]); // Reload grouping saat tab pindah

  // --- LOGIKA GROUPING UNIVERSAL (BULAN -> MINGGU -> HARI) ---
  function groupUniversalData(data: any[]) {
    const groups: any = {};
    data.sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());

    data.forEach((item) => {
      const date = new Date(item.created_at || item.timestamp);
      const monthYear = date.toLocaleString("id-ID", { month: "long", year: "numeric" });
      const weekLabel = `Minggu ke-${Math.ceil(date.getDate() / 7)}`;

      if (!groups[monthYear]) groups[monthYear] = { total: 0, weeks: {} };
      if (!groups[monthYear].weeks[weekLabel]) groups[monthYear].weeks[weekLabel] = { total: 0, list: [] };

      // Kalkulasi total (khusus WD jadikan pengurang jika perlu, tapi di sini kita tampilkan nominal mutlak)
      const amount = item.amount || item.total_transfer || 0;
      groups[monthYear].total += amount;
      groups[monthYear].weeks[weekLabel].total += amount;
      groups[monthYear].weeks[weekLabel].list.push(item);
    });
    return groups;
  }

  const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
  const formatDate = (dateInput: any) => {
    const d = dateInput?.seconds ? new Date(dateInput.seconds * 1000) : new Date(dateInput);
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace('.', ':');
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 animate-pulse font-mono tracking-widest">ORGANIZING DATA...</div>;

  const currentTabGroups = groupedData[activeTab] || {};

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-10">
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold tracking-wide text-xs uppercase">History Manager</h1>
      </nav>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* TABS MENU */}
        <div className="flex bg-[#111] p-1 rounded-xl border border-white/10 gap-1">
            {(["DEPOSIT", "WITHDRAW", "PROFIT"] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); setExpandedMonth(null); setExpandedWeek(null); }} 
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === tab ? (tab === "DEPOSIT" ? "bg-yellow-600 text-black" : tab === "WITHDRAW" ? "bg-blue-600 text-white" : "bg-purple-600 text-white") : "text-gray-500"}`}>
                {tab === "WITHDRAW" ? "PENARIKAN" : tab}
              </button>
            ))}
        </div>

        <div className="space-y-4">
            {Object.keys(currentTabGroups).length === 0 && (
                <p className="text-center text-gray-600 py-10 text-xs italic">Data {activeTab.toLowerCase()} belum tersedia.</p>
            )}
            
            {Object.entries(currentTabGroups).map(([month, monthData]: [string, any]) => (
              <div key={month} className="space-y-2">
                {/* LEVEL 1: BULAN */}
                <button onClick={() => setExpandedMonth(expandedMonth === month ? null : month)} 
                  className={`w-full border p-4 rounded-xl flex justify-between items-center transition-all ${activeTab === "DEPOSIT" ? "bg-yellow-900/10 border-yellow-500/30" : activeTab === "WITHDRAW" ? "bg-blue-900/10 border-blue-500/30" : "bg-purple-900/10 border-purple-500/30"}`}>
                  <div className="text-left"><p className={`text-[10px] uppercase font-bold ${activeTab === "DEPOSIT" ? "text-yellow-500" : activeTab === "WITHDRAW" ? "text-blue-400" : "text-purple-400"}`}>Periode</p><p className="text-sm font-bold">{month}</p></div>
                  <div className="text-right">
                      <p className={`text-sm font-bold ${activeTab === "WITHDRAW" ? "text-red-400" : "text-green-400"}`}>
                        {activeTab === "WITHDRAW" ? "-" : "+"} {formatIDR(monthData.total)}
                      </p>
                      <p className="text-[9px] text-gray-500">{expandedMonth === month ? "Tutup" : "Lihat Detail"}</p>
                  </div>
                </button>

                {/* LEVEL 2: MINGGU */}
                {expandedMonth === month && (
                  <div className="pl-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    {Object.entries(monthData.weeks).map(([week, weekData]: [string, any]) => (
                      <div key={week} className="space-y-2">
                        <button onClick={() => setExpandedWeek(expandedWeek === week ? null : week)}
                          className="w-full bg-[#0a0a0a] border border-white/5 p-3 rounded-lg flex justify-between items-center active:bg-zinc-900">
                          <p className="text-xs font-bold text-gray-400">{week}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-medium text-gray-500">{formatIDR(weekData.total)}</p>
                            <span className="text-gray-700">{expandedWeek === week ? "−" : "+"}</span>
                          </div>
                        </button>

                        {/* LEVEL 3: HARI (DAFTAR TRANSAKSI ASLI) */}
                        {expandedWeek === week && (
                          <div className="space-y-2 pl-2 animate-in fade-in duration-300">
                            {weekData.list.map((item: any) => (
                              <div key={item.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                  <div className="text-xs font-bold text-white">
                                    {item.type === 'DEPO' ? 'Deposit Saldo' : 
                                     item.type === 'WD' ? 'Penarikan Dana' : 
                                     item.type === 'REFERRAL' ? `Bonus Lvl ${item.level}` : 'Profit Harian'}
                                  </div>
                                  <p className="text-[9px] text-gray-500">{formatDate(item.created_at || item.timestamp)}</p>
                                  {item.from_nama && <p className="text-[8px] text-purple-400 italic">Dari: {item.from_nama}</p>}
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-mono font-bold ${activeTab === "WITHDRAW" ? "text-red-500" : "text-green-400"}`}>
                                    {activeTab === "WITHDRAW" ? "-" : "+"} {formatIDR(item.amount || item.total_transfer)}
                                  </p>
                                  {item.status && <span className="text-[8px] opacity-50 uppercase tracking-tighter">{item.status}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}