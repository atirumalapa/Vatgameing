import "../styles/auth.css";
import "./styles/Settings.css";
import { useState } from "react";
import NavBar from "../Components/navBar";
import PushNotifications from "../Components/PushNotifications.tsx";
import { saveSettings } from "../firebase/users.ts";
import { useAuth } from "../hooks/useAuth.ts";
import { getSettings, setSettings, useSettings, type Settings as SettingsType } from "../hooks/useSettings.ts";

const TEXT_SIZES: { value: SettingsType["textSize"]; label: string }[] = [
    { value: "normal", label: "Normal" },
    { value: "large", label: "Large" },
    { value: "xlarge", label: "Extra large" },
];

function Settings() {
    const { user } = useAuth();
    const settings = useSettings();
    const [saveFailed, setSaveFailed] = useState(false);

    // Applies right away. Logged-out choices stay on this device.
    const change = async (next: Partial<SettingsType>) => {
        setSettings(next);
        setSaveFailed(false);
        if (!user) return;
        try {
            await saveSettings(user.uid, getSettings());
        } catch {
            setSaveFailed(true);
        }
    };

    return (
        <>
            <NavBar/>
            <main className="auth-page">
                <div className="auth-card">
                    <h1>Settings</h1>
                    <div className="auth-form">
                        <label className="settings-option">
                            <input
                                type="checkbox"
                                checked={settings.theme === "dark"}
                                onChange={(event) =>
                                    void change({ theme: event.target.checked ? "dark" : "light" })
                                }
                            />
                            Dark mode
                        </label>

                        <fieldset className="settings-group">
                            <legend>Text size</legend>
                            {TEXT_SIZES.map(({ value, label }) => (
                                <label className="settings-option" key={value}>
                                    <input
                                        type="radio"
                                        name="text-size"
                                        checked={settings.textSize === value}
                                        onChange={() => void change({ textSize: value })}
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>

                        <label className="settings-option">
                            <input
                                type="checkbox"
                                checked={settings.dyslexiaFont}
                                onChange={(event) =>
                                    void change({ dyslexiaFont: event.target.checked })
                                }
                            />
                            Dyslexia-friendly font
                        </label>

                        {user && <PushNotifications uid={user.uid} />}

                        {saveFailed && (
                            <p className="auth-error" role="alert">
                                We couldn't save that to your account. It will apply on this device only.
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

export default Settings
