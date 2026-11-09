# VATG

Virtual Academic Technological Gaming. Built with React, TypeScript, Vite and Firebase (Auth, Firestore, Hosting).

Live site: https://vatgameing-ed4a1.web.app

## What you need

- Node.js 22 or newer
- Java 21 or newer (the Firebase emulators run on it)
- Python 3.14 (Cloud Functions are written in Python)
- Firebase CLI: `npm install -g firebase-tools`, then `firebase login`

## Setup

```bash
cd vatgameing
npm install
cp .env.example .env
python3.14 -m venv functions/venv
functions/venv/bin/pip install -r functions/requirements.txt
```

Fill in the blank values in `.env`. They're in the Firebase console under Project settings, Your apps. If you don't have access to the project, ask a teammate for them. `.env` is ignored by git, so don't commit it.

## Run it locally

Use two terminals, both in `vatgameing/`:

```bash
firebase emulators:start   # Terminal 1: local Auth, Firestore and Functions
npm run dev                # Terminal 2: the site, at http://localhost:5173
```

With `VITE_USE_EMULATORS=true` in `.env`, the app talks to the emulators, so you can't touch real users or data.

## Using the emulator

- See and edit test users and documents in the Emulator UI at http://localhost:4000.
- Data is wiped when the emulators stop. Just sign up again.
- "Continue with Google" opens a fake account picker, so no real Google account is needed.
- No real emails are sent. Password reset links are printed in Terminal 1.
- The 5-minute reminder function doesn't run on its own locally, and the emulators can't send push notifications. Use `npm run test:functions` to check that logic.

## Checks

```bash
npm run test:rules       # Firestore security rules, runs against the emulators
npm run test:functions   # reminder logic, runs against the emulator
npm run lint
npm run build
```

Run `npm run test:rules` after any change to `firestore.rules`.

## Deploy

You need access to the Firebase project. These change the live site and database:

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting           # builds the site first
firebase deploy --only functions         # needs the Blaze plan
```

## Data model

Types for all of these are in `src/firebase/schema.ts` and `src/firebase/users.ts`.

| Path | Holds | Who can access it |
|---|---|---|
| `users/{uid}` | Profile, living type, commute, homework and free time settings, timezone, notification preferences | The user, except for `xp`, `streak` and `streakFreezes` |
| `users/{uid}/courses/{courseId}` | Course data parsed from the schedule PDF | The user |
| `users/{uid}/blocks/{blockId}` | Scheduled blocks: class, travel, homework, free time | The user |
| `users/{uid}/exams/{examId}` | Confirmed exam dates from the syllabus | The user |
| `users/{uid}/tokens/{tokenId}` | Device tokens for push notifications | The user |
| `reminders/{reminderId}` | One document per upcoming alert: `uid`, `sendAt`, `message`, `sent` | Cloud Functions only |

## Good to know

- Each user has one document at `users/{uid}`. It's created on their first sign-in, in `src/firebase/users.ts`.
- Users can't change their own `xp`, `streak` or `streakFreezes`. `firestore.rules` blocks it, and only Cloud Functions should write those fields.
- `src/hooks/useAuth.ts` shares the current user and their document with the whole app.
