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
  getBlob
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const status = document.getElementById("status");
const readerArea = document.getElementById("readerArea");
const watermark = document.getElementById("watermark");
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

const prevButton = document.getElementById("prevPage");
const nextButton = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let loggedInEmail = "";
let expiryDateText = "";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

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
  loggedInEmail = email;

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

  expiryDateText = expiryDate.toDateString();

  await loadPdf();
}

async function loadPdf() {
  status.innerText = "Loading your protected book...";

  const pdfRef = ref(storage, "ChasingDreamsV02_27jul25.pdf");

  const pdfBlob = await getBlob(pdfRef);
  const arrayBuffer = await pdfBlob.arrayBuffer();

  pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  totalPages = pdfDoc.numPages;
  currentPage = 1;

  status.innerText = "";
  readerArea.style.display = "block";

  renderPage(currentPage);
}

async function renderPage(pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);

  const containerWidth = Math.min(window.innerWidth - 24, 1050);
  const viewportOriginal = page.getViewport({ scale: 1 });
  const scale = containerWidth / viewportOriginal.width;
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;

  pageInfo.innerText = `Page ${pageNumber} of ${totalPages}`;

  watermark.innerText =
    `Licensed to ${loggedInEmail}\nValid until ${expiryDateText}`;

  prevButton.disabled = pageNumber <= 1;
  nextButton.disabled = pageNumber >= totalPages;
}

prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextButton.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderPage(currentPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

window.addEventListener("resize", () => {
  if (pdfDoc) {
    renderPage(currentPage);
  }
});

document.addEventListener("keydown", function (event) {
  if (
    (event.ctrlKey || event.metaKey) &&
    ["s", "p", "u"].includes(event.key.toLowerCase())
  ) {
    event.preventDefault();
    alert("Download and print are disabled for this protected reader.");
  }
});

completeMagicLinkLogin().catch((error) => {
  console.error(error);
  status.innerText = "Login failed. Please request a new login link.";
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    checkAccess(user).catch((error) => {
      console.error(error);
      status.innerText = "Could not open your book.";
    });
  } else {
    status.innerText = "Please log in first.";
  }
});
