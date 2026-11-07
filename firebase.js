import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
const btn = document.getElementById("auth-btn");
const status = document.getElementById("auth-status");
let uid = null, timer = null;

const ref = () => doc(db, "users", uid, "data", "main");

// Guarda el estado con una pequeña pausa para no escribir en cada toque
function pushState(state) {
  if (!uid) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    setDoc(ref(), { state: JSON.parse(JSON.stringify(state)), updated: Date.now() });
  }, 600);
}
window.platoPush = pushState;

btn.onclick = () => auth.currentUser
  ? signOut(auth)
  : signInWithPopup(auth, new GoogleAuthProvider());

onAuthStateChanged(auth, async user => {
  uid = user ? user.uid : null;
  btn.textContent = user ? "Cerrar sesión" : "Iniciar sesión con Google";
  status.textContent = user
    ? "Conectado como " + user.email
    : "Sin sesión: los datos solo quedan en este dispositivo";
  if (!user) return;
  const snap = await getDoc(ref());
  if (snap.exists()) window.platoSet(snap.data().state); // ya hay datos en la nube
  else pushState(window.platoGet());                     // primera vez: subimos los locales
});
