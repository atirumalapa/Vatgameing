"""Run with: npm run test:functions (starts the Firestore emulator for you)."""

import os
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from firebase_admin import messaging
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore

import reminders as r

UTC = timezone.utc
NEW_YORK = ZoneInfo("America/New_York")
# A Monday, the week before US clocks change on Sunday 2026-11-01.
NOW = datetime(2026, 10, 26, 12, 0, tzinfo=UTC)


def homework(day="mon", start="14:30", title="Math"):
    return {"day": day, "start": start, "end": "15:30", "type": "homework", "title": title}


class CleanBlocks(unittest.TestCase):
    def test_keeps_only_known_fields(self):
        cleaned = r.clean_blocks([{**homework(), "xp": 999}])
        self.assertEqual(cleaned, [homework()])

    def test_rejects_bad_input(self):
        bad = [
            "nope",
            [{**homework(), "day": "funday"}],
            [{**homework(), "start": "25:00"}],
            [{**homework(), "start": "16:00"}],
            [{**homework(), "type": "party"}],
            [{**homework(), "title": ""}],
            [homework()] * (r.MAX_BLOCKS + 1),
        ]
        for blocks in bad:
            with self.assertRaises(ValueError):
                r.clean_blocks(blocks)


class BuildReminders(unittest.TestCase):
    def build(self, blocks=(), exams=(), zone=NEW_YORK, now=NOW):
        return r.build_reminders("u1", list(blocks), list(exams), zone, now)

    def test_homework_converts_local_time_to_utc(self):
        first = self.build([homework()])[0]
        # 14:30 in New York on Oct 26 is still daylight time, UTC-4.
        self.assertEqual(first["sendAt"], datetime(2026, 10, 26, 18, 30, tzinfo=UTC))
        self.assertEqual(first["uid"], "u1")
        self.assertIs(first["sent"], False)

    def test_utc_time_shifts_when_clocks_change(self):
        second = self.build([homework()])[1]
        # The next Monday is on standard time, UTC-5, same wall clock.
        self.assertEqual(second["sendAt"], datetime(2026, 11, 2, 19, 30, tzinfo=UTC))

    def test_same_wall_clock_differs_by_timezone(self):
        tokyo = self.build([homework()], zone=ZoneInfo("Asia/Tokyo"))[0]
        self.assertEqual(tokyo["sendAt"], datetime(2026, 11, 2, 5, 30, tzinfo=UTC))

    def test_homework_earlier_today_is_skipped(self):
        items = self.build([homework(start="07:00")])
        self.assertGreater(items[0]["sendAt"], NOW)
        self.assertEqual(items[0]["sendAt"].date().isoformat(), "2026-11-02")

    def test_homework_repeats_weekly(self):
        self.assertEqual(len(self.build([homework()])), r.WEEKS_AHEAD)

    def test_only_homework_blocks_get_reminders(self):
        others = [{**homework(), "type": kind} for kind in ("class", "travel", "freeTime")]
        self.assertEqual(self.build(others), [])

    def test_exam_reminders_14_and_7_days_before(self):
        items = self.build(exams=[{"title": "Bio", "date": "2026-12-15"}])
        # 9am New York in standard time.
        self.assertEqual(
            [i["sendAt"] for i in items],
            [datetime(2026, 12, 1, 14, 0, tzinfo=UTC), datetime(2026, 12, 8, 14, 0, tzinfo=UTC)],
        )
        self.assertIn("14 days", items[0]["message"])
        self.assertIn("7 days", items[1]["message"])

    def test_past_exam_reminders_are_skipped(self):
        soon = (NOW + timedelta(days=10)).date().isoformat()
        items = self.build(exams=[{"title": "Bio", "date": soon}])
        self.assertEqual(len(items), 1)
        self.assertIn("7 days", items[0]["message"])

    def test_malformed_documents_are_skipped(self):
        items = self.build(
            [{"type": "homework", "day": "nope", "start": "x"}],
            [{"title": "No date"}, {"date": "not-a-date"}],
        )
        self.assertEqual(items, [])

    def test_unknown_timezone_is_rejected(self):
        for name in ("Mars/Base", "../etc/passwd", None):
            with self.assertRaises(ValueError):
                r.load_timezone(name)


