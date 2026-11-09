import { collection, type Timestamp } from "firebase/firestore";
import { db } from "./config.js";

// Blocks repeat weekly, so they store a weekday and wall-clock times in the
// timezone saved on users/{uid}.
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// 24-hour local time, e.g. "14:30".
export type LocalTime = string;

export type ClassMeeting = {
  day: Weekday;
  start: LocalTime;
  end: LocalTime;
  location: string;
};

// users/{uid}/courses/{courseId}: parsed from the schedule PDF
export type Course = {
  code: string;
  title: string;
  instructor: string;
  meetings: ClassMeeting[];
};

export type BlockType = "class" | "travel" | "homework" | "freeTime";

// users/{uid}/blocks/{blockId}
export type Block = {
  day: Weekday;
  start: LocalTime;
  end: LocalTime;
  type: BlockType;
  title: string;
};

// users/{uid}/exams/{examId}: confirmed dates from the syllabus
export type Exam = {
  courseId: string;
  title: string;
  // YYYY-MM-DD
  date: string;
};

// users/{uid}/tokens/{tokenId}: use the token itself as the document ID,
// so registering the same device twice can't create a duplicate.
export type DeviceToken = {
  token: string;
  updatedAt: Timestamp;
};

// reminders/{reminderId}: written and read only by Cloud Functions
export type Reminder = {
  uid: string;
  sendAt: Timestamp;
  message: string;
  sent: boolean;
};

export type UserCollection = "courses" | "blocks" | "exams" | "tokens";

export const userCollection = (uid: string, name: UserCollection) =>
  collection(db, "users", uid, name);
