"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralInput(ref);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // KUNCI 1: Validasi Input Referral Tidak Boleh Kosong
    if (!referralInput.trim()) {
      alert("⚠️ KODE REFERRAL WAJIB DIISI! Pendaftaran Master Saving hanya melalui jalur undangan.");
      return;
    }

    setLoading(true);

    try {
      // KUNCI 2: Validasi Apakah Kode Referral Tersebut Ada di Database
      const q = query(collection(db, "users"), where("network.my_referral_code", "==", referralInput.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty && referralInput !== "MASTER-ADMIN") { // Tambahkan bypass khusus admin jika perlu
        alert("⚠️ KODE REFERRAL TIDAK VALID! Pastikan kode yang Anda masukkan benar.");
        setLoading(false);
        return;
      }

      // Ambil data upline 1
      let upline1Data = !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
      let u1Id = !querySnapshot.empty ? querySnapshot.docs[0].id : "ADMIN";
      let u2Id = upline1Data?.network?.upline_1 || "ADMIN";
      let u3Id = upline1Data?.network?.upline_2 || "ADMIN";

      // Proses Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate Kode Referral Baru untuk Member Baru
      const myRefCode = "MS-" + Math.random().toString(36).substring(2, 6).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

      await setDoc(doc(db, "users", user.uid), {
        profile: {
          nama: nama,
          hp: hp,
          email: email,
          created_at: new Date().toISOString(),
        },
        finance: {
          saldo_utama: 0,
          total_profit: 0,
          last_profit_calc: new Date().toISOString(),
        },
        network: {
          my_referral_code: myRefCode,
          upline_1: u1Id,
          upline_2: u2Id,
          upline_3: u3Id,
        }
      });

      alert("Pendaftaran Berhasil! Selamat datang di jaringan Master Saving.");
      router.push("/dashboard");
    } catch (err: any) {
      alert("Gagal Daftar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        
        <div className="text-center mb-6">
          <h1 className="text-xl font-black tracking-widest text-yellow-500">JOIN MASTER SAVING</h1>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Sistem Eksklusif Berbasis Undangan</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase">Nama Lengkap</label>
            <input type="text" required value={nama} onChange={e => setNama(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm outline-none focus:border-yellow-500 transition" placeholder="Sesuai KTP" />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase">Email Aktif</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm outline-none focus:border-yellow-500 transition" placeholder="nama@email.com" />
            <p className="text-[9px] text-yellow-600 italic mt-1 ml-1 leading-tight">
              ⚠️ Gunakan email aktif untuk fitur reset password.
            </p>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase">Nomor WhatsApp</label>
            <input type="number" required value={hp} onChange={e => setHp(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm outline-none focus:border-yellow-500 transition" placeholder="0812xxxx" />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase">Buat Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm outline-none focus:border-yellow-500 transition" placeholder="Minimal 6 Karakter" />
          </div>

          <div className="pt-2">
            <label className="text-[10px] text-red-500 font-bold ml-1 uppercase">Kode Referral (Wajib)</label>
            <input 
              type="text" 
              required 
              value={referralInput} 
              onChange={e => setReferralInput(e.target.value)} 
              className="w-full bg-red-900/10 border border-red-900/30 rounded-lg p-2.5 text-sm text-yellow-500 font-mono outline-none focus:border-red-500" 
              placeholder="Masukkan kode undangan" 
            />
            <p className="text-[9px] text-gray-600 italic mt-1 ml-1">
              *Pendaftaran memerlukan kode valid dari pengundang Anda.
            </p>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black py-3 rounded-lg text-xs uppercase tracking-widest transition mt-4 disabled:opacity-50">
            {loading ? "MENGECEK KODE..." : "KONFIRMASI PENDAFTARAN"}
          </button>
        </form>

        <p className="text-[10px] text-center text-gray-500 mt-6">
          Sudah punya akun? <Link href="/login" className="text-yellow-500 font-bold hover:underline underline-offset-4">LOGIN DISINI</Link>
        </p>
      </div>
    </div>
  );
}