"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memberCount, setMemberCount] = useState(1250);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setIsLoggedIn(true);
    });

    // --- LOGIKA MEMBER DINAMIS (Bulan + Hari + Menit) ---
    const calculateMember = () => {
        const now = new Date();
        const m = (now.getMonth() + 1) % 10; // Ambil 1 digit bulan terakhir
        const d = now.getDate() % 10;        // Ambil 1 digit tanggal terakhir
        const min = now.getMinutes().toString().padStart(2, '0'); // 2 digit menit
        
        // Gabungkan: misal Bulan 2, Tanggal 12, Menit 45 -> 2245 Member
        const fakeTotal = parseInt(`${m}${d}${min}`);
        // Pastikan tidak terlalu sedikit (minimal 1000an)
        setMemberCount(fakeTotal < 1000 ? fakeTotal + 1000 : fakeTotal);
    };

    calculateMember();
    const interval = setInterval(calculateMember, 60000); // Update tiap menit

    return () => { unsubscribe(); clearInterval(interval); }
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
                <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition">DASHBOARD</button>
            ) : (
                <>
                    <button onClick={() => router.push("/login")} className="text-sm font-bold text-gray-300 hover:text-white transition">MASUK</button>
                    <button onClick={() => router.push("/register")} className="px-5 py-2 bg-yellow-600 text-black font-bold rounded-full hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/20">DAFTAR</button>
                </>
            )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative pt-32 pb-20 px-4 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-yellow-600/20 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
            <span className="inline-block py-1 px-3 rounded-full bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-xs font-bold tracking-widest mb-4">
                🚀 PLATFORM ASET DIGITAL TERPERCAYA
            </span>
            {/* REVISI COPYWRITING: Lebih Halus & Realistis */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
                OPTIMALKAN <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700">
                    NILAI ASET ANDA
                </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Solusi cerdas menumbuhkan portofolio digital Anda secara otomatis. 
                Nikmati bagi hasil harian dan sistem komunitas yang transparan.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
                <button onClick={() => router.push("/register")} className="px-8 py-4 bg-white text-black font-black text-lg rounded-full hover:scale-105 transition shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    MULAI SEKARANG ➜
                </button>
                <button onClick={() => router.push("/login")} className="px-8 py-4 border border-gray-700 text-gray-300 font-bold text-lg rounded-full hover:bg-gray-900 transition">
                    LOGIN MEMBER
                </button>
            </div>
        </div>
      </header>

      {/* STATS SECTION (Dinamic Fake Data) */}
      <section className="py-10 border-y border-white/5 bg-black/50">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
                <h3 className="text-3xl font-black text-white">{memberCount.toLocaleString("id-ID")}+</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total Member</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-yellow-500">0.35%</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Growth Harian</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-green-500">99.9%</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Uptime Server</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-blue-500">Auto</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Withdrawal</p>
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