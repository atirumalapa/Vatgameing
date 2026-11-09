// Shows push notifications while the site is closed.
// Keep this version in step with the firebase package in package.json.
importScripts(
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js",
);

// src/firebase/notifications.ts passes the config in this file's URL.
firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();
