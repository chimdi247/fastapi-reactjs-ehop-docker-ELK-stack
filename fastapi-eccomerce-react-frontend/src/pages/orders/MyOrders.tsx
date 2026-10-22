import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    createReview,
    getMyOrders,
    isAuthenticated,
} from "../../services/api";
import styles from "./MyOrders.module.css";



export default function MyOrdersPage() {


    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const [reviewData, setReviewData] = useState({
        rating: 5,
        comment: "",
    });
    const [submittingReview, setSubmittingReview] = useState(false);
    // New state variables for inline messages
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);


    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getMyOrders();
            const sortedOrders = data.sort(
                (a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setOrders(sortedOrders);
        } catch (err: any) {
            setError(err.message || "Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }
        fetchOrders();
    }, [navigate]);



    const getStatusBadgeClass = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return styles.statusPending;
            case "processing":
                return styles.statusProcessing;
            case "shipped":
                return styles.statusShipped;
            case "delivered":
                return styles.statusDelivered;
            case "cancelled":
                return styles.statusCancelled;
            default:
                return styles.statusPending;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return "⏳";
            case "processing":
                return "🔄";
            case "shipped":
                return "🚚";
            case "delivered":
                return "✅";
            case "cancelled":
                return "❌";
            default:
                return "📦";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getProgressSteps = (status: string) => {
        const currentStatus = status.toLowerCase();
        let activeSteps: any = [];

        if (currentStatus === "pending") {
            activeSteps = [
                { key: "pending", label: "Order Placed", icon: "📝", active: true, completed: false },
            ];
        } else if (currentStatus === "processing") {
            activeSteps = [
                { key: "pending", label: "Order Placed", icon: "📝", active: false, completed: true },
                { key: "processing", label: "Processing", icon: "🔄", active: true, completed: false },
            ];
        } else if (currentStatus === "shipped") {
            activeSteps = [
                { key: "pending", label: "Order Placed", icon: "📝", active: false, completed: true },
                { key: "processing", label: "Processing", icon: "🔄", active: false, completed: true },
                { key: "shipped", label: "Shipped", icon: "🚚", active: true, completed: false },
            ];
        } else if (currentStatus === "delivered") {
            activeSteps = [
                { key: "pending", label: "Order Placed", icon: "📝", active: false, completed: true },
                { key: "processing", label: "Processing", icon: "🔄", active: false, completed: true },
                { key: "shipped", label: "Shipped", icon: "🚚", active: false, completed: true },
                { key: "delivered", label: "Delivered", icon: "✅", active: true, completed: false },
            ];
        }

        return activeSteps;
    };



    const handleWriteReview = (item: any, orderId: number) => {
        setSelectedProduct({
            productId: item.productId,
            productName: item.productName,
            orderId: orderId,
        });
        setReviewData({ rating: 5, comment: "" });
        setReviewError(null);
        setReviewSuccess(null);
        setShowReviewModal(true);
    };




    const handleReviewSubmit = async (e: any) => {
        e.preventDefault();
        setSubmittingReview(true);
        setReviewError(null);
        setReviewSuccess(null);

        try {
            await createReview({
                product_id: selectedProduct.productId,
                order_id: selectedProduct.orderId,
                rating: reviewData.rating,
                comment: reviewData.comment,
            });

            setOrders((prevOrders) =>
                prevOrders.map((order) => {
                    if (order.id === selectedProduct.orderId) {
                        return {
                            ...order,
                            items: order.items.map((item: any) =>
                                item.productId === selectedProduct.productId
                                    ? { ...item, isReviewed: true }
                                    : item
                            ),
                        };
                    }
                    return order;
                })
            );

            setReviewSuccess("Review submitted successfully!");
            setTimeout(() => {
                setShowReviewModal(false);
                setReviewData({ rating: 5, comment: "" });
                setReviewSuccess(null);
            }, 1500);
        } catch (err: any) {
            setReviewError(err.message || "Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };


    if (loading) {
        return (
            <div className={styles.ordersContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading your orders...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.ordersContainer}>
                <div className="container">
                    <div className={styles.errorContainer}>
                        <div className={styles.errorMessage}>
                            <h3>Error loading orders</h3>
                            <p>{error}</p>
                        </div>
                        <button onClick={fetchOrders} className={styles.retryBtn}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    if (orders.length === 0) {
        return (
            <div className={styles.ordersContainer}>
                <div className="container">
                    <div className={styles.emptyOrders}>
                        <div className={styles.emptyIcon}>📦</div>
                        <h2>No Orders Yet</h2>
                        <p>You haven't placed any orders yet.</p>
                        <Link to="/products" className={styles.shopNowBtn}>
                            Start Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.ordersContainer}>
            <div className="container">
                <div className={styles.ordersHeader}>
                    <h1>My Orders</h1>
                    <p>Track and manage your orders</p>
                </div>

                <div className={styles.ordersList}>
                    {orders.map((order) => {
                        const progressSteps = getProgressSteps(order.status);
                        const currentStatus = order.status.toLowerCase();

                        return (
                            <div key={order.id} className={styles.orderCard}>
                                <div className={styles.orderHeader}>
                                    <div className={styles.orderInfo}>
                                        <span className={styles.orderNumber}>Order #{order.id}</span>
                                        <span className={styles.orderDate}>
                                            {formatDate(order.createdAt)}
                                        </span>
                                    </div>
                                    <div
                                        className={`${styles.orderStatus} ${getStatusBadgeClass(
                                            order.status
                                        )}`}
                                    >
                                        <span className={styles.statusIcon}>
                                            {getStatusIcon(order.status)}
                                        </span>
                                        <span className={styles.statusText}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.orderDetails}>
                                    <div className={styles.orderSummary}>
                                        <div className={styles.summaryItem}>
                                            <span className={styles.label}>Total Amount:</span>
                                            <span className={styles.value}>
                                                ${parseFloat(order.totalPrice).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className={styles.summaryItem}>
                                            <span className={styles.label}>Shipping Address:</span>
                                            <span className={styles.value}>
                                                {order.shippingAddress}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className={styles.orderItems}>
                                        <h3>Order Items</h3>
                                        <div className={styles.itemsList}>
                                            {order.items.map((item: any) => (
                                                <div key={item.id} className={styles.orderItem}>
                                                    <div className={styles.itemInfo}>
                                                        <div className={styles.itemName}>
                                                            {item.productName}
                                                        </div>
                                                        <div className={styles.itemDetails}>
                                                            <span>📦 Quantity: {item.quantity}</span>
                                                            <span>
                                                                💰 Price: ${parseFloat(item.unitPrice).toFixed(2)}
                                                            </span>
                                                            <span>
                                                                💵 Subtotal: ${parseFloat(item.subtotal).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.itemAction}>
                                                        {currentStatus === "delivered" &&
                                                            (item.isReviewed ? (
                                                                <span className={styles.reviewedBadge}>
                                                                    ✓ Reviewed
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleWriteReview(item, order.id)}
                                                                    className={styles.writeReviewBtn}
                                                                >
                                                                    ✍️ Write a Review
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Progress Tracker */}
                                    {currentStatus !== "pending" && currentStatus !== "cancelled" && (
                                        <div className={styles.orderProgress}>
                                            <div className={styles.progressTracker}>
                                                {progressSteps.map((step: any, index: any) => (
                                                    <div
                                                        key={step.key}
                                                        className={`${styles.progressStep} ${step.completed ? styles.completed : ""
                                                            } ${step.active ? styles.active : ""}`}
                                                    >
                                                        <div className={styles.stepIndicator}>
                                                            <div className={styles.stepCircle}>
                                                                {step.completed ? "✓" : step.icon}
                                                            </div>
                                                            {index < progressSteps.length - 1 && (
                                                                <div
                                                                    className={`${styles.stepLine} ${step.completed ? styles.completedLine : ""
                                                                        }`}
                                                                ></div>
                                                            )}
                                                        </div>
                                                        <div className={styles.stepLabel}>{step.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending message */}
                                    {currentStatus === "pending" && (
                                        <div className={styles.pendingMessage}>
                                            <p>
                                                ⏳ Your order has been placed and is awaiting processing.
                                            </p>
                                        </div>
                                    )}

                                    {/* Cancelled message */}
                                    {currentStatus === "cancelled" && (
                                        <div className={styles.cancelledMessage}>
                                            <p>❌ This order has been cancelled.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Review Modal */}
            {showReviewModal && selectedProduct && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setShowReviewModal(false)}
                >
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h2>Write a Review</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowReviewModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleReviewSubmit}>
                            <div className={styles.modalBody}>
                                {/* Inline feedback banner */}
                                {reviewSuccess && (
                                    <div className={styles.modalSuccessBanner}>
                                        ✅ {reviewSuccess}
                                    </div>
                                )}
                                {reviewError && (
                                    <div className={styles.modalErrorBanner}>
                                        ⚠️ {reviewError}
                                    </div>
                                )}

                                <div className={styles.productInfoModal}>
                                    <h3>{selectedProduct.productName}</h3>
                                    <p className={styles.orderIdInfo}>
                                        Product ID: {selectedProduct.productId}
                                    </p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Rating</label>
                                    <div className={styles.ratingSelect}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() =>
                                                    setReviewData({ ...reviewData, rating: star })
                                                }
                                                className={`${styles.ratingStar} ${reviewData.rating >= star ? styles.active : ""
                                                    }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    {reviewData.rating && (
                                        <span className={styles.ratingLabel}>
                                            {reviewData.rating === 5 && "Excellent!"}
                                            {reviewData.rating === 4 && "Very Good"}
                                            {reviewData.rating === 3 && "Good"}
                                            {reviewData.rating === 2 && "Fair"}
                                            {reviewData.rating === 1 && "Poor"}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Your Review</label>
                                    <textarea
                                        value={reviewData.comment}
                                        onChange={(e) =>
                                            setReviewData({ ...reviewData, comment: e.target.value })
                                        }
                                        rows={5}
                                        placeholder="Share your experience with this product..."
                                        required
                                    />
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    className={styles.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReview || !!reviewSuccess}
                                    className={styles.submitBtn}
                                >
                                    {submittingReview ? "Submitting..." : "Submit Review"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}