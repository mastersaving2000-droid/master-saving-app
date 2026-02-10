"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, runTransaction, updateDoc, getCountFromServer } from "firebase/firestore";
import { useRouter } from "next/navigation";

// ⚠️ GANTI DENGAN EMAIL ADMIN ASLI KAMU ⚠️
const ADMIN_EMAIL = "mastersaving2000@gmail.com"; 

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfitRunning, setIsProfitRunning] = useState(false); 
  
  // Data Lists
  const [wdRequests, setWdRequests] = useState<any[]>([]);
  const [depoRequests, setDepoRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Data Statistik
  const [stats, setStats] = useState({
    totalMember: 0,
    totalAset: 0,
    totalDepositSuccess: 0,
    totalWdSuccess: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { alert("Login Admin Dulu!"); router.push("/login"); return; }
      if (currentUser.email !== ADMIN_EMAIL) { alert("AKSES DITOLAK! Email ini bukan Admin."); router.push("/dashboard"); return; }
      
      await Promise.all([fetchAllRequests(), fetchStats()]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // --- 1. AMBIL LIST REQUEST PENDING ---
  const fetchAllRequests = async () => {
    try {
      const qWd = query(collection(db, "withdrawals"), where("status", "==", "pending"));
      const snapWd = await getDocs(qWd);
      setWdRequests(snapWd.docs.map(d => ({ id: d.id, ...d.data() })));

      const qDepo = query(collection(db, "deposits"), where("status", "==", "pending"));
      const snapDepo = await getDocs(qDepo);
      setDepoRequests(snapDepo.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  // --- 2. HITUNG STATISTIK ---
  const fetchStats = async () => {
    try {
        const collUser = collection(db, "users");
        const snapUser = await getCountFromServer(collUser);
        
        const allUsers = await getDocs(collUser);
        let totalSaldo = 0;
        allUsers.forEach(doc => { totalSaldo += doc.data().finance?.saldo_utama || 0; });

        const qDepoDone = query(collection(db, "deposits"), where("status", "==", "approved"));
        const snapDepoDone = await getDocs(qDepoDone);
        let totalIn = 0;
        snapDepoDone.forEach(doc => { totalIn += doc.data().total_transfer || 0; });

        const qWdDone = query(collection(db, "withdrawals"), where("status", "==", "success"));
        const snapWdDone = await getDocs(qWdDone);
        let totalOut = 0;
        snapWdDone.forEach(doc => { totalOut += doc.data().amount || 0; });

        setStats({
            totalMember: snapUser.data().count,
            totalAset: totalSaldo,
            totalDepositSuccess: totalIn,
            totalWdSuccess: totalOut
        });

    } catch (err) { console.error("Gagal hitung stats", err); }
  };

  // --- 3. LOGIC TRIGGER PROFIT HARIAN (SUDAH DIPERBAIKI: READ BEFORE WRITE) ---
  const handleRunDailyProfit = async () => {
    if (!confirm("⚠️ PERINGATAN KERAS!\n\nApakah Anda yakin ingin menjalankan PROFIT HARIAN sekarang?\n\nKlik OK untuk melanjutkan.")) return;
    
    setIsProfitRunning(true);
    let processedCount = 0;

    try {
        const allUsersSnap = await getDocs(collection(db, "users"));
        const timestamp = new Date().toISOString();

        for (const userDoc of allUsersSnap.docs) {
            const uData = userDoc.data();
            const currentSaldo = uData.finance?.saldo_utama || 0;

            if (currentSaldo >= 50000) {
                
                await runTransaction(db, async (transaction) => {
                    // --- TAHAP 1: BACA SEMUA DATA DULU (READ) ---
                    // Siapkan referensi upline
                    const u1Id = uData.network?.upline_1;
                    const u2Id = uData.network?.upline_2;
                    const u3Id = uData.network?.upline_3;

                    let u1Doc, u2Doc, u3Doc;
                    
                    // Baca data upline SEBELUM melakukan write apapun
                    if (u1Id) { u1Doc = await transaction.get(doc(db, "users", u1Id)); }
                    if (u2Id) { u2Doc = await transaction.get(doc(db, "users", u2Id)); }
                    if (u3Id) { u3Doc = await transaction.get(doc(db, "users", u3Id)); }

                    // --- TAHAP 2: KALKULASI & TULIS DATA (WRITE) ---
                    
                    // A. Update User Sendiri
                    const profitHarian = Math.floor(currentSaldo * 0.0035); 
                    transaction.update(doc(db, "users", userDoc.id), {
                        "finance.saldo_utama": currentSaldo + profitHarian,
                        "finance.last_profit_calc": timestamp
                    });

                    const logRef = doc(collection(db, "profit_logs"));
                    transaction.set(logRef, {
                        uid: userDoc.id,
                        amount: profitHarian,
                        created_at: timestamp,
                        desc: "Profit Mining Harian"
                    });

                    // B. Update Upline (Jika ada datanya)
                    // Level 1 (10% dari Profit)
                    if (u1Doc && u1Doc.exists()) {
                        const bonus = Math.floor(profitHarian * 0.10);
                        if (bonus > 0) {
                            const newSaldo = (u1Doc.data().finance?.saldo_utama || 0) + bonus;
                            transaction.update(doc(db, "users", u1Id), { "finance.saldo_utama": newSaldo });
                            transaction.set(doc(collection(db, "bonuses")), {
                                uid: u1Id, amount: bonus, from_nama: uData.profile.nama, level: 1, created_at: timestamp, type: "PASSIVE"
                            });
                        }
                    }

                    // Level 2 (5% dari Profit)
                    if (u2Doc && u2Doc.exists()) {
                        const bonus = Math.floor(profitHarian * 0.05);
                        if (bonus > 0) {
                            const newSaldo = (u2Doc.data().finance?.saldo_utama || 0) + bonus;
                            transaction.update(doc(db, "users", u2Id), { "finance.saldo_utama": newSaldo });
                            transaction.set(doc(collection(db, "bonuses")), {
                                uid: u2Id, amount: bonus, from_nama: uData.profile.nama, level: 2, created_at: timestamp, type: "PASSIVE"
                            });
                        }
                    }

                    // Level 3 (2% dari Profit)
                    if (u3Doc && u3Doc.exists()) {
                        const bonus = Math.floor(profitHarian * 0.02);
                        if (bonus > 0) {
                            const newSaldo = (u3Doc.data().finance?.saldo_utama || 0) + bonus;
                            transaction.update(doc(db, "users", u3Id), { "finance.saldo_utama": newSaldo });
                            transaction.set(doc(collection(db, "bonuses")), {
                                uid: u3Id, amount: bonus, from_nama: uData.profile.nama, level: 3, created_at: timestamp, type: "PASSIVE"
                            });
                        }
                    }
                });
                processedCount++;
            }
        }
        alert(`✅ SUKSES! Profit dibagikan ke ${processedCount} member.`);
        fetchStats(); 
    } catch (e:any) {
        console.error(e);
        alert("Gagal: " + e.message);
    } finally {
        setIsProfitRunning(false);
    }
  };


  // --- 4. LOGIC APPROVE DEPOSIT (JUGA DIPERBAIKI READ-BEFORE-WRITE) ---
  const handleApproveDeposit = async (req: any) => {
    if (!confirm(`Terima Deposit Rp ${req.total_transfer.toLocaleString()}?`)) return;
    setProcessingId(req.id);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. READ SEMUA DULU
        const userRef = doc(db, "users", req.user_uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw "User tidak ditemukan!";
        const userData = userDoc.data();

        const u1Id = userData.network?.upline_1;
        const u2Id = userData.network?.upline_2;
        const u3Id = userData.network?.upline_3;

        let u1Doc, u2Doc, u3Doc;
        if (u1Id) { u1Doc = await transaction.get(doc(db, "users", u1Id)); }
        if (u2Id) { u2Doc = await transaction.get(doc(db, "users", u2Id)); }
        if (u3Id) { u3Doc = await transaction.get(doc(db, "users", u3Id)); }

        // 2. BARU WRITE SETELAH SEMUA READ SELESAI
        const timestamp = new Date().toISOString();
        const base = req.amount_base || req.total_transfer;

        // Update Saldo User
        const newSaldoUser = (userData.finance?.saldo_utama || 0) + req.total_transfer;
        transaction.update(userRef, { "finance.saldo_utama": newSaldoUser });

        // Update Upline 1
        if (u1Doc && u1Doc.exists()) {
            const bonus = base * 0.05;
            const newSaldo = (u1Doc.data().finance?.saldo_utama || 0) + bonus;
            transaction.update(doc(db, "users", u1Id), { "finance.saldo_utama": newSaldo });
            transaction.set(doc(collection(db, "bonuses")), { uid: u1Id, from_nama: userData.profile.nama, level: 1, amount: bonus, created_at: timestamp, type: "REFERRAL" });
        }
        // Update Upline 2
        if (u2Doc && u2Doc.exists()) {
            const bonus = base * 0.03;
            const newSaldo = (u2Doc.data().finance?.saldo_utama || 0) + bonus;
            transaction.update(doc(db, "users", u2Id), { "finance.saldo_utama": newSaldo });
            transaction.set(doc(collection(db, "bonuses")), { uid: u2Id, from_nama: userData.profile.nama, level: 2, amount: bonus, created_at: timestamp, type: "REFERRAL" });
        }
        // Update Upline 3
        if (u3Doc && u3Doc.exists()) {
            const bonus = base * 0.01;
            const newSaldo = (u3Doc.data().finance?.saldo_utama || 0) + bonus;
            transaction.update(doc(db, "users", u3Id), { "finance.saldo_utama": newSaldo });
            transaction.set(doc(collection(db, "bonuses")), { uid: u3Id, from_nama: userData.profile.nama, level: 3, amount: bonus, created_at: timestamp, type: "REFERRAL" });
        }

        // Update Status Deposit
        transaction.update(doc(db, "deposits", req.id), { status: "approved", process_date: timestamp });
      });

      alert("✅ Deposit Diterima & Bonus Terkirim.");
      fetchAllRequests(); fetchStats();
    } catch (e: any) { alert("Error: " + e.message); } 
    finally { setProcessingId(null); }
  };

  // --- 5. LOGIC LAINNYA ---
  const handleCancelDeposit = async (id: string) => {
    if (!confirm("Tolak deposit ini?")) return;
    setProcessingId(id);
    try { await updateDoc(doc(db, "deposits", id), { status: "rejected" }); fetchAllRequests(); } catch (e) { alert("Gagal."); } finally { setProcessingId(null); }
  };
  const handleApproveWD = async (req: any) => {
    if (!confirm(`Setujui WD Rp ${req.amount.toLocaleString()}?`)) return;
    setProcessingId(req.id);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", req.user_uid);
        const userDoc = await transaction.get(userRef);
        const currentSaldo = userDoc.data()?.finance.saldo_utama || 0;
        if (currentSaldo < req.amount) throw "Saldo Kurang!";
        transaction.update(userRef, { "finance.saldo_utama": currentSaldo - req.amount });
        transaction.update(doc(db, "withdrawals", req.id), { status: "success" });
      });
      alert("✅ WD Sukses!"); fetchAllRequests(); fetchStats();
    } catch (e: any) { alert("Error: " + e.message); } finally { setProcessingId(null); }
  };
  const handleRejectWD = async (id: string) => {
    if (!confirm("Tolak WD ini?")) return;
    setProcessingId(id);
    try { await updateDoc(doc(db, "withdrawals", id), { status: "rejected" }); fetchAllRequests(); } catch (e) { alert("Gagal."); } finally { setProcessingId(null); }
  };

  const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  if (loading) return <div className="text-white p-10 font-mono animate-pulse">CONNECTING SATELLITE...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-4 gap-4">
            <div>
                <h1 className="text-3xl font-black text-red-600 tracking-tighter">GOD MODE <span className="text-white">PANEL</span></h1>
                <p className="text-xs text-gray-500">Master Saving Administration</p>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={handleRunDailyProfit}
                    disabled={isProfitRunning}
                    className={`px-6 py-2 rounded font-bold shadow-[0_0_15px_rgba(34,197,94,0.5)] transition ${isProfitRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 animate-pulse'}`}
                >
                    {isProfitRunning ? "⏳ SEDANG MEMPROSES..." : "⚡ JALANKAN PROFIT HARIAN"}
                </button>
                <button onClick={() => router.push('/dashboard')} className="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded text-xs transition">Back to App</button>
            </div>
        </div>

        {/* --- STATISTIK CARDS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">TOTAL MEMBER</p>
                <h3 className="text-2xl font-bold text-white">{stats.totalMember.toLocaleString()} <span className="text-xs text-gray-600">User</span></h3>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">TOTAL ASET USER</p>
                <h3 className="text-xl font-bold text-yellow-500">{formatIDR(stats.totalAset)}</h3>
                <p className="text-[9px] text-gray-600">Kewajiban Bayar</p>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">TOTAL DEPOSIT (IN)</p>
                <h3 className="text-xl font-bold text-green-500">{formatIDR(stats.totalDepositSuccess)}</h3>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">TOTAL WITHDRAW (OUT)</p>
                <h3 className="text-xl font-bold text-red-500">{formatIDR(stats.totalWdSuccess)}</h3>
            </div>
        </div>

        {/* LIST REQUEST */}
        <div className="grid md:grid-cols-2 gap-10">
            <div>
                <h2 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2">
                    📥 DEPOSIT PENDING <span className="bg-yellow-900 text-yellow-100 text-[10px] px-2 py-0.5 rounded-full">{depoRequests.length}</span>
                </h2>
                {depoRequests.length === 0 ? <p className="text-gray-600 text-xs italic">Aman, tidak ada antrian.</p> : 
                 depoRequests.map(req => (
                    <div key={req.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl mb-3 flex flex-col gap-3">
                        <div className="flex justify-between">
                            <div>
                                <div className="font-bold text-sm">{req.user_nama}</div>
                                <div className="text-xs text-gray-500">ID: ...{req.user_uid.slice(-4)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-yellow-400">{formatIDR(req.total_transfer)}</div>
                                <div className="text-[10px] text-gray-500">Kode: {req.unique_code}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-800">
                            <button disabled={!!processingId} onClick={() => handleCancelDeposit(req.id)} className="flex-1 py-2 border border-red-900/50 text-red-500 text-xs rounded hover:bg-red-900/10">TOLAK</button>
                            <button disabled={!!processingId} onClick={() => handleApproveDeposit(req)} className="flex-1 py-2 bg-yellow-600 text-black font-bold text-xs rounded hover:bg-yellow-500 shadow-lg shadow-yellow-900/20">TERIMA & BONUS</button>
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <h2 className="text-lg font-bold text-blue-500 mb-4 flex items-center gap-2">
                    📤 WITHDRAW PENDING <span className="bg-blue-900 text-blue-100 text-[10px] px-2 py-0.5 rounded-full">{wdRequests.length}</span>
                </h2>
                {wdRequests.length === 0 ? <p className="text-gray-600 text-xs italic">Aman, tidak ada antrian.</p> :
                 wdRequests.map(req => (
                    <div key={req.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl mb-3 flex flex-col gap-3">
                        <div className="flex justify-between">
                            <div>
                                <div className="font-bold text-sm">{req.user_nama}</div>
                                <div className="text-[10px] text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-800 inline-block mt-1">{req.ewallet}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-red-400">{formatIDR(req.amount)}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-800">
                            <button disabled={!!processingId} onClick={() => handleRejectWD(req.id)} className="flex-1 py-2 border border-gray-600 text-gray-400 text-xs rounded hover:bg-gray-800">BATAL</button>
                            <button disabled={!!processingId} onClick={() => handleApproveWD(req)} className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-500 shadow-lg shadow-blue-900/20">TRANSFER SEKARANG</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}