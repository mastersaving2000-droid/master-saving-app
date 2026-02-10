"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Rekening
  const [bankName, setBankName] = useState("");
  const [rekNumber, setRekNumber] = useState("");
  const [rekName, setRekName] = useState("");

  // Modal Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setBankName(data.profile?.bank_name || "");
          setRekNumber(data.profile?.rek_number || "");
          setRekName(data.profile?.rek_name || "");
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !rekNumber || !rekName) { alert("Lengkapi semua data bank!"); return; }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        "profile.bank_name": bankName.toUpperCase(),
        "profile.rek_number": rekNumber,
        "profile.rek_name": rekName.toUpperCase(),
      });
      alert("✅ Data Rekening Berhasil Diperbarui!");
    } catch (e) { alert("Gagal menyimpan data."); } finally { setIsSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setIsDeleting(true);
    try {
      // 1. Hapus data dari Database Firestore (Biar nomor HP/Email bisa dipakai lagi)
      await deleteDoc(doc(db, "users", auth.currentUser.uid));
      
      // 2. Hapus Autentikasi User (Biar akun benar-benar musnah)
      await deleteUser(auth.currentUser);
      
      alert("✅ Akun berhasil dihapus permanen.");
      router.push("/register");
    } catch (e: any) {
      // Firebase butuh login ulang (keamanan) jika sudah kelamaan login lalu mau hapus akun
      if (e.code === 'auth/requires-recent-login') {
        alert("⚠️ Demi keamanan, silakan LOGOUT lalu LOGIN KEMBALI terlebih dahulu sebelum menghapus akun.");
        signOut(auth);
      } else {
        alert("Gagal menghapus akun: " + e.message);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-yellow-500 animate-pulse">LOADING PROFILE...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 h-16 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold tracking-wide">PENGATURAN AKUN</h1>
      </nav>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* INFO AKUN UTAMA */}
        <div className="bg-[#111] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center text-2xl font-black text-black">
                    {userData?.profile?.nama?.charAt(0) || "U"}
                </div>
                <div>
                    <h2 className="text-xl font-bold">{userData?.profile?.nama}</h2>
                    <p className="text-sm text-gray-500">{userData?.profile?.hp}</p>
                </div>
            </div>
            <div className="pt-4 border-t border-white/5 text-xs text-gray-500 flex justify-between">
                <span>Referral: <span className="text-yellow-500 font-mono">{userData?.network?.my_referral_code}</span></span>
                <span>Terdaftar: {new Date(userData?.created_at || Date.now()).toLocaleDateString("id-ID")}</span>
            </div>
        </div>

        {/* SETTING REKENING BANK */}
        <div className="bg-[#111] border border-white/10 rounded-xl p-5">
            <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2">💳 REKENING PENARIKAN (WD)</h3>
            <form onSubmit={handleSaveBank} className="space-y-3">
                <div>
                    <label className="text-[10px] text-gray-500 uppercase">Nama Bank / E-Wallet</label>
                    <input type="text" placeholder="Contoh: BCA / DANA" value={bankName} onChange={e=>setBankName(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm focus:border-blue-500 outline-none" required />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 uppercase">Nomor Rekening</label>
                    <input type="number" placeholder="Contoh: 887123456" value={rekNumber} onChange={e=>setRekNumber(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm focus:border-blue-500 outline-none" required />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 uppercase">Nama Pemilik Rekening</label>
                    <input type="text" placeholder="Sesuai buku tabungan" value={rekName} onChange={e=>setRekName(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm focus:border-blue-500 outline-none" required />
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-2 transition">
                    {isSaving ? "MENYIMPAN..." : "SIMPAN REKENING"}
                </button>
            </form>
        </div>

        {/* DANGER ZONE (HAPUS AKUN) */}
        <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-5 mt-8">
            <h3 className="font-bold text-red-500 mb-2">⚠️ DANGER ZONE</h3>
            <p className="text-xs text-gray-400 mb-4">Ingin mengulang dari awal atau salah input data? Anda dapat menghapus akun secara permanen. Saldo yang tersisa akan hangus.</p>
            <button onClick={() => setShowDeleteModal(true)} className="w-full border border-red-600 text-red-500 font-bold py-2 rounded-lg hover:bg-red-600 hover:text-white transition">
                HAPUS AKUN SAYA
            </button>
        </div>

      </main>

      {/* MODAL KONFIRMASI HAPUS */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#151515] w-full max-w-sm rounded-2xl border border-red-900 p-6 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
                <h3 className="font-bold text-xl mb-2 text-white">Hapus Permanen?</h3>
                <p className="text-xs text-gray-400 mb-6">Tindakan ini tidak bisa dibatalkan. Nomor HP akan dibebaskan dan saldo saat ini akan hangus selamanya.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-800 text-white rounded font-bold hover:bg-gray-700">BATAL</button>
                    <button onClick={handleDeleteAccount} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white rounded font-bold hover:bg-red-500">
                        {isDeleting ? "MEMPROSES..." : "YA, HAPUS"}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}