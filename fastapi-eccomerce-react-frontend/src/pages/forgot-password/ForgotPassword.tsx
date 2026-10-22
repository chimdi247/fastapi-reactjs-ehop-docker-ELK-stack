import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../services/api";
import styles from "./ForgotPassword.module.css";


export default function ForgotPasswordPage() {

    const [email, setEmail] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);



    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            await forgotPassword(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to send reset code. Please try again.");
        } finally {
            setLoading(false);
        }
    };



    if (success) {
        return (
            <div className={styles.forgotContainer}>
                <div className={styles.forgotCard}>
                    <div className={styles.successIcon}>📧</div>
                    <h1>Check Your Email</h1>
                    <p>
                        We've sent a password reset code to <strong>{email}</strong>
                    </p>
                    <div className={styles.infoBox}>
                        <p>
                            Please check your email and enter the 6-digit code on the reset
                            password page.
                        </p>
                    </div>
                    <div className={styles.buttonGroup}>
                        <Link to="/reset-password" className={styles.resetBtn}>
                            Enter Reset Code
                        </Link>
                        <Link to="/login" className={styles.backBtn}>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.forgotContainer}>
            <div className={styles.forgotCard}>
                <div className={styles.forgotHeader}>
                    <h1>Forgot Password?</h1>
                    <p>Enter your email address and we'll send you a reset code.</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.forgotForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your registered email"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Code"}
                    </button>
                </form>

                <div className={styles.forgotFooter}>
                    <p>
                        Remember your password? <Link to="/login">Back to Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}