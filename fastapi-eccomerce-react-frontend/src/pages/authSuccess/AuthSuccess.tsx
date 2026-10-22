import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuthData } from "../../services/api";
import styles from "./AuthSuccess.module.css";



export default function AuthSuccessPage() {

    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");
    const role = searchParams.get("role");



    useEffect(() => {
        if (token && role) {
            // Save token and role using direct import from services/api
            saveAuthData(token, role);

            // Dispatch events for navbar/app state updates
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(
                new CustomEvent("authChange", {
                    detail: { isAuthenticated: true, role },
                })
            );

            // Redirect after a 5-second delay
            const timer = setTimeout(() => {
                if (role === "ADMIN") {
                    navigate("/admin/dashboard", { replace: true });
                } else if (role === "DELIVERY") {
                    navigate("/delivery", { replace: true });
                } else {
                    navigate("/products", { replace: true });
                }
            }, 5000);

            return () => clearTimeout(timer);
        } else {
            navigate("/login", { replace: true });
        }
    }, [token, role, navigate]);



    return (
        <div className={styles.authSuccessContainer}>
            <div className={styles.successCard}>
                <div className={styles.successIcon}>✓</div>
                <h2>Authentication Successful!</h2>
                <p>You have successfully logged in.</p>
                <div className={styles.loadingSpinner}></div>
                <p>Redirecting you to page...</p>
            </div>
        </div>
    );

}