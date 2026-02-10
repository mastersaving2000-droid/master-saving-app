"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, runTransaction, updateDoc, getCountFromServer, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// ⚠️ GANTI DENGAN EMAIL ADMIN ASLI KAMU ⚠️
const ADMIN_EMAIL = "mastersaving2000@gmail.com"; 

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfitRunning, setIsProfitRunning] = useState(false); 
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "USERS">("REQUESTS"); 
  
  // Data Lists
  const [wdRequests, setWdRequests] = useState<any[]>([]);
  const [depoRequests, setDepoRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Data Database Users Baru
  const [usersList, setUsersList] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  // Data Statistik
  const [stats, setStats] = useState({ totalMember: 0, totalAset: 0, totalDepositSuccess: 0, totalWdSuccess: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { alert("Login Admin Dulu!"); router.push("/login"); return; }
      if (currentUser.email !== ADMIN_EMAIL) { alert("AKSES DITOLAK! Email ini bukan Admin."); router.push("/dashboard"); return; }
      
      await Promise.all([fetchAllRequests(), fetchStatsAndUsers()]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchAllRequests = async () => {
    try {
      const snapWd = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "pending")));
      setWdRequests(snapWd.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapDepo = await getDocs(query(collection(db, "deposits"), where("status", "==", "pending")));
      setDepoRequests(snapDepo.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const fetchStatsAndUsers = async () => {
    try {
        const collUser = collection(db, "users");
        const snapUser = await getCountFromServer(collUser);
        const allUsersSnap = await getDocs(collUser);
        
        let totalSaldo = 0;
        let rawUsers: any[] = [];

        allUsersSnap.forEach(doc => { 
            const data = doc.data();
            totalSaldo += data.finance?.saldo_utama || 0; 
            rawUsers.push({ id: doc.id, ...data });
        });

        const enrichedUsers = rawUsers.map(u => ({
            uid: u.id,
            nama: u.profile?.nama || "Tanpa Nama",
            hp: u.profile?.hp || "-",
            email: u.email || "-", 
            saldo: u.finance?.saldo_utama || 0,
            created_at: u.created_at || "2024-01-01T00:00:00.000Z", 
            d1: rawUsers.filter(x => x.network?.upline_1 === u.id).length,
            d2: rawUsers.filter(x => x.network?.upline_2 === u.id).length,
            d3: rawUsers.filter(x => x.network?.upline_3 === u.id).length,
        }));

        enrichedUsers.sort((a, b) => b.saldo - a.saldo);
        setUsersList(enrichedUsers);

        const snapDepoDone = await getDocs(query(collection(db, "deposits"), where("status", "==", "approved")));
        let totalIn = 0; snapDepoDone.forEach(doc => { totalIn += doc.data().total_transfer || 0; });

        const snapWdDone = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "success")));
        let totalOut = 0; snapWdDone.forEach(doc => { totalOut += doc.data().amount || 0; });

        setStats({ totalMember: snapUser.data().count, totalAset: totalSaldo, totalDepositSuccess: totalIn, totalWdSuccess: totalOut });

    } catch (err) { console.error("Gagal hitung stats", err); }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
    
    const sortedData = [...usersList].sort((a, b) => {
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    setUsersList(sortedData);
    setSortConfig({ key, direction });
  };

  // --- LOGIC HAPUS AKUN DARI ADMIN ---
  const handleDeleteUserAdmin = async (uid: string, nama: string) => {
    if (!confirm(`⚠️ DANGER ZONE!\n\nYakin ingin memusnahkan akun FRAUD: ${nama}?\n\n- Data & Saldo akan hangus selamanya.\n- Nomor HP bisa didaftarkan ulang.`)) return;
    
    try {
        await deleteDoc(doc(db, "users", uid));
        alert(`✅ User ${nama} berhasil dimusnahkan dari Database.\n\n(Note: Untuk menghapus email dari sistem login, Admin bisa menghapusnya secara manual di tab Authentication pada Console Firebase).`);
        fetchStatsAndUsers(); // Refresh tabel
    } catch (error: any) {
        alert("Gagal menghapus user: " + error.message);
    }
  };

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
                    const u1Id = uData.network?.upline_1; const u2Id = uData.network?.upline_2; const u3Id = uData.network?.upline_3;
                    let u1Doc, u2Doc, u3Doc;
                    if (u1Id) u1Doc = await transaction.get(doc(db, "users", u1Id));
                    if (u2Id) u2Doc = await transaction.get(doc(db, "users", u2Id));
                    if (u3Id) u3Doc = await transaction.get(doc(db, "users", u3Id));

                    const profitHarian = Math.floor(currentSaldo * 0.0035); 
                    transaction.update(doc(db, "users", userDoc.id), { "finance.saldo_utama": currentSaldo + profitHarian, "finance.last_profit_calc": timestamp });
                    transaction.set(doc(collection(db, "profit_logs")), { uid: userDoc.id, amount: profitHarian, created_at: timestamp, desc: "Profit Mining Harian" });

                    if (u1Doc && u1Doc.exists()) {
                        const bonus = Math.floor(profitHarian * 0.10);
                        if (bonus > 0) {
                            transaction.update(doc(db, "users", u1Id), { "finance.saldo_utama": (u1Doc.data().finance?.saldo_utama || 0) + bonus });
                            transaction.set(doc(collection(db, "bonuses")), { uid: u1Id, amount: bonus, from_nama: uData.profile.nama, level: 1, created_at: timestamp, type: "PASSIVE" });
                        }
                    }
                    if (u2Doc && u2Doc.exists()) {
                        const bonus = Math.floor(profitHarian * 0.05);
                        if (bonus > 0) {
                            transaction.update(doc(db, "users", u2Id), { "finance.saldo_utama": (u2Doc.data().finance?.saldo_utama || 0) + bonus });
                            transaction.set(doc(collection(db, "bonuses")), { uid: u2Id, amount: bonus, from_nama: uData.profile.nama, level: 2, created_at: timestamp, type: "PASSIVE" });
                        }
                    }
                    if (u3Doc && u3Doc.exists()) {
                        const bonus = Math.floor(profitHarian * 0.02);
                        if (bonus > 0) {
                            transaction.update(doc(db, "users", u3Id), { "finance.saldo_utama": (u3Doc.data().finance?.saldo_utama || 0) + bonus });
                            transaction.set(doc(collection(db, "bonuses")), { uid: u3Id, amount: bonus, from_nama: uData.profile.nama, level: 3, created_at: timestamp, type: "PASSIVE" });
                        }
                    }
                });
                processedCount++;
            }
        }
        alert(`✅ SUKSES! Profit dibagikan ke ${processedCount} member.`);
        fetchStatsAndUsers(); 
    } catch (e:any) { alert("Gagal: " + e.message); } finally { setIsProfitRunning(false); }
  };

  const handleApproveDeposit = async (req: any) => {
    if (!confirm(`Terima Deposit Rp ${req.total_transfer.toLocaleString()}?`)) return;
    setProcessingId(req.id);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", req.user_uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw "User tidak ditemukan!";
        const userData = userDoc.data();
        const u1Id = userData.network?.upline_1; const u2Id = userData.network?.upline_2; const u3Id = userData.network?.upline_3;
        let u1Doc, u2Doc, u3Doc;
        if (u1Id) u1Doc = await transaction.get(doc(db, "users", u1Id));
        if (u2Id) u2Doc = await transaction.get(doc(db, "users", u2Id));
        if (u3Id) u3Doc = await transaction.get(doc(db, "users", u3Id));

        const timestamp = new Date().toISOString();
        const base = req.amount_base || req.total_transfer;
        transaction.update(userRef, { "finance.saldo_utama": (userData.finance?.saldo_utama || 0) + req.total_transfer });

        if (u1Doc && u1Doc.exists()) {
            const bonus = base * 0.05;
            transaction.update(doc(db, "users", u1Id), { "finance.saldo_utama": (u1Doc.data().finance?.saldo_utama || 0) + bonus });
            transaction.set(doc(collection(db, "bonuses")), { uid: u1Id, from_nama: userData.profile.nama, level: 1, amount: bonus, created_at: timestamp, type: "REFERRAL" });
        }
        if (u2Doc && u2Doc.exists()) {
            const bonus = base * 0.03;
            transaction.update(doc(db, "users", u2Id), { "finance.saldo_utama": (u2Doc.data().finance?.saldo_utama || 0) + bonus });
            transaction.set(doc(collection(db, "bonuses")), { uid: u2Id, from_nama: userData.profile.nama, level: 2, amount: bonus, created_at: timestamp, type: "REFERRAL" });
        }
        if (u3Doc && u3Doc.exists()) {
            const bonus = base * 0.01;
            transaction.update(doc(db, "users", u3Id), { "finance.saldo_utama": (u3Doc.data().finance?.saldo_utama || 0) + bonus });
            transaction.set(doc(collection(db, "bonuses")), { uid: u3Id, from_nama: userData.profile.nama, level: 3, amount: bonus, created_at: timestamp, type: "REFERRAL" });
        }
        transaction.update(doc(db, "deposits", req.id), { status: "approved", process_date: timestamp });
      });
      alert("✅ Deposit Diterima & Bonus Terkirim."); fetchAllRequests(); fetchStatsAndUsers();
    } catch (e: any) { alert("Error: " + e.message); } finally { setProcessingId(null); }
  };

  const handleCancelDeposit = async (id: string) => {
    if (!confirm("Tolak deposit ini?")) return;
    setProcessingId(id);
    try { await updateDoc(doc(db, "deposits", id), { status: "rejected" }); fetchAllRequests(); } catch (e) { alert("Gagal."); } finally { setProcessingId(null); }
  };

  const handleApproveWD = async (req: any) => {
    const transferBersih = req.net_amount || req.amount; 
    if (!confirm(`Setujui WD dari ${req.user_nama}?\n\nSaldo Terpotong: ${formatIDR(req.amount)}\nTransfer Bersih: ${formatIDR(transferBersih)}\n\nLanjutkan?`)) return;
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
      alert("✅ WD Sukses!"); fetchAllRequests(); fetchStatsAndUsers();
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
                 <button onClick={handleRunDailyProfit} disabled={isProfitRunning} className={`px-6 py-2 rounded font-bold shadow-[0_0_15px_rgba(34,197,94,0.5)] transition ${isProfitRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 animate-pulse'}`}>
                    {isProfitRunning ? "⏳ SEDANG MEMPROSES..." : "⚡ JALANKAN PROFIT HARIAN"}
                </button>
                <button onClick={() => router.push('/dashboard')} className="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded text-xs transition">Back to App</button>
            </div>
        </div>

        {/* STATISTIK CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* TABS NAVIGATION */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
            <button onClick={() => setActiveTab("REQUESTS")} className={`pb-2 font-bold px-4 ${activeTab === "REQUESTS" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-500 hover:text-white"}`}>TRANSAKSI & ANTRIAN</button>
            <button onClick={() => setActiveTab("USERS")} className={`pb-2 font-bold px-4 ${activeTab === "USERS" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}>DATABASE USERS</button>
        </div>

        {/* TAB 1: REQUESTS */}
        {activeTab === "REQUESTS" && (
            <div className="grid md:grid-cols-2 gap-10">
                <div>
                    <h2 className="text-lg font-bold text-yellow-500 mb-4">📥 DEPOSIT PENDING ({depoRequests.length})</h2>
                    {depoRequests.length === 0 ? <p className="text-gray-600 text-xs italic">Tidak ada antrian.</p> : 
                     depoRequests.map(req => (
                        <div key={req.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl mb-3 flex flex-col gap-3">
                            <div className="flex justify-between">
                                <div><div className="font-bold text-sm">{req.user_nama}</div><div className="text-xs text-gray-500">ID: ...{req.user_uid.slice(-4)}</div></div>
                                <div className="text-right"><div className="text-sm font-bold text-yellow-400">{formatIDR(req.total_transfer)}</div></div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-800">
                                <button disabled={!!processingId} onClick={() => handleCancelDeposit(req.id)} className="flex-1 py-2 border border-red-900/50 text-red-500 text-xs rounded hover:bg-red-900/10">TOLAK</button>
                                <button disabled={!!processingId} onClick={() => handleApproveDeposit(req)} className="flex-1 py-2 bg-yellow-600 text-black font-bold text-xs rounded hover:bg-yellow-500">TERIMA & BONUS</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-blue-500 mb-4">📤 WITHDRAW PENDING ({wdRequests.length})</h2>
                    {wdRequests.length === 0 ? <p className="text-gray-600 text-xs italic">Tidak ada antrian.</p> :
                     wdRequests.map(req => (
                        <div key={req.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl mb-3 flex flex-col gap-3 relative">
                            <div className="absolute top-0 right-0 bg-red-900/50 text-red-200 text-[9px] px-3 py-1 rounded-bl-lg font-bold">Potong: {formatIDR(req.amount)}</div>
                            <div className="flex justify-between mt-4">
                                <div><div className="font-bold text-sm">{req.user_nama}</div><div className="text-[10px] text-cyan-400 mt-1">{req.ewallet}</div></div>
                                <div className="text-right"><div className="text-[10px] text-gray-500 mb-1">Netto (Transfer):</div><div className="text-xl font-black text-green-400">{formatIDR(req.net_amount || req.amount)}</div></div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-800">
                                <button disabled={!!processingId} onClick={() => handleRejectWD(req.id)} className="flex-1 py-2 border border-gray-600 text-gray-400 text-xs rounded hover:bg-gray-800">BATAL</button>
                                <button disabled={!!processingId} onClick={() => handleApproveWD(req)} className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-500">APPROVE</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TAB 2: DATABASE USERS LENGKAP DENGAN TOMBOL HAPUS */}
        {activeTab === "USERS" && (
            <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#1a1a1a] text-gray-400 text-xs">
                            <tr>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('nama')}>NAMA {sortConfig.key==='nama' ? (sortConfig.direction==='asc'?'↑':'↓'):''}</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('hp')}>KONTAK {sortConfig.key==='hp' ? (sortConfig.direction==='asc'?'↑':'↓'):''}</th>
                                <th className="p-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('saldo')}>SALDO (ASET) {sortConfig.key==='saldo' ? (sortConfig.direction==='asc'?'↑':'↓'):''}</th>
                                <th className="p-4 text-center cursor-pointer hover:text-white" onClick={() => handleSort('d1')}>TIM (LVL 1|2|3)</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('created_at')}>TGL DAFTAR {sortConfig.key==='created_at' ? (sortConfig.direction==='asc'?'↑':'↓'):''}</th>
                                <th className="p-4 text-center text-red-500">AKSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-300">
                            {usersList.map((user, idx) => (
                                <tr key={user.uid} className="hover:bg-[#151515] transition">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{user.nama}</div>
                                        <div className="text-[10px] text-gray-600 font-mono">{user.uid.slice(0, 8)}...</div>
                                    </td>
                                    <td className="p-4">
                                        <div>{user.hp}</div>
                                        <div className="text-[10px] text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="p-4 text-right font-bold text-yellow-500">
                                        {formatIDR(user.saldo)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-1 text-[10px]">
                                            <span className="bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded" title="Level 1">{user.d1}</span>
                                            <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded" title="Level 2">{user.d2}</span>
                                            <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded" title="Level 3">{user.d3}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleDeleteUserAdmin(user.uid, user.nama)} 
                                            className="bg-red-900/30 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition"
                                            title="Hapus Permanen Akun Ini"
                                        >
                                            HAPUS
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}