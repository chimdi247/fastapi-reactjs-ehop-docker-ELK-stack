import styles from "./Footer.module.css"
import { Link } from "react-router-dom"

export default function Footer() {
    const currentYear = new Date().getFullYear();


    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerSection}>
                        <h3>ShopEase</h3>
                        <p>Your one-stop destination for quality products at the best prices.</p>
                        <div className={styles.socialLinks}>
                            <a href="#" className={styles.socialIcon} aria-label="Facebook">
                                📘
                            </a>
                            <a href="#" className={styles.socialIcon} aria-label="Instagram">
                                📷
                            </a>
                            <a href="#" className={styles.socialIcon} aria-label="Twitter">
                                🐦
                            </a>
                            <a href="#" className={styles.socialIcon} aria-label="LinkedIn">
                                💼
                            </a>
                        </div>
                    </div>

                    <div className={styles.footerSection}>
                        <h3>Quick Links</h3>
                        <ul>
                            <li><Link to="/products">All Products</Link></li>
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/contact">Contact Us</Link></li>
                            <li><Link to="/faq">FAQ</Link></li>
                        </ul>
                    </div>

                    <div className={styles.footerSection}>
                        <h3>Customer Service</h3>
                        <ul>
                            <li><Link to="/shipping">Shipping Info</Link></li>
                            <li><Link to="/returns">Returns Policy</Link></li>
                            <li><Link to="/terms">Terms & Conditions</Link></li>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p>&copy; {currentYear} ShopEase. All rights reserved</p>
                </div>
            </div>
        </footer>
    );
}
