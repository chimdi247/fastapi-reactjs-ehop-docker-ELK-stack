import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cancelPayment } from "../../services/api";
import styles from "./PaymentCancel.module.css";


export default function PaymentCancelPage(){

    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [orderId, setOrderId] = useState<number | null>(null);


    const processCancelledOrder = async () => {
        try {
            const result = await cancelPayment(sessionId!);
            if (result?.orderId) {
                setOrderId(result.orderId);
            }
        } catch (err) {
            console.error("Failed to fetch cancelled order:", err);
        }
    };

    useEffect(() => {
        if (sessionId) {
            processCancelledOrder();
        }
    }, [sessionId]);


    return (
        <div className={styles.paymentContainer}>
            <div className="container">
                <div className={styles.cancelCard}>
                    <div className={styles.cancelIcon}>✗</div>
                    <h1>Payment Cancelled</h1>
                    <p>Your payment was cancelled. No charges were made to your account.</p>

                    {orderId && (
                        <div className={styles.orderInfo}>
                            <p>Order #{orderId} has been cancelled. You can place a new order.</p>
                        </div>
                    )}

                    <div className={styles.messageBox}>
                        <p>What would you like to do?</p>
                        <ul>
                            <li>Try checking out again with the same cart</li>
                            <li>Review your cart and try a different payment method</li>
                            <li>Contact support if you need assistance</li>
                        </ul>
                    </div>

                    <div className={styles.buttonGroup}>
                        <Link to="/cart" className={styles.backToCartBtn}>
                            ← Back to Cart
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