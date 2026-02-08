"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [nama, setNama] = useState("");
  const [bankName, setBankName] = useState("");
  const [rekNumber, setRekNumber] = useState("");
  const [rekName, setRekName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNama(data.profile?.nama || "");
        // Load Bank Info (Jika ada)
        setBankName(data.profile?.bank_name || "");
        setRekNumber(data.profile?.rek_number || "");
        setRekName(data.profile?.rek_name || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, "users", user.uid), {
            "profile.nama": nama,
            "profile.bank_name": bankName,
            "profile.rek_number": rekNumber,
            "profile.rek_name": rekName
        });
        alert("✅ Profil & Rekening Berhasil Disimpan!");
    } catch (err) {
        alert("Gagal menyimpan data.");
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse">LOADING PROFILE...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-10">
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold tracking-wide">EDIT PROFILE</h1>
      </nav>

      <main className="max-w-md mx-auto px-4 pt-6">
        <form onSubmit={handleSave} className="space-y-6">
            
            {/* PERSONAL INFO */}
            <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">Data Diri</h3>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Nama Lengkap</label>
                    <input type="text" value={nama} onChange={e=>setNama(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-yellow-500" />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Email (Tidak bisa diubah)</label>
                    <input type="text" value={auth.currentUser?.email || ""} disabled className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-gray-500 cursor-not-allowed" />
                </div>
            </div>

            {/* BANK INFO */}
            <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest border-b border-white/10 pb-2">Rekening Penarikan (WD)</h3>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Nama Bank / E-Wallet</label>
                    <input type="text" placeholder="Contoh: BCA / DANA / OVO" value={bankName} onChange={e=>setBankName(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Nomor Rekening</label>
                    <input type="number" placeholder="08xxxx / 123xxxx" value={rekNumber} onChange={e=>setRekNumber(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Atas Nama (Wajib Sama)</label>
                    <input type="text" placeholder="Nama Pemilik Rekening" value={rekName} onChange={e=>setRekName(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500" />
                </div>
            </div>

            <button disabled={isSaving} type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95">
                {isSaving ? "MENYIMPAN..." : "SIMPAN PERUBAHAN"}
            </button>

        </form>
      </main>
    </div>
  );
}