import { useEffect, useState } from "react";
import {
    getAllOrders,
    getUserRole,
    isDelivery,
    updateOrderStatus,
} from "../../services/api";
import styles from "./DeliveryDashboard.module.css";
import { useNavigate } from "react-router-dom";


export default function DeliveryDashboard() {


    const navigate = useNavigate();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        // Check if user is delivery or admin appropriately
        if (!isDelivery()) {
            navigate("/products");
            return;
        }

        fetchOrders();
    }, [navigate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAllOrders();
            setOrders(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId: number, newStatus: string) => {
        setUpdatingOrderId(orderId);
        try {
            await updateOrderStatus(orderId, newStatus);

            setOrders((prevOrders) =>
                prevOrders.map((order) =>
                    order.id === orderId ? { ...order, status: newStatus } : order
                )
            );
            showToast(`Order #${orderId} status updated to ${newStatus}`);
        } catch (err: any) {
            showToast(err.message || "Failed to update order status", "error");
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const showToast = (message: string, type: "success" | "error" = "success") => {
        const toast = document.createElement("div");
        toast.className = `${styles.toastNotification} ${type === "error" ? styles.error : ""
            }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };



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

    const getNextStatuses = (currentStatus: string) => {
        const statusFlow: Record<string, string[]> = {
            pending: ["processing", "cancelled"],
            processing: ["shipped", "cancelled"],
            shipped: ["delivered"],
            delivered: [],
            cancelled: [],
        };
        return statusFlow[currentStatus.toLowerCase()] || [];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };



    const filteredOrders =
        filter === "all"
            ? orders
            : orders.filter((order) => order.status.toLowerCase() === filter);

    const stats = {
        total: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        processing: orders.filter((o) => o.status === "processing").length,
        shipped: orders.filter((o) => o.status === "shipped").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
    };



    const userRole = getUserRole();
    const pageTitle =
        userRole === "ADMIN" ? "Admin - Order Management" : "Delivery Dashboard";
    const pageSubtitle =
        userRole === "ADMIN"
            ? "Manage and update all customer orders"
            : "Manage your assigned deliveries";


    if (loading) {
        return (
            <div className={styles.deliveryDashboard}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading orders...</p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.deliveryDashboard}>
            <div className="container">
                <div className={styles.dashboardHeader}>
                    <h1>{pageTitle}</h1>
                    <p>{pageSubtitle}</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{stats.total}</div>
                        <div className={styles.statLabel}>Total Orders</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.pending}`}>
                        <div className={styles.statValue}>{stats.pending}</div>
                        <div className={styles.statLabel}>Pending</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.processing}`}>
                        <div className={styles.statValue}>{stats.processing}</div>
                        <div className={styles.statLabel}>Processing</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.shipped}`}>
                        <div className={styles.statValue}>{stats.shipped}</div>
                        <div className={styles.statLabel}>Shipped</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.delivered}`}>
                        <div className={styles.statValue}>{stats.delivered}</div>
                        <div className={styles.statLabel}>Delivered</div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className={styles.filterTabs}>
                    <button
                        className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("all")}
                    >
                        All Orders ({stats.total})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "pending" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("pending")}
                    >
                        Pending ({stats.pending})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "processing" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("processing")}
                    >
                        Processing ({stats.processing})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "shipped" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("shipped")}
                    >
                        Shipped ({stats.shipped})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "delivered" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("delivered")}
                    >
                        Delivered ({stats.delivered})
                    </button>
                </div>

                {/* Orders List */}
                <div className={styles.ordersList}>
                    {filteredOrders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📦</div>
                            <h3>No Orders Found</h3>
                            <p>There are no orders with the selected status.</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
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
                                        {order.status.toUpperCase()}
                                    </div>
                                </div>

                                <div className={styles.orderBody}>
                                    <div className={styles.orderDetails}>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Shipping Address:</span>
                                            <span className={styles.value}>
                                                {order.shippingAddress}
                                            </span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Total Amount:</span>
                                            <span className={styles.value}>
                                                ${parseFloat(order.totalPrice).toFixed(2)}
                                            </span>
                                        </div>
                                        {order.items && order.items.length > 0 && (
                                            <div className={styles.orderItems}>
                                                <span className={styles.label}>Items:</span>
                                                <div className={styles.itemsList}>
                                                    {order.items.map((item: any) => (
                                                        <div key={item.id} className={styles.item}>
                                                            {item.productName} x {item.quantity}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.orderActions}>
                                        {getNextStatuses(order.status).map((nextStatus) => (
                                            <button
                                                key={nextStatus}
                                                onClick={() =>
                                                    handleUpdateStatus(order.id, nextStatus)
                                                }
                                                disabled={updatingOrderId === order.id}
                                                className={`${styles.actionBtn} ${styles[nextStatus] || ""
                                                    }`}
                                            >
                                                {updatingOrderId === order.id
                                                    ? "Updating..."
                                                    : `Mark as ${nextStatus}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}