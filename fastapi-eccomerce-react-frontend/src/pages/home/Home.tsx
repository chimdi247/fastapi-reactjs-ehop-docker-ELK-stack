import { Link } from 'react-router-dom';
import styles from './Home.module.css';

export default function Home() {
    return (
        <>
            {/* Hero Section */}
            <section className={styles.heroSection}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Welcome to ShopEase</h1>
                    <p className={styles.heroSubtitle}>
                        Discover amazing products at unbeatable prices with fast delivery
                    </p>
                    <Link to="/products" className={styles.heroBtn}>
                        Shop Now →
                    </Link>
                </div>
            </section>

            {/* Features Section */}
            <section className={styles.featuresSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>Why Choose ShopEase?</h2>
                    <div className={styles.featuresGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🚚</div>
                            <h3>Free Delivery</h3>
                            <p>Free shipping on orders over $50</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🛡️</div>
                            <h3>Secure Payment</h3>
                            <p>100% secure payment methods</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>⭐</div>
                            <h3>Quality Products</h3>
                            <p>Premium quality guaranteed</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>💯</div>
                            <h3>24/7 Support</h3>
                            <p>Dedicated customer support</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <div className={styles.container}>
                    <h2>Ready to Start Shopping?</h2>
                    <p>Join thousands of happy customers who shop with us every day</p>
                    <Link to="/products" className={styles.ctaBtn}>
                        Browse Products
                    </Link>
                </div>
            </section>
        </>
    )
}