// Run with: npm run test:rules
// Logs in real users against the Auth and Firestore emulators.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  terminate,
  updateDoc,
  where,
} from "firebase/firestore";

const denied = { code: "permission-denied" };
const clients = [];

function connect(name) {
  const app = initializeApp(
    { apiKey: "fake-api-key", projectId: "vatgameing-ed4a1" },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  clients.push({ app, db });
  return { auth, db };
}

async function logIn(name) {
  const { auth, db } = connect(name);
  const { user } = await createUserWithEmailAndPassword(
    auth,
    `${name}-${Date.now()}@example.com`,
    "password123",
  );
  return { db, uid: user.uid };
}

const newProfile = (overrides = {}) => ({
  displayName: "Test",
  xp: 0,
  streak: 0,
  streakFreezes: 0,
  ...overrides,
});

let userA;
let userB;
let refA;
let refB;

before(async () => {
  userA = await logIn("a");
  userB = await logIn("b");
  refA = doc(userA.db, "users", userA.uid);
  refB = doc(userB.db, "users", userB.uid);
  await setDoc(refA, newProfile());
  await setDoc(refB, newProfile());
});

after(async () => {
  for (const { app, db } of clients) {
    await terminate(db);
    await deleteApp(app);
  }
});

test("a user can read their own document", async () => {
  const snapshot = await getDoc(refA);
  assert.equal(snapshot.data().xp, 0);
});

test("a user can edit their own ordinary fields", async () => {
  await updateDoc(refA, { displayName: "New name", studentType: "college" });
  assert.equal((await getDoc(refA)).data().displayName, "New name");
});

test("user A cannot read user B", async () => {
  await assert.rejects(getDoc(doc(userA.db, "users", userB.uid)), denied);
});

test("user A cannot write to user B", async () => {
  await assert.rejects(
    updateDoc(doc(userA.db, "users", userB.uid), { displayName: "Hacked" }),
    denied,
  );
});

for (const field of ["xp", "streak", "streakFreezes"]) {
  test(`a user cannot edit their own ${field}`, async () => {
    await assert.rejects(updateDoc(refA, { [field]: 999 }), denied);
    assert.equal((await getDoc(refA)).data()[field], 0);
  });
}

test("a blocked field can't be smuggled in with an allowed one", async () => {
  await assert.rejects(
    updateDoc(refA, { displayName: "Sneaky", xp: 5 }),
    denied,
  );
});

test("a full overwrite can't change xp", async () => {
  await assert.rejects(setDoc(refA, newProfile({ xp: 999 })), denied);
});

for (const field of ["xp", "streak", "streakFreezes"]) {
  test(`a new account can't start with ${field} above 0`, async () => {
    const user = await logIn(`new-${field.toLowerCase()}`);
    await assert.rejects(
      setDoc(doc(user.db, "users", user.uid), newProfile({ [field]: 100 })),
      denied,
    );
  });
}

test("a user cannot delete their own document", async () => {
  await assert.rejects(deleteDoc(refA), denied);
});

test("a user can read and write under their own document", async () => {
  const note = doc(userA.db, "users", userA.uid, "notes", "one");
  await setDoc(note, { text: "hello" });
  assert.equal((await getDoc(note)).data().text, "hello");
});

test("user A cannot touch anything under user B", async () => {
  const note = doc(userA.db, "users", userB.uid, "notes", "one");
  await assert.rejects(setDoc(note, { text: "hello" }), denied);
  await assert.rejects(getDoc(note), denied);
});

for (const name of ["courses", "blocks", "exams", "tokens"]) {
  test(`${name}: owner can write and read, others can't`, async () => {
    const mine = doc(userA.db, "users", userA.uid, name, "one");
    await setDoc(mine, { title: "x" });
    assert.equal((await getDoc(mine)).data().title, "x");

    const theirs = doc(userB.db, "users", userA.uid, name, "one");
    await assert.rejects(getDoc(theirs), denied);
    await assert.rejects(setDoc(theirs, { title: "y" }), denied);
    await assert.rejects(deleteDoc(theirs), denied);
  });
}

test("browsers cannot create or read reminders, even their own", async () => {
  const reminders = collection(userA.db, "reminders");
  const reminder = doc(reminders, "one");
  await assert.rejects(
    setDoc(reminder, { uid: userA.uid, message: "hi", sent: false }),
    denied,
  );
  await assert.rejects(getDoc(reminder), denied);
  await assert.rejects(
    getDocs(query(reminders, where("uid", "==", userA.uid))),
    denied,
  );
});

test("logged-out visitors cannot read users", async () => {
  const { db } = connect("anonymous");
  await assert.rejects(getDoc(doc(db, "users", userA.uid)), denied);
});

test("everything outside users is closed", async () => {
  await assert.rejects(setDoc(doc(userA.db, "other", "x"), { a: 1 }), denied);
  await assert.rejects(getDoc(doc(userA.db, "other", "x")), denied);
});
