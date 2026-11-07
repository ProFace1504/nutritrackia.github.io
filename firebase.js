import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWWsxAlMgI-v9n6euOEigi789-8hO3Tz4",
  authDomain: "plato-82317.firebaseapp.com",
  projectId: "plato-82317",
  storageBucket: "plato-82317.firebasestorage.app",
  messagingSenderId: "22566822804",
  appId: "1:22566822804:web:3c449ac92dcc0e3a256581"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const statusEl = document.getElementById("auth-status");
const gateMsg = document.getElementById("gate-msg");
const authBtn = document.getElementById("auth-btn");
const gateBtn = document.getElementById("gate-btn");

let uid = null, timer = null;
const ref = () => doc(db, "users", uid, "data", "main");

// Guarda en la nube con una pequeña pausa para no escribir en cada toque
function pushState(state) {
  if (!uid) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    setDoc(ref(), { state: JSON.parse(JSON.stringify(state)), updated: Date.now() });
  }, 600);
}
window.platoPush = pushState;
window.platoToken = () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

async function login() {
  try {
