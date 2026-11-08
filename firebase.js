import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Clave pública VAPID de Cloud Messaging (es pública, no es un secreto)
const VAPID_KEY = "BHEv4b9bWvwjhJDCXzdI6YW3FQ0q1_f0J4bvM6PfOD6r5BXLZKBTQxarsCIGmq74B0YY9JMyOnG2MrPIxdYceRU";

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
enableIndexedDbPersistence(db).catch(() => {}); // si falla (varias pestañas), la app sigue igual
setPersistence(auth, browserLocalPersistence); // la sesión queda guardada en este dispositivo

const statusEl = document.getElementById("auth-status");
const gateMsg = document.getElementById("gate-msg");
const authBtn = document.getElementById("auth-btn");
const enterBtn = document.getElementById("gate-btn");
const userIn = document.getElementById("g-user");
const passIn = document.getElementById("g-pass");

let uid = null, timer = null;
const ref = () => doc(db, "users", uid, "data", "main");

// Guarda en la nube con una pequeña pausa para no escribir en cada toque
function pushState(state) {
  if (!uid) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    setDoc(ref(), { state: JSON.parse(JSON.stringify(state)), updated: Date.now() });
    const d = new Date(), hoy = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (state.meals && state.meals.some(m => m.date === hoy)) {
      setDoc(doc(db, "users", uid, "data", "push"), { lastLogDate: hoy }, { merge: true });
    }
  }, 600);
}
window.platoPush = pushState;
window.platoToken = () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

// El usuario se convierte en un correo interno: nadie recibe mails
const emailOf = u => u + "@plato.app";

const ERRORS = {
  "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Esperá un rato.",
  "auth/network-request-failed": "Sin conexión. Revisá internet."
};

async function enter() {
  const name = userIn.value.trim().toLowerCase();
  const pass = passIn.value;
  if (!/^[a-z0-9._-]{3,20}$/.test(name)) {
    gateMsg.textContent = "El usuario tiene entre 3 y 20 letras, números, puntos o guiones.";
    return;
  }
  if (pass.length < 6) {
    gateMsg.textContent = "La contraseña tiene que tener al menos 6 caracteres.";
    return;
  }

  gateMsg.textContent = "Entrando…";
  try {
    await signInWithEmailAndPassword(auth, emailOf(name), pass);
  } catch (e) {
    if (e.code !== "auth/user-not-found" && e.code !== "auth/invalid-credential") {
      gateMsg.textContent = ERRORS[e.code] || "No se pudo entrar (" + e.code + ").";
      return;
    }
    // Si el usuario no existe, se crea la cuenta
    try {
      await createUserWithEmailAndPassword(auth, emailOf(name), pass);
    } catch (e2) {
      gateMsg.textContent = e2.code === "auth/email-already-in-use"
        ? "Contraseña incorrecta para ese usuario."
        : (ERRORS[e2.code] || "No se pudo crear la cuenta (" + e2.code + ").");
    }
  }
}

async function logout() {
  await signOut(auth);
  localStorage.removeItem("plato-v1");
  location.reload();
}

window.platoEnableReminder = async hour => {
  if (!uid) return "Iniciá sesión primero.";
  if (typeof Notification === "undefined") return "Instalá la app en la pantalla de inicio para activar los avisos.";
  if (!(await isSupported())) return "Este navegador no soporta notificaciones.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "No diste permiso. Podés cambiarlo en los ajustes del celular.";
  const reg = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return "No se pudo registrar el dispositivo.";
  await setDoc(doc(db, "users", uid, "data", "push"), { token, hour, lastLogDate: "" }, { merge: true });
  return "Listo. Te avisamos a las " + hour + ":00 si no registraste comidas.";
};

enterBtn.onclick = enter;
passIn.addEventListener("keydown", e => { if (e.key === "Enter") enter(); });
authBtn.onclick = logout;

onAuthStateChanged(auth, async user => {
  uid = user ? user.uid : null;
  statusEl.textContent = user ? "Conectado como " + user.email.split("@")[0] : "Sin sesión";

  if (!user) {
    // Sin sesión: no se usa ni se conserva nada en este navegador
    localStorage.removeItem("plato-v1");
    document.body.classList.add("locked");
    gateMsg.textContent = "Escribí tu usuario y contraseña. Si es la primera vez, se crea tu cuenta.";
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
