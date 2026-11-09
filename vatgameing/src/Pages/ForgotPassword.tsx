import "../styles/auth.css";
import { useState } from "react";
import { Link } from "react-router";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import NavBar from "../Components/navBar";
import { auth } from "../firebase/config.js";
import { getAuthErrorMessage } from "../firebase/authErrors.ts";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setSent(false);
        setBusy(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSent(true);
        } catch (err) {
            // Same message either way, so this page can't reveal who has an account.
            if (err instanceof FirebaseError && err.code === "auth/user-not-found") {
                setSent(true);
            } else {
                setError(getAuthErrorMessage(err));
            }
        }
        setBusy(false);
    };

    return (
        <>
            <NavBar/>
            <main className="auth-page">
                <div className="auth-card">
                    <h1>Reset password</h1>
                    <form
                        className="auth-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSubmit();
                        }}
                    >
                        <label>
                            Email
                            <input
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                        </label>
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        {sent && (
                            <p className="auth-success" role="status">
                                If an account exists for that email, a reset link is on its way.
                            </p>
                        )}
                        <button type="submit" className="auth-primary" disabled={busy}>
                            Send reset email
                        </button>
                    </form>
                    <p className="auth-links">
                        <Link to="/login">Back to log in</Link>
                    </p>
                </div>
            </main>
        </>
    );
}

export default ForgotPassword
