import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getCart, getToken, getUserRole, isAuthenticated, logout } from "../services/api.ts";
import styles from './Navbar.module.css';



export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation()
    const pathname = location.pathname;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    const updateAuthState = () => {
        setIsLoggedIn(!!getToken());
        setUserRole(getUserRole());
    };


    const fetchCartCount = async () => {
        if (!isAuthenticated()) {
            setCartCount(0);
            return;
        }

        try {
            const cart = await getCart();
            setCartCount(cart?.totalQuantity || 0);
        } catch {
            setCartCount(0);
        }
    };


    useEffect(() => {

        updateAuthState();
        fetchCartCount();

        const handleAuthAndStorageChange = () => {
            updateAuthState();
            fetchCartCount();
        };

        window.addEventListener("storage", handleAuthAndStorageChange);
        window.addEventListener("authChange", handleAuthAndStorageChange);
        window.addEventListener("cartUpdated", fetchCartCount);

        return () => {
            window.removeEventListener("storage", handleAuthAndStorageChange);
            window.removeEventListener("authChange", handleAuthAndStorageChange);
            window.removeEventListener("cartUpdated", fetchCartCount);
        };
    }, []);


    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleLogout = () => {
        logout();
        setIsLoggedIn(false);
        setUserRole(null);
        setCartCount(0);

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(
            new CustomEvent("authChange", { detail: { isAuthenticated: false, role: null } })
        );
        window.dispatchEvent(new Event("cartUpdated"));

        navigate("/");
    };

    const isActive = (path: string) => pathname === path;


    return (
        <nav className={styles.navbar}>

            <div className={styles.navbarContainer}>
                <Link to="/" className={styles.logo} onClick={() => setIsMenuOpen(false)}>
                    ShopEase
                </Link>

                <div className={styles.menuIcon} onClick={toggleMenu}>
                    ☰
                </div>

                <ul className={`${styles.navMenu} ${isMenuOpen ? styles.active : ""}`}>
                    <li>
                        <Link
                            to="/"
                            className={styles.navLink}
                            style={isActive("/") ? { color: "var(--secondary-color)" } : {}}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Home
                        </Link>
                    </li>

                    <li>
                        <Link
                            to="/products"
                            className={styles.navLink}
                            style={isActive("/products") ? { color: "var(--secondary-color)" } : {}}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Products
                        </Link>
                    </li>

                    <li>
                        <Link
                            to="/categories"
                            className={styles.navLink}
                            style={isActive("/categories") ? { color: "var(--secondary-color)" } : {}}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Categories
                        </Link>
                    </li>

                    {isLoggedIn && (
                        <>
                            <li>
                                <Link
                                    to="/cart"
                                    className={`${styles.navLink} ${styles.cartIcon}`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    🛒
                                    {cartCount > 0 && (
                                        <span className={styles.cartCount}>{cartCount}</span>
                                    )}
                                </Link>
                            </li>

                            <li>
                                <Link
                                    to="/orders"
                                    className={styles.navLink}
                                    style={isActive("/orders") ? { color: "var(--secondary-color)" } : {}}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    My Orders
                                </Link>
                            </li>

                            <li>
                                <Link
                                    to="/profile"
                                    className={styles.navLink}
                                    style={isActive("/profile") ? { color: "var(--secondary-color)" } : {}}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    👤 Profile
                                </Link>
                            </li>
                        </>
                    )}
                    {userRole === "ADMIN" && (
                        <li>
                            <Link
                                to="/admin/dashboard"
                                className={styles.navLink}
                                style={isActive("/admin/dashboard") ? { color: "var(--secondary-color)" } : {}}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Admin
                            </Link>
                        </li>
                    )}

                    {userRole === "DELIVERY" && (
                        <li>
                            <Link
                                to="/delivery"
                                className={styles.navLink}
                                style={isActive("/delivery") ? { color: "var(--secondary-color)" } : {}}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Delivery Dashboard
                            </Link>
                        </li>
                    )}

                    <div className={styles.authButtons}>

                        {!isLoggedIn ? (
                            <>
                                <Link
                                    to="/login"
                                    className={styles.btnLogin}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className={styles.btnSignup}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Sign Up
                                </Link>

                            </>
                        ) : (

                            <div className={styles.userMenu}>
                                <button onClick={handleLogout} className={styles.btnLogout}>
                                    Logout
                                </button>
                            </div>
                        )}

                    </div>



                </ul>

            </div>

        </nav>
    )


}

