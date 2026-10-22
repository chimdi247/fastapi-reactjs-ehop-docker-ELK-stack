import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_CONFIG, loginUser, saveAuthData } from "../../services/api";
import styles from "./Login.module.css";


export default function LoginPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError("");
    };
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await loginUser({
                email: formData.email,
                password: formData.password,
            });

            // Save token and user role
            saveAuthData(result.token, result.user.role);

            // Dispatch event to sync state across app
            window.dispatchEvent(new Event("storage"));

            window.dispatchEvent(
                new CustomEvent("authChange", {
                    detail: { isAuthenticated: true, role: result.user.role },
                })
            );

            // Navigate based on role
            if (result.user.role === "ADMIN") {
                navigate("/admin/dashboard");
            } else if (result.user.role === "DELIVERY") {
                navigate("/delivery");
            } else {
                navigate("/products");
            }
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_CONFIG.API_URL}/auth/google`;
    };


    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <h1>Welcome Back</h1>
                    <p>Login to your account</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.authForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className={styles.authBtn} disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className={styles.authFooter}>
                    <button onClick={handleGoogleLogin} className={styles.googleBtn}>
                        Continue with Google
                    </button>

                    <p>
                        Don't have an account? <Link to="/register">Register here</Link>
                    </p>
                    <p>
                        Forgot Password? <Link to="/forgot-password">Reset here</Link>
                    </p>
                </div>
            </div>
        </div>
    );

}