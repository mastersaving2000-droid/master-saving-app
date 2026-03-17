"use client";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // --- STATE UNTUK FITUR LUPA PASSWORD ---
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // --- FUNGSI LOGIN UTAMA ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      alert("⚠️ Gagal Login: Cek kembali Email dan Password Anda.");
      setLoading(false);
    }
  };

  // --- FUNGSI RESET PASSWORD VIA EMAIL ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      alert("Masukkan email Anda terlebih dahulu!");
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert("✅ Link reset password telah dikirim! Silakan cek Inbox atau folder Spam di email Anda.");
      setShowResetModal(false);
      setResetEmail("");
    } catch (err: any) {
      alert("⚠️ Gagal mengirim email. Pastikan email tersebut sudah terdaftar di sistem kami.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Dekorasi Vibe Coding */}
        <div className="absolute top-0 right-0 p-4">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>

        <div className="text-center mb-8 mt-4">
          <h1 className="text-2xl font-black tracking-widest text-yellow-500">MASTER SAVING</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Sistem Auto-Profit Berjalan</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-bold ml-1">Email Terdaftar</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition mt-1" 
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-end ml-1">
              <label className="text-xs text-gray-400 font-bold">Password</label>
              {/* TOMBOL PEMICU LUPA PASSWORD */}
              <button 
                type="button" 
                onClick={() => setShowResetModal(true)} 
                className="text-[10px] text-yellow-600 hover:text-yellow-400 transition"
              >
                Lupa Password?
              </button>
            </div>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition mt-1" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black py-3 rounded-lg text-sm transition mt-2 disabled:opacity-50"
          >
            {loading ? "MEMVERIFIKASI..." : "MASUK KE DASHBOARD"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 mt-6">
          Belum punya akun? <Link href="/register" className="text-yellow-500 font-bold hover:underline">Daftar Disini</Link>
        </p>
      </div>

      {/* --- MODAL POPUP LUPA PASSWORD --- */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#151515] w-full max-w-sm rounded-2xl border border-yellow-600/30 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-lg">Reset Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-gray-500 font-bold text-xl hover:text-white transition">✕</button>
            </div>
            
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Masukkan alamat email yang Anda gunakan saat mendaftar. Kami akan mengirimkan tautan aman untuk membuat password baru.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input 
                type="email" 
                required
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)} 
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition" 
                placeholder="Masukkan email Anda..."
              />
              <button 
                type="submit" 
                disabled={isResetting} 
                className="w-full bg-white text-black font-bold py-3 rounded-lg text-sm hover:bg-gray-200 transition disabled:opacity-50"
              >
                {isResetting ? "MENGIRIM..." : "KIRIM LINK RESET"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}