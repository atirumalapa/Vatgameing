import "./styles/Dashboard.css";
import { useEffect } from "react";
import NavBar from "../Components/navBar";
import { refreshDeviceToken } from "../firebase/notifications.ts";
import { useAuth } from "../hooks/useAuth.ts";

function Dashboard() {
    const { user, profile } = useAuth();
    const uid = user?.uid;

    useEffect(() => {
        // A failure here is harmless. It tries again on the next visit.
        if (uid) refreshDeviceToken(uid).catch(() => {});
    }, [uid]);

    if (!profile) return null;

    return (
        <>
            <NavBar/>
            <main className="dashboard">
                <h1>Welcome, {profile.displayName}!</h1>
                <dl className="dashboard-stats">
                    <div className="dashboard-stat">
                        <dt>XP</dt>
                        <dd>{profile.xp}</dd>
                    </div>
                    <div className="dashboard-stat">
                        <dt>Streak</dt>
                        <dd>{profile.streak}</dd>
                    </div>
                </dl>
            </main>
        </>
    );
}

export default Dashboard
