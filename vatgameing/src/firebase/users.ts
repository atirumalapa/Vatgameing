import type { User } from "firebase/auth";
import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./config.js";
import { getSettings, type Settings } from "../hooks/useSettings.ts";

export type StudentType = "college" | "highSchool";

export type LivingType = "onCampus" | "commuter";

export type UserProfile = {
  displayName: string;
  email: string;
  // Null for a moment while the server fills in its timestamp.
  createdAt: Timestamp | null;
  studentType: StudentType | "";
  livingType: LivingType | "";
  commuteMinutes: number;
  homework: { minutesPerDay: number };
  freeTime: { minutesPerDay: number };
  timezone: string;
  notifications: { pushEnabled: boolean; minutesBefore: number };
  xp: number;
  streak: number;
  streakFreezes: number;
  settings: Settings;
};

export const userRef = (uid: string) => doc(db, "users", uid);

// Firebase signs the new user in before the sign-up form can finish, so the
// name typed there is parked here for ensureUserProfile to pick up.
let signupName = "";

export function rememberSignupName(name: string) {
  signupName = name;
}

// Creates users/{uid} the first time someone signs in, by any method. The
// transaction stops two open tabs from both creating it.
export async function ensureUserProfile(user: User) {
  const ref = userRef(user.uid);
  const displayName =
    signupName || user.displayName || user.email?.split("@")[0] || "Player";

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) return;

    transaction.set(ref, {
      displayName,
      email: user.email ?? "",
      createdAt: serverTimestamp(),
      studentType: "",
      livingType: "",
      commuteMinutes: 0,
      homework: { minutesPerDay: 120 },
      freeTime: { minutesPerDay: 60 },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      // Off until the user grants browser notification permission.
      notifications: { pushEnabled: false, minutesBefore: 15 },
      xp: 0,
      streak: 0,
      streakFreezes: 0,
      settings: getSettings(),
    });
  });
  signupName = "";
}

export function saveStudentType(uid: string, studentType: StudentType) {
  return updateDoc(userRef(uid), { studentType });
}

export function saveSettings(uid: string, settings: Settings) {
  return updateDoc(userRef(uid), { settings });
}
