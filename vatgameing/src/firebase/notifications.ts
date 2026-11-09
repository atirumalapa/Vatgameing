import { getApp } from "firebase/app";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { db } from "./config.js";
import { userRef } from "./users.ts";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export type PushStatus =
  | "unsupported"
  | "notConfigured"
  | "default"
  | "denied"
  | "granted";

export async function getPushStatus(): Promise<PushStatus> {
  if (!(await isSupported())) return "unsupported";
  if (!VAPID_KEY) return "notConfigured";
  return Notification.permission;
}

// The service worker can't read .env, so its config travels in its URL.
function registerServiceWorker() {
  const { apiKey, projectId, messagingSenderId, appId } = getApp().options;
  const config = new URLSearchParams({
    apiKey: apiKey ?? "",
    projectId: projectId ?? "",
    messagingSenderId: messagingSenderId ?? "",
    appId: appId ?? "",
  });
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${config}`);
}

let showingForegroundMessages = false;

// Only call once permission is granted. Each device gets its own token document.
async function registerDevice(uid: string) {
  const registration = await registerServiceWorker();
  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  await setDoc(doc(db, "users", uid, "tokens", token), {
    token,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(userRef(uid), { "notifications.pushEnabled": true });

  // The browser only shows pushes by itself when the site isn't in front.
  if (!showingForegroundMessages) {
    showingForegroundMessages = true;
    onMessage(messaging, ({ notification }) => {
      void registration.showNotification(notification?.title ?? "VATG reminder", {
        body: notification?.body,
      });
    });
  }
}

// Must only run from a button press, never on page load.
export async function requestPushPermission(uid: string): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission === "granted") await registerDevice(uid);
  return permission;
}

// Keeps the saved token current on devices that already said yes. Never prompts.
export async function refreshDeviceToken(uid: string) {
  if ((await getPushStatus()) === "granted") await registerDevice(uid);
}
