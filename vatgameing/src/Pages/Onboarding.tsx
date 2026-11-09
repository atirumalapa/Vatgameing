import "../styles/auth.css";
import { useState } from "react";
import NavBar from "../Components/navBar";
import { saveStudentType, type StudentType } from "../firebase/users.ts";
import { useAuth } from "../hooks/useAuth.ts";

function Onboarding() {
    const { user } = useAuth();
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    // Once this saves, OnboardingGate moves the user on to the Dashboard.
    const choose = async (studentType: StudentType) => {
        if (!user) return;
        setError("");
        setBusy(true);
        try {
            await saveStudentType(user.uid, studentType);
        } catch {
            setError("We couldn't save that. Please try again.");
        }
        setBusy(false);
    };

    return (
        <>
            <NavBar/>
            <main className="auth-page">
                <div className="auth-card">
                    <h1>Where are you studying?</h1>
                    <div className="auth-form">
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        <button
                            type="button"
                            className="auth-primary"
                            disabled={busy}
                            onClick={() => void choose("college")}
                        >
                            College
                        </button>
                        <button
                            type="button"
                            className="auth-primary"
                            disabled={busy}
                            onClick={() => void choose("highSchool")}
                        >
                            High school
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
}

export default Onboarding
