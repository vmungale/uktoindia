import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  getStorage,
  ref,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const status = document.getElementById("status");
const readerArea = document.getElementById("readerArea");
const watermark = document.getElementById("watermark");
const pdfFrame = document.getElementById("pdfFrame");

async function completeMagicLinkLogin() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn");

    if (!email) {
      email = window.prompt("Please enter your email address again:");
    }

    email = email.trim().toLowerCase();

    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("emailForSignIn");

    window.history.replaceState({}, document.title, "reader.html");
  }
}

async function checkAccess(user) {
  const email = user.email.toLowerCase();

  const accessRef = doc(db, "access", email);
  const accessSnap = await getDoc(accessRef);

  if (!accessSnap.exists()) {
    status.innerText = "You do not have access yet. Please buy the book first.";
    return;
  }

  const data = accessSnap.data();

  if (data.status !== "active") {
    status.innerText = "Your access is not active.";
    return;
  }

  const expiryDate = data.accessExpires.toDate();
  const today = new Date();

  if (expiryDate < today) {
    status.innerText = "Your access has expired.";
    return;
  }

  const pdfRef = ref(storage, "ChasingDreamsV02_27jul25.pdf");
  const pdfUrl = await getDownloadURL(pdfRef);

  status.innerText = "";
  readerArea.style.display = "block";

  watermark.innerText =
    "Licensed to: " + email + " | Access valid until: " + expiryDate.toDateString();

  pdfFrame.src = pdfUrl;
}

completeMagicLinkLogin().catch((error) => {
  console.error(error);
  status.innerText = "Login failed. Please request a new login link.";
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    checkAccess(user).catch((error) => {
      console.error(error);
      status.innerText = "Could not check your access.";
    });
  } else {
    status.innerText = "Please log in first.";
  }
});
