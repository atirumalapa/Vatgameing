import { httpsCallable } from "firebase/functions";
import { functions } from "./config.js";
import type { Block } from "./schema.ts";

const callSaveSchedule = httpsCallable<
  { blocks?: Block[] },
  { reminders: number }
>(functions, "save_schedule");

// Replaces the student's blocks and rebuilds their unsent reminders.
export const saveSchedule = (blocks: Block[]) => callSaveSchedule({ blocks });

// Call after adding or changing an exam, so its reminders are rebuilt.
export const refreshReminders = () => callSaveSchedule({});
