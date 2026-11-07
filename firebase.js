import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
const loginBtn = document.getElementById("gate-btn");
const regBtn = document.getElementById("gate-reg");
const emailIn = document.getElementById("g-email");
const passIn = document.getElementById("g-pass");

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

const ERRORS = {
  "auth/invalid-email": "El correo no es válido.",
  "auth/missing-password": "Escribí la contraseña.",
  "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres.",
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta. Tocá Iniciar sesión.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/too-many-requests": "Demasiados intentos. Esperá un rato.",
  "auth/network-request-failed": "Sin conexión. Revisá internet."
};
const fail = e => { gateMsg.textContent = ERRORS[e.code] || "No se pudo completar (" + e.code + ")."; };

async function login() {
  gateMsg.textContent = "Entrando…";
  try { await signInWithEmailAndPassword(auth, emailIn.value.trim(), passIn.value); }
  catch (e) { fail(e); }
}

async function register() {
  gateMsg.textContent = "Creando tu cuenta…";
  try { await createUserWithEmailAndPassword(auth, emailIn.value.trim(), passIn.value); }
  catch (e) { fail(e); }
}

async function logout() {
  await signOut(auth);
  localStorage.removeItem("plato-v1");
  location.reload();
}

loginBtn.onclick = login;
regBtn.onclick = register;
passIn.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
authBtn.onclick = logout;

onAuthStateChanged(auth, async user => {
  uid = user ? user.uid : null;
  statusEl.textContent = user ? "Conectado como " + user.email : "Sin sesión";

  if (!user) {
    // Sin sesión: no se usa ni se conserva nada en este navegador
    localStorage.removeItem("plato-v1");
    document.body.classList.add("locked");
    gateMsg.textContent = "Iniciá sesión o creá una cuenta para ver y guardar tus comidas.";
    return;
  }

  gateMsg.textContent = "Cargando tus datos…";
  try {
    const snap = await getDoc(ref());
    if (snap.exists()) window.platoSet(snap.data().state); // la nube manda
    else pushState(window.platoGet());                     // primera vez: subimos lo que haya
    document.body.classList.remove("locked");
  } catch (e) {
    gateMsg.textContent = "No se pudieron cargar tus datos. Revisá la conexión y recargá la página.";
  }
});
