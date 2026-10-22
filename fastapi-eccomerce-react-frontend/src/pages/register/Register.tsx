import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_CONFIG, loginUser, registerUser, saveAuthData } from "../../services/api";
import styles from "./Register.module.css";



export default function RegisterPage() {

    const navigate = useNavigate();


    const [formData, setFormData] = useState({
        email: "",
        name: "",
        password: "",
        confirmPassword: "",
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

        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 4) {
            setError("Password must be at least 4 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Register as regular customer
            await registerUser({
                email: formData.email,
                name: formData.name,
                password: formData.password,
            });

            // Auto login after registration
            const loginResult = await loginUser({
                email: formData.email,
                password: formData.password,
            });

            saveAuthData(loginResult.token, loginResult.user.role);

            // Dispatch events to notify other components
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(
                new CustomEvent("authChange", {
                    detail: { isAuthenticated: true, role: loginResult.user.role },
                })
            );

            navigate("/products");
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }

    };


    const handleGoogleRegister = () => {
        window.location.href = `${API_CONFIG.API_URL}/auth/google`;
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <h1>Create Account</h1>
                    <p>Join ShopEase today</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.authForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter your full name"
                            disabled={loading}
                        />
                    </div>

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
                            placeholder="Create a password (min 6 characters)"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="Confirm your password"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className={styles.authBtn} disabled={loading}>
                        {loading ? "Creating account..." : "Register"}
                    </button>
                </form>

                <div className={styles.authFooter}>
                    <p>Or sign up with:</p>
                    <button onClick={handleGoogleRegister} className={styles.googleBtn}>
                        Continue with Google
                    </button>

                    <p>
                        Already have an account? <Link to="/login">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    )

}