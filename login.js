import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  sendSignInLinkToEmail
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.sendLoginLink = async function () {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const message = document.getElementById("message");

  if (!email) {
    message.innerText = "Please enter your email address.";
    return;
  }

  const actionCodeSettings = {
    url: "https://vmungale.github.io/uktoindia/reader.html",
    handleCodeInApp: true
  };

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem("emailForSignIn", email);
    message.innerText = "Login link sent. Please check your email.";
  } catch (error) {
    console.error(error);
    message.innerText = "Something went wrong. Please try again.";
  }
};
