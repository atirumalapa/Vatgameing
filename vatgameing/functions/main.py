from datetime import datetime, timezone

from firebase_admin import firestore, initialize_app, messaging
from firebase_functions import https_fn, scheduler_fn
from firebase_functions.options import set_global_options

import reminders

SITE_URL = "https://vatgameing-ed4a1.web.app/dashboard"

# For cost control: the most containers each function can run at once.
set_global_options(max_instances=10)

initialize_app()


def send_push(tokens, message):
    return messaging.send_each_for_multicast(
        messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title="VATG reminder", body=message),
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(link=SITE_URL)
            ),
        )
    )


@scheduler_fn.on_schedule(schedule="every 5 minutes")
def send_reminders(event: scheduler_fn.ScheduledEvent) -> None:
    reminders.send_due_reminders(firestore.client(), send_push, datetime.now(timezone.utc))


@https_fn.on_call()
def save_schedule(req: https_fn.CallableRequest) -> dict:
    """Saves blocks and rebuilds reminders. Browsers can't write reminders themselves.

    Send {"blocks": [...]} to replace the schedule, or {} to rebuild reminders
    from what's already saved, for example after adding an exam.
    """
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Log in first.")

    data = req.data if isinstance(req.data, dict) else {}
    try:
        blocks = reminders.clean_blocks(data["blocks"]) if "blocks" in data else None
        count = reminders.replace_schedule(
            firestore.client(), req.auth.uid, blocks, datetime.now(timezone.utc)
        )
    except ValueError as error:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.INVALID_ARGUMENT, str(error))
    except LookupError:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.NOT_FOUND, "Profile not found.")

    return {"reminders": count}
