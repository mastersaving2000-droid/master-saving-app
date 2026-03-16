"use client";
import { useEffect, useState, Suspense } from "react";
// Pastikan path import ini sesuai (gunakan ../.. jika file ada di src/app/register)
import { auth, db } from "../../lib/firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

// Next.js mewajibkan komponen yang memakai useSearchParams dibungkus Suspense
export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-cyan-400">LOADING SYSTEM...</div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    hp: "",
    password: "",
    confirmPassword: "", 
    referralCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- LOGIKA AUTO-INPUT REFERRAL DARI LINK ---
  useEffect(() => {
    const refFromUrl = searchParams.get("ref");
    if (refFromUrl) {
      setFormData((prev) => ({ ...prev, referralCode: refFromUrl }));
    }
  }, [searchParams]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // --- VALIDASI PASSWORD ---
    if (formData.password !== formData.confirmPassword) {
      setError("Password tidak sama! Harap ulangi ketik password.");
      setLoading(false);
      return; 
    }

    if (formData.password.length < 6) {
        setError("Password minimal 6 karakter.");
        setLoading(false);
        return;
    }

    try {
      let upline1 = null;
      let upline2 = null;
      let upline3 = null;

      // --- LOGIKA REFERRAL ---
      if (formData.referralCode === "ADMIN") {
        console.log("Genesis User detected");
      } else {
        const q = query(
            collection(db, "users"), 
            where("network.my_referral_code", "==", formData.referralCode)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Kode Referral TIDAK VALID! Gunakan kode upline yang benar.");
        }

        const uplineDoc = querySnapshot.docs[0].data();
        upline1 = uplineDoc.uid;
        upline2 = uplineDoc.network?.upline_1 || null;
        upline3 = uplineDoc.network?.upline_2 || null;
      }

      // 1. Buat Akun Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // 2. Generate Kode Referral Baru
      const codePrefix = formData.nama.substring(0, 3).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newReferralCode = `${codePrefix}${randomNum}`;

      // 3. Simpan Data Profil
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        profile: {
          nama: formData.nama,
          email: formData.email,
          hp: formData.hp,
          join_date: new Date().toISOString(),
        },
        finance: {
          saldo_utama: 0,
          last_profit_calc: new Date().toISOString(),
        },
        network: {
          my_referral_code: newReferralCode,
          upline_1: upline1,
          upline_2: upline2,
          upline_3: upline3,
        },
        role: "user"
      });

      alert(`Registrasi Berhasil! Kode Referral Kamu: ${newReferralCode}`);
      router.push("/dashboard"); 

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white font-sans">
      <div className="glass-panel p-8 rounded-xl max-w-md w-full shadow-[0_0_40px_rgba(0,243,255,0.15)] border border-gray-800 bg-gray-900/50 backdrop-blur">
        <h2 className="text-3xl font-bold text-center mb-6 neon-text text-cyan-400 italic">
          SYSTEM REGISTER
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <input 
            className="w-full p-3 rounded border border-gray-700 bg-black/50 focus:border-cyan-400 outline-none transition-all text-white"
            name="nama" placeholder="Nama Lengkap" value={formData.nama} onChange={handleChange} required 
          />
          <input 
            className="w-full p-3 rounded border border-gray-700 bg-black/50 focus:border-cyan-400 outline-none transition-all text-white"
            name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required 
          />
          <input 
            className="w-full p-3 rounded border border-gray-700 bg-black/50 focus:border-cyan-400 outline-none transition-all text-white"
            name="hp" type="tel" placeholder="Nomor WA (08xxx)" value={formData.hp} onChange={handleChange} required 
          />
          
          <div className="grid grid-cols-2 gap-2">
            <input 
                className="w-full p-3 rounded border border-gray-700 bg-black/50 focus:border-cyan-400 outline-none transition-all text-white"
                name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required 
            />
            <input 
                className="w-full p-3 rounded border border-gray-700 bg-black/50 focus:border-cyan-400 outline-none transition-all text-white"
                name="confirmPassword" type="password" placeholder="Ulangi Pass" value={formData.confirmPassword} onChange={handleChange} required 
            />
          </div>
          
          <div className="pt-2 border-t border-gray-800 mt-4">
            <p className="text-xs text-purple-400 mb-1 font-bold">KODE REFERRAL (WAJIB)</p>
            <div className="relative">
              <input 
                className={`w-full p-3 rounded border bg-purple-900/10 focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] outline-none text-white transition-all ${formData.referralCode ? 'border-green-500' : 'border-purple-500'}`}
                name="referralCode" 
                placeholder="Masukkan Kode Upline / ADMIN" 
                value={formData.referralCode} 
                onChange={handleChange} 
                required 
              />
              {searchParams.get("ref") && (
                <span className="absolute right-3 top-2.5 text-[9px] bg-green-900 text-green-400 px-2 py-1 rounded font-bold">LINK AKTIF</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-tighter"
          >
            {loading ? "CONNECTING NETWORK..." : "JOIN NETWORK NOW"}
          </button>
        </form>
      </div>
    </div>
  );
}