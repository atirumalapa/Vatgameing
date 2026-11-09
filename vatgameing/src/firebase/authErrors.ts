import { FirebaseError } from "firebase/app";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const BAD_LOGIN_MESSAGE = "Incorrect email or password.";

const messages: Record<string, string> = {
  "auth/weak-password": "That password is too weak. Use at least 6 characters.",
  "auth/email-already-in-use":
    "That email is already registered. Try logging in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  // Newer projects report every failed login as invalid-credential.
  "auth/invalid-credential": BAD_LOGIN_MESSAGE,
  "auth/wrong-password": BAD_LOGIN_MESSAGE,
  "auth/user-not-found": BAD_LOGIN_MESSAGE,
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/network-request-failed":
    "Couldn't reach the server. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window.",
  // Closing the Google window on purpose isn't an error worth showing.
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
};

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return messages[error.code] ?? GENERIC_MESSAGE;
  }
  return GENERIC_MESSAGE;
}
