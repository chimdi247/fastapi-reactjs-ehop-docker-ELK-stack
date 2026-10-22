import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmPayment } from "../../services/api";
import styles from "./PaymentSuccess.module.css";



export default function PaymentSuccessPage() {

    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const verifyPayment = async () => {
        try {
            setLoading(true);
            const result = await confirmPayment(sessionId!);
            setOrder(result);
            console.log(result)
            console.log(JSON.stringify(result))
        } catch (err: any) {
            setError(err.message || "Payment verification failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionId) {
            setError("No session ID found");
            setLoading(false);
            return;
        }

        verifyPayment();
    }, [sessionId]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className={styles.paymentContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Verifying your payment...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.paymentContainer}>
                <div className="container">
                    <div className={styles.errorCard}>
                        <div className={styles.errorIcon}>❌</div>
                        <h2>Payment Verification Failed</h2>
                        <p>{error}</p>
                        <div className={styles.buttonGroup}>
                            <Link to="/orders" className={styles.viewOrdersBtn}>
                                View My Orders
                            </Link>
                            <Link to="/products" className={styles.continueShoppingBtn}>
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div className={styles.paymentContainer}>
            <div className="container">
                <div className={styles.successCard}>
                    <div className={styles.successIcon}>✓</div>
                    <h1>Payment Successful!</h1>
                    <p>Your order has been placed successfully and is now being processed.</p>

                    <div className={styles.orderDetails}>
                        <h2>Order Details</h2>

                        <div className={styles.orderInfoGrid}>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Order ID:</span>
                                <span className={styles.value}>#{order?.id}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Order Status:</span>
                                <span
                                    className={`${styles.value} ${styles.statusProcessing}`}
                                >
                                    {order?.status?.toUpperCase()}
                                </span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Total Amount:</span>
                                <span className={`${styles.value} ${styles.total}`}>
                                    ${parseFloat(order?.totalPrice || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Shipping Address:</span>
                                <span className={styles.value}>{order?.shippingAddress}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Order Date:</span>
                                <span className={styles.value}>
                                    {formatDate(order?.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.nextSteps}>
                        <h3>What's Next?</h3>
                        <ul>
                            <li>📧 You will receive an order confirmation email shortly</li>
                            <li>🚚 Our team will process your order within 24 hours</li>
                            <li>📦 You can track your order status in "My Orders" page</li>
                            <li>💬 For any questions, contact our support team</li>
                        </ul>
                    </div>

                    <div className={styles.buttonGroup}>
                        <Link to="/orders" className={styles.viewOrdersBtn}>
                            View My Orders
                        </Link>
                        <Link to="/products" className={styles.continueShoppingBtn}>
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
