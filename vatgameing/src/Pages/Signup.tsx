import "../styles/auth.css";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import NavBar from "../Components/navBar";
import { auth } from "../firebase/config.js";
import { getAuthErrorMessage } from "../firebase/authErrors.ts";
import { rememberSignupName } from "../firebase/users.ts";
import { useAuth } from "../hooks/useAuth.ts";

function Signup() {
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/onboarding" replace />;

    const handleSubmit = async () => {
        setError("");
        setBusy(true);
        rememberSignupName(name.trim());
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getAuthErrorMessage(err));
        }
        setBusy(false);
    };

    return (
        <>
            <NavBar/>
            <main className="auth-page">
                <div className="auth-card">
                    <h1>Sign up</h1>
                    <form
                        className="auth-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSubmit();
                        }}
                    >
                        <label>
                            Name
                            <input
                                type="text"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                            />
                        </label>
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
                        <label>
                            Password
                            <input
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </label>
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        <button type="submit" className="auth-primary" disabled={busy}>
                            Create account
                        </button>
                    </form>
                    <p className="auth-links">
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>
                </div>
            </main>
        </>
    );
}

export default Signup
