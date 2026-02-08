"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, getCountFromServer } from "firebase/firestore";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({ member: 1250, totalPaid: 85000000 }); // Data Palsu awal

  useEffect(() => {
    // Cek status login
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setIsLoggedIn(true);
    });

    // Ambil Real Stats
    const fetchStats = async () => {
        try {
            const snap = await getCountFromServer(collection(db, "users"));
            setStats(prev => ({ ...prev, member: 1250 + snap.data().count }));
        } catch (e) { console.log("Offline mode"); }
    };
    fetchStats();

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur border-b border-white/10 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-lg flex items-center justify-center font-black text-black text-xl shadow-[0_0_15px_rgba(234,179,8,0.4)]">M</div>
            <span className="font-bold tracking-wider text-xl">MASTER SAVING</span>
          </div>
        <div className="flex gap-4">
            {isLoggedIn ? (
                <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition">
                    DASHBOARD
                </button>
            ) : (
                <>
                    <button onClick={() => router.push("/login")} className="text-sm font-bold text-gray-300 hover:text-white transition">MASUK</button>
                    <button onClick={() => router.push("/register")} className="px-5 py-2 bg-yellow-600 text-black font-bold rounded-full hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/20">
                        DAFTAR
                    </button>
                </>
            )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative pt-32 pb-20 px-4 text-center overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-yellow-600/20 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
            <span className="inline-block py-1 px-3 rounded-full bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-xs font-bold tracking-widest mb-4">
                🚀 PLATFORM TABUNGAN CERDAS #1
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
                GANDAKAN ASET <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700">
                    TANPA BEKERJA
                </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Sistem pintar yang bekerja 24/7 untuk mengembangkan aset digital Anda. 
                Nikmati profit mingguan, bonus jaringan, dan penarikan instan.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
                <button onClick={() => router.push("/register")} className="px-8 py-4 bg-white text-black font-black text-lg rounded-full hover:scale-105 transition shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    MULAI HASILKAN CUAN ➜
                </button>
                <button onClick={() => router.push("/login")} className="px-8 py-4 border border-gray-700 text-gray-300 font-bold text-lg rounded-full hover:bg-gray-900 transition">
                    MEMBER LOGIN
                </button>
            </div>
        </div>
      </header>

      {/* STATS SECTION */}
      <section className="py-10 border-y border-white/5 bg-black/50">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
                <h3 className="text-3xl font-black text-white">{stats.member.toLocaleString("id-ID")}+</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total Member</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-yellow-500">2.5%</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Profit Mingguan</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-green-500">24/7</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">System Online</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-blue-500">Instant</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Withdrawal</p>
            </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">KENAPA MEMILIH KAMI?</h2>
            <div className="grid md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="p-8 rounded-2xl bg-[#111] border border-white/10 hover:border-yellow-500/50 transition hover:-translate-y-2">
                    <div className="w-12 h-12 bg-yellow-900/20 rounded-lg flex items-center justify-center text-2xl mb-4">💰</div>
                    <h3 className="text-xl font-bold mb-2">Passive Income</h3>
                    <p className="text-gray-400 text-sm">Biarkan uang bekerja untuk Anda. Profit dihitung real-time setiap detik tanpa henti.</p>
                </div>
                {/* Card 2 */}
                <div className="p-8 rounded-2xl bg-[#111] border border-white/10 hover:border-purple-500/50 transition hover:-translate-y-2">
                    <div className="w-12 h-12 bg-purple-900/20 rounded-lg flex items-center justify-center text-2xl mb-4">🤝</div>
                    <h3 className="text-xl font-bold mb-2">Network Bonus</h3>
                    <p className="text-gray-400 text-sm">Dapatkan komisi hingga 3 Level kedalaman. Ajak teman, aset Anda bertambah otomatis.</p>
                </div>
                {/* Card 3 */}
                <div className="p-8 rounded-2xl bg-[#111] border border-white/10 hover:border-green-500/50 transition hover:-translate-y-2">
                    <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center text-2xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold mb-2">Aman & Transparan</h3>
                    <p className="text-gray-400 text-sm">Semua riwayat transaksi tercatat rapi. Admin Panel canggih memantau semua aktivitas.</p>
                </div>
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/5">
        <p>&copy; 2026 Master Saving. All rights reserved.</p>
      </footer>
    </div>
  );
}