@unittest.skipUnless(os.environ.get("FIRESTORE_EMULATOR_HOST"), "needs the emulator")
class WithFirestore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = firestore.Client(
            project="vatgameing-ed4a1", credentials=AnonymousCredentials()
        )

    def setUp(self):
        self.uid = f"user-{uuid.uuid4().hex}"
        self.user = self.db.collection("users").document(self.uid)
        self.user.set({"timezone": "America/New_York"})
        self.reminders = self.db.collection("reminders")
        for leftover in self.reminders.stream():
            leftover.reference.delete()

    def mine(self):
        docs = self.reminders.where("uid", "==", self.uid).stream()
        return [d.to_dict() for d in docs]

    def add_reminder(self, offset_minutes=-5, sent=False, uid=None):
        ref = self.reminders.document(uuid.uuid4().hex)
        ref.set(
            {
                "uid": uid or self.uid,
                "sendAt": NOW + timedelta(minutes=offset_minutes),
                "message": "Hello",
                "sent": sent,
            }
        )
        return ref

    def add_token(self, token):
        self.user.collection("tokens").document(token).set({"token": token})

    def tokens(self):
        return sorted(d.id for d in self.user.collection("tokens").stream())

    # --- replace_schedule

    def test_saves_blocks_and_creates_reminders(self):
        count = r.replace_schedule(self.db, self.uid, [homework(), homework(day="tue")], NOW)
        self.assertEqual(count, r.WEEKS_AHEAD * 2)
        self.assertEqual(len(list(self.user.collection("blocks").stream())), 2)
        self.assertEqual(len(self.mine()), r.WEEKS_AHEAD * 2)

    def test_resave_replaces_blocks_and_unsent_reminders(self):
        r.replace_schedule(self.db, self.uid, [homework(title="Old")], NOW)
        sent = self.add_reminder(sent=True)

        r.replace_schedule(self.db, self.uid, [homework(title="New")], NOW)

        blocks = [d.to_dict() for d in self.user.collection("blocks").stream()]
        self.assertEqual([b["title"] for b in blocks], ["New"])
        unsent = [m for m in self.mine() if not m["sent"]]
        self.assertEqual(len(unsent), r.WEEKS_AHEAD)
        self.assertTrue(all("New" in m["message"] for m in unsent))
        self.assertTrue(sent.get().to_dict()["sent"], "sent history is kept")

    def test_large_schedule_exceeds_one_chunk(self):
        blocks = [homework(start=f"{10 + i % 9}:00", day=r.WEEKDAYS[i % 7]) for i in range(30)]
        for block in blocks:
            block["end"] = "23:00"
        count = r.replace_schedule(self.db, self.uid, blocks, NOW)
        self.assertGreater(count, r.WRITE_CHUNK_SIZE)
        self.assertEqual(len(self.mine()), count)
        r.replace_schedule(self.db, self.uid, blocks, NOW)
        self.assertEqual(len(self.mine()), count)

    def test_other_students_are_untouched(self):
        other = f"other-{uuid.uuid4().hex}"
        theirs = self.add_reminder(offset_minutes=60, uid=other)
        r.replace_schedule(self.db, self.uid, [homework()], NOW)
        self.assertTrue(theirs.get().exists)

    def test_refresh_only_keeps_blocks_and_adds_exams(self):
        r.replace_schedule(self.db, self.uid, [homework()], NOW)
        self.user.collection("exams").document("e1").set({"title": "Bio", "date": "2026-12-15"})
        count = r.replace_schedule(self.db, self.uid, None, NOW)
        self.assertEqual(count, r.WEEKS_AHEAD + 2)
        self.assertEqual(len(list(self.user.collection("blocks").stream())), 1)

    def test_missing_profile_is_an_error(self):
        with self.assertRaises(LookupError):
            r.replace_schedule(self.db, "nobody-here", [], NOW)

    # --- send_due_reminders

    def sender(self, results=None):
        calls = []

        def send(tokens, message):
            calls.append((sorted(tokens), message))
            outcome = results or {}
            return SimpleNamespace(
                responses=[SimpleNamespace(exception=outcome.get(t)) for t in tokens]
            )

        return send, calls

    def test_sends_to_every_device_and_marks_sent(self):
        self.add_token("phone")
        self.add_token("laptop")
        reminder = self.add_reminder()
        send, calls = self.sender()
        r.send_due_reminders(self.db, send, NOW)
        self.assertIn((["laptop", "phone"], "Hello"), calls)
        self.assertTrue(reminder.get().to_dict()["sent"])

    def test_ignores_future_and_already_sent(self):
        self.add_token("phone")
        later = self.add_reminder(offset_minutes=30)
        self.add_reminder(sent=True)
        send, calls = self.sender()
        r.send_due_reminders(self.db, send, NOW)
        self.assertEqual(calls, [])
        self.assertFalse(later.get().to_dict()["sent"])

    def test_invalid_tokens_are_deleted_and_good_ones_kept(self):
        for token in ("good", "gone", "wrong-sender", "malformed", "flaky"):
            self.add_token(token)
        reminder = self.add_reminder()
        send, _ = self.sender(
            {
                "gone": messaging.UnregisteredError("gone"),
                "wrong-sender": messaging.SenderIdMismatchError("wrong"),
                "malformed": r.exceptions.InvalidArgumentError("bad"),
                "flaky": r.exceptions.UnavailableError("try later"),
            }
        )
        r.send_due_reminders(self.db, send, NOW)
        self.assertEqual(self.tokens(), ["flaky", "good"])
        self.assertTrue(reminder.get().to_dict()["sent"])

    def test_no_devices_still_marks_sent(self):
        reminder = self.add_reminder()
        send, calls = self.sender()
        r.send_due_reminders(self.db, send, NOW)
        self.assertTrue(reminder.get().to_dict()["sent"])
        self.assertEqual(calls, [])

    def test_failed_send_stays_unsent_and_others_continue(self):
        self.add_token("phone")
        first = self.add_reminder(offset_minutes=-20)
        second = self.add_reminder(offset_minutes=-10)
        attempts = []

        def send(tokens, message):
            attempts.append(tokens)
            if len(attempts) == 1:
                raise RuntimeError("network down")
            return SimpleNamespace(responses=[SimpleNamespace(exception=None) for _ in tokens])

        r.send_due_reminders(self.db, send, NOW)
        self.assertFalse(first.get().to_dict()["sent"])
        self.assertTrue(second.get().to_dict()["sent"])


if __name__ == "__main__":
    unittest.main()
