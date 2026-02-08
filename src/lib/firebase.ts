// src/lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config dari Firebase Console kamu
const firebaseConfig = {
  apiKey: "AIzaSyBfoTizsOMtLH9qrvIUXJ4_9MyDYHKsf1w",
  authDomain: "cryptosaver2000.firebaseapp.com",
  projectId: "cryptosaver2000",
  storageBucket: "cryptosaver2000.firebasestorage.app",
  messagingSenderId: "397910737918",
  appId: "1:397910737918:web:3eaebfdbfe7b80486276af"
};

// Cek apakah firebase sudah jalan? Kalau belum, jalankan.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };