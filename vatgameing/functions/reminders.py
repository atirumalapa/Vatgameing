"""Builds, replaces and sends reminders. main.py holds the Cloud Function wrappers."""

import logging
import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from firebase_admin import exceptions, messaging
from google.cloud.firestore_v1.base_query import FieldFilter

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
BLOCK_TYPES = {"class", "travel", "homework", "freeTime"}
LOCAL_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

MAX_BLOCKS = 200
MAX_TITLE_LENGTH = 200

# Blocks repeat weekly, so homework reminders are created about a semester ahead.
WEEKS_AHEAD = 16
EXAM_LEAD_DAYS = (14, 7)
EXAM_REMINDER_TIME = time(9, 0)

# Reminders per scheduled run. Anything beyond this goes out on the next run.
SEND_LIMIT = 500
WRITE_CHUNK_SIZE = 400

INVALID_TOKEN_ERRORS = (
    messaging.UnregisteredError,
    messaging.SenderIdMismatchError,
    exceptions.InvalidArgumentError,
)


def clean_blocks(raw_blocks):
    """Returns only the expected fields of each block. Raises ValueError if bad."""
    if not isinstance(raw_blocks, list) or len(raw_blocks) > MAX_BLOCKS:
        raise ValueError(f"blocks must be a list of at most {MAX_BLOCKS} items")

    cleaned = []
    for block in raw_blocks:
        if not isinstance(block, dict):
            raise ValueError("each block must be an object")
        day, start, end = block.get("day"), block.get("start"), block.get("end")
        block_type, title = block.get("type"), block.get("title")

        if day not in WEEKDAYS:
            raise ValueError(f"invalid day: {day}")
        if not (
            isinstance(start, str)
            and isinstance(end, str)
            and LOCAL_TIME.match(start)
            and LOCAL_TIME.match(end)
            and start < end
        ):
            raise ValueError(f"invalid times: {start} to {end}")
        if block_type not in BLOCK_TYPES:
            raise ValueError(f"invalid type: {block_type}")
        if not isinstance(title, str) or not 0 < len(title) <= MAX_TITLE_LENGTH:
            raise ValueError("title must be 1 to 200 characters")

        cleaned.append(
            {"day": day, "start": start, "end": end, "type": block_type, "title": title}
        )
    return cleaned


def load_timezone(name):
    """Raises ValueError for a timezone that doesn't exist."""
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError) as error:
        raise ValueError(f"unknown timezone: {name}") from error


def local_to_utc(day, wall_clock, zone):
    return datetime.combine(day, wall_clock, tzinfo=zone).astimezone(timezone.utc)


def homework_send_times(block, zone, now):
    """Every upcoming occurrence of a weekly block's start, in UTC."""
    start = time.fromisoformat(block["start"])
    today = now.astimezone(zone).date()
    first = today + timedelta(days=(WEEKDAYS.index(block["day"]) - today.weekday()) % 7)
    occurrences = (first + timedelta(weeks=week) for week in range(WEEKS_AHEAD))
    return [when for when in (local_to_utc(d, start, zone) for d in occurrences) if when > now]


def build_reminders(uid, blocks, exams, zone, now):
    """Returns the reminder documents for a student's blocks and exams."""
    reminders = []

    def add(send_at, message):
        reminders.append({"uid": uid, "sendAt": send_at, "message": message, "sent": False})

    for block in blocks:
        if block.get("type") != "homework":
            continue
        try:
            send_times = homework_send_times(block, zone, now)
        except (KeyError, ValueError, TypeError):
            # Students can write these documents directly, so skip a bad one.
            logging.warning("Skipping malformed block for %s", uid)
            continue
        for send_at in send_times:
            add(send_at, f"Time for homework: {block.get('title', 'Homework')}")

    for exam in exams:
        try:
            exam_day = date.fromisoformat(exam["date"])
        except (KeyError, ValueError, TypeError):
            logging.warning("Skipping malformed exam for %s", uid)
            continue
        for days in EXAM_LEAD_DAYS:
            send_at = local_to_utc(exam_day - timedelta(days=days), EXAM_REMINDER_TIME, zone)
            if send_at > now:
                add(send_at, f"{exam.get('title', 'Exam')} is in {days} days, on {exam['date']}.")

    return reminders


def _commit_in_chunks(db, operations):
    for index in range(0, len(operations), WRITE_CHUNK_SIZE):
        batch = db.batch()
        for operation in operations[index : index + WRITE_CHUNK_SIZE]:
            operation(batch)
        batch.commit()


def replace_schedule(db, uid, new_blocks, now):
    """Optionally replaces the student's blocks, then rebuilds unsent reminders.

    Pass new_blocks=None to rebuild reminders only, for example after an exam
    date changes. Returns how many reminders were created.
    """
    user = db.collection("users").document(uid)
    profile = user.get()
    if not profile.exists:
        raise LookupError(f"no profile for {uid}")
    zone = load_timezone(profile.to_dict().get("timezone"))

    if new_blocks is not None:
        batch = db.batch()
        for old in user.collection("blocks").stream():
            batch.delete(old.reference)
        for block in new_blocks:
            batch.set(user.collection("blocks").document(), block)
        batch.commit()

    blocks = [doc.to_dict() for doc in user.collection("blocks").stream()]
    exams = [doc.to_dict() for doc in user.collection("exams").stream()]
    reminders = build_reminders(uid, blocks, exams, zone, now)

    collection = db.collection("reminders")
    unsent = (
        collection.where(filter=FieldFilter("uid", "==", uid))
        .where(filter=FieldFilter("sent", "==", False))
        .stream()
    )
    _commit_in_chunks(
        db,
        [lambda batch, ref=doc.reference: batch.delete(ref) for doc in unsent],
    )
    _commit_in_chunks(
        db,
        [lambda batch, data=data: batch.set(collection.document(), data) for data in reminders],
    )
    return len(reminders)


def send_due_reminders(db, send, now):
    """Sends every due reminder. send(tokens, message) returns a BatchResponse."""
    due = (
        db.collection("reminders")
        .where(filter=FieldFilter("sent", "==", False))
        .where(filter=FieldFilter("sendAt", "<=", now))
        .order_by("sendAt")
        .limit(SEND_LIMIT)
        .stream()
    )

    processed = 0
    for reminder in due:
        # One failure stays unsent for the next run and doesn't stop the rest.
        try:
            data = reminder.to_dict()
            tokens_ref = db.collection("users").document(data["uid"]).collection("tokens")
            token_docs = list(tokens_ref.stream())

            if token_docs:
                tokens = [doc.to_dict()["token"] for doc in token_docs]
                response = send(tokens, data["message"])
                for doc, result in zip(token_docs, response.responses):
                    if isinstance(result.exception, INVALID_TOKEN_ERRORS):
                        doc.reference.delete()

            reminder.reference.update({"sent": True})
            processed += 1
        except Exception:
            logging.exception("Failed to send reminder %s", reminder.id)
    return processed
