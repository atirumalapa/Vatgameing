import { useEffect, useState } from "react";
import {
  getPushStatus,
  requestPushPermission,
  type PushStatus,
} from "../firebase/notifications.ts";

const MESSAGES: Partial<Record<PushStatus, string>> = {
  unsupported:
    "This browser can't show reminders. On iPhone, add this site to your Home Screen first.",
  notConfigured: "Reminders aren't available yet.",
  denied:
    "Notifications are blocked for this site. You can allow them in your browser's site settings.",
  granted: "Reminders are on for this device.",
};

function PushNotifications({ uid }: { uid: string }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);

  const turnOn = async () => {
    setFailed(false);
    setBusy(true);
    try {
      setStatus(await requestPushPermission(uid));
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  if (!status) return null;

  return (
    <fieldset className="settings-group">
      <legend>Reminders</legend>
      {status === "default" ? (
        <>
          <p className="settings-note">
            Get a notification when homework starts and before exams.
          </p>
          <button
            type="button"
            className="auth-secondary"
            disabled={busy}
            onClick={() => void turnOn()}
          >
            Turn on reminders
          </button>
        </>
      ) : (
        <p className="settings-note" role="status">{MESSAGES[status]}</p>
      )}
      {failed && (
        <p className="auth-error" role="alert">
          We couldn't turn on reminders. Please try again.
        </p>
      )}
    </fieldset>
  );
}

export default PushNotifications;
