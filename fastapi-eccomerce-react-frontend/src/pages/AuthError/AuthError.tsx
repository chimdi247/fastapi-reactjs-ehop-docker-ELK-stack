import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styles from "./AuthError.module.css";



export default function AuthErrorPage() {

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const error = searchParams.get("error");


    useEffect(() => {
        // Redirect to login after 5 seconds
        const timer = setTimeout(() => {
            navigate("/login");
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className={styles.authErrorContainer}>
            <div className={styles.errorCard}>
                <div className={styles.errorIcon}>✗</div>
                <h2>Authentication Failed</h2>

                <div className={styles.errorMessage}>
                    <p>
                        {error ||
                            "Something went wrong during authentication. Please try again."}
                    </p>
                </div>

                <Link to="/login" className={styles.backLink}>
                    Back to Login
                </Link>

                <p className={styles.redirectMessage}>
                    Redirecting to login page in 5 seconds...
                </p>
            </div>
        </div>
    );

}