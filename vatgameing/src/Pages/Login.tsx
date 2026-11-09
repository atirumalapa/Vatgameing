import "./styles/login.css"
import "../styles/auth.css";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import {
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";
import NavBar from "../Components/navBar";
import { auth } from "../firebase/config.js";
import { getAuthErrorMessage } from "../firebase/authErrors.ts";
import { useAuth } from "../hooks/useAuth.ts";

const googleProvider = new GoogleAuthProvider();

function Login() {
    const { user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    const attemptSignIn = async (signIn: () => Promise<unknown>) => {
        setError("");
        setBusy(true);
        try {
            await signIn();
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
                    <h1>Log in</h1>
                    <form
                        className="auth-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void attemptSignIn(() =>
                                signInWithEmailAndPassword(auth, email, password),
                            );
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
                        <label>
                            Password
                            <input
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </label>
                        <Link to="/forgot-password" className="auth-forgot">
                            Forgot password?
                        </Link>
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        <button type="submit" className="auth-primary" disabled={busy}>
                            Log in
                        </button>
                    </form>
                    <button
                        type="button"
                        className="auth-secondary"
                        disabled={busy}
                        onClick={() => {
                            void attemptSignIn(() => signInWithPopup(auth, googleProvider));
                        }}
                    >
                        Continue with Google
                    </button>
                    <p className="auth-links">
                        New here? <Link to="/signup">Sign up</Link>
                    </p>
                </div>
            </main>
        </>
    );
}

export default Login
