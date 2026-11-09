import { useSyncExternalStore } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { auth } from "../firebase/config.js";
import {
  ensureUserProfile,
  userRef,
  type UserProfile,
} from "../firebase/users.ts";
import { setSettings } from "./useSettings.ts";

type AuthState = {
  user: User | null;
  // The signed-in user's users/{uid} document. Updates live.
  profile: UserProfile | null;
  // True until the saved session and that user's profile have loaded.
  loading: boolean;
  profileFailed: boolean;
};

let state: AuthState = {
  user: null,
  profile: null,
  loading: true,
  profileFailed: false,
};
const subscribers = new Set<() => void>();
let stopProfileListener: (() => void) | undefined;

function setState(next: AuthState) {
  state = next;
  subscribers.forEach((notify) => notify());
}

const isCurrentUser = (user: User) => auth.currentUser?.uid === user.uid;

function profileFailed(user: User) {
  // Errors from a user who has since logged out don't matter.
  if (!isCurrentUser(user)) return;
  setState({ user, profile: null, loading: false, profileFailed: true });
}

async function connectProfile(user: User) {
  try {
    await ensureUserProfile(user);
  } catch {
    profileFailed(user);
    return;
  }
  if (!isCurrentUser(user)) return;

  stopProfileListener = onSnapshot(
    userRef(user.uid),
    (snapshot) => {
      const profile = snapshot.data() as UserProfile | undefined;
      if (!profile) return;
      setSettings(profile.settings);
      setState({ user, profile, loading: false, profileFailed: false });
    },
    () => profileFailed(user),
  );
}

// One Firebase listener shared by every component that calls useAuth.
onAuthStateChanged(auth, (user) => {
  stopProfileListener?.();
  stopProfileListener = undefined;

  if (!user) {
    setState({ user: null, profile: null, loading: false, profileFailed: false });
    return;
  }
  setState({ user, profile: null, loading: true, profileFailed: false });
  void connectProfile(user);
});

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state);
}
