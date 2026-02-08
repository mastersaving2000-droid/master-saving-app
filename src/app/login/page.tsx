"use client";
import { useState } from "react";
import { auth } from "../../lib/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

// --- KONFIGURASI TELEGRAM ---
const TELEGRAM_BOT_TOKEN = "8487855373:AAEZ8Al7Su6BzqCECCuF7iRgULk1bBS7Ly0";
const TELEGRAM_CHAT_ID = "788284460";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("Email atau Password salah!");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Terlalu banyak mencoba. Tunggu sebentar.");
      } else {
        setError("Gagal Login: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA LUPA PASSWORD KE TELEGRAM ---
  const handleLostPassword = async () => {
    const email = prompt("Masukkan Email Anda untuk reset password:");
    if (!email) return;

    try {
      // Kirim Notifikasi ke Telegram Admin
      const text = `
🚨 *REQUEST RESET PASSWORD*
---------------------------
📧 Email: ${email}
---------------------------
Mohon Admin cek database, reset password user ini, dan kirim password baru via WA.
      `;
      
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
      
      await fetch(url);
      
      alert("Permintaan Reset Password TERKIRIM! Admin akan mengirim password baru ke WhatsApp Anda.");
    } catch (e) {
      alert("Gagal mengirim permintaan. Cek koneksi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-panel p-8 rounded-xl max-w-md w-full shadow-[0_0_40px_rgba(188,19,254,0.15)] border border-purple-900/50 relative z-10 bg-black/50 backdrop-blur-md">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold neon-text text-purple-500 tracking-tighter">
            LOGIN
          </h1>
          <p className="text-gray-400 text-xs mt-2 tracking-widest">MASTER SAVING SYSTEM</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-purple-400 text-xs mb-1 ml-1">IDENTITY (EMAIL)</label>
            <input 
              className="w-full p-3 rounded bg-black/50 border border-gray-700 focus:border-purple-500 focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] outline-none transition-all text-white"
              name="email" type="email" placeholder="user@email.com" onChange={handleChange} required 
            />
          </div>

          <div>
            <label className="block text-purple-400 text-xs mb-1 ml-1">ACCESS KEY (PASSWORD)</label>
            <input 
              className="w-full p-3 rounded bg-black/50 border border-gray-700 focus:border-purple-500 focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] outline-none transition-all text-white"
              name="password" type="password" placeholder="••••••" onChange={handleChange} required 
            />
            {/* Tombol Lupa Password via Telegram */}
            <div className="flex justify-end mt-2">
              <button 
                type="button"
                onClick={handleLostPassword}
                className="text-xs text-gray-500 hover:text-purple-400 underline transition-colors"
              >
                Lupa Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 text-white font-bold py-3 rounded shadow-lg transition-all transform hover:scale-[1.02]"
          >
            {loading ? "AUTHENTICATING..." : "ACCESS SYSTEM"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800 pt-4">
          <p className="text-gray-500 text-sm">Belum punya akun?</p>
          <button 
            onClick={() => router.push('/register')}
            className="text-cyan-400 hover:text-cyan-300 font-bold mt-1"
          >
            DAFTAR SEKARANG
          </button>
        </div>

      </div>
    </div>
  );
}