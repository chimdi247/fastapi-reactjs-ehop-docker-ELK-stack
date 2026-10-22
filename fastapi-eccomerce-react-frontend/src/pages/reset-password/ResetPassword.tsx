import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/api";
import styles from "./ResetPassword.module.css";


export default function ResetPasswordPage() {

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [formData, setFormData] = useState({
        code: "",
        password: "",
        confirmPassword: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Extract code from URL query parameter when component mounts
    useEffect(() => {
        const codeFromUrl = searchParams.get("code");
        if (codeFromUrl) {
            setFormData((prev) => ({
                ...prev,
                code: codeFromUrl,
            }));
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError("");
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 4) {
            setError("Password must be at least 4 characters");
            return;
        }

        if (formData.code.length !== 6) {
            setError("Reset code must be 6 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await resetPassword(formData.code, formData.password);
            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err: any) {
            setError(
                err.message ||
                "Failed to reset password. Please check your code and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.resetContainer}>
                <div className={styles.resetCard}>
                    <div className={styles.successIcon}>✅</div>
                    <h1>Password Reset Successful!</h1>
                    <p>Your password has been changed successfully.</p>
                    <div className={styles.infoBox}>
                        <p>Redirecting you to login page...</p>
                    </div>
                    <Link to="/login" className={styles.loginBtn}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.resetContainer}>
            <div className={styles.resetCard}>
                <div className={styles.resetHeader}>
                    <h1>Reset Password</h1>
                    <p>Enter the 6-digit code sent to your email and your new password.</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.resetForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="code">Reset Code</label>
                        <input
                            type="text"
                            id="code"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            required
                            placeholder="Enter 6-digit reset code"
                            maxLength={6}
                            disabled={loading}
                        />
                        <small>Check your email for the 6-digit reset code</small>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Enter new password (min 6 characters)"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="Confirm your new password"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                <div className={styles.resetFooter}>
                    <p>
                        <Link to="/forgot-password">Request new reset code</Link>
                    </p>
                    <p>
                        Remember your password? <Link to="/login">Back to Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}