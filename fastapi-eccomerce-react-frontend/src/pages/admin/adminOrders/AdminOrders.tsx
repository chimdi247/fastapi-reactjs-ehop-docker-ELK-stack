import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getAllOrders,
    isAdmin,
    isAuthenticated,
    updateOrderStatus,
} from "../../../services/api";
import styles from "./AdminOrders.module.css";


export default function AdminOrdersPage() {


    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const [filter, setFilter] = useState<string>("all");


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

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }
        if (!isAdmin()) {
            navigate("/products");
            return;
        }
        fetchOrders();
    }, [navigate]);


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


    if (loading) {
        return (
            <div className={styles.adminOrdersContainer}>
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
        <div className={styles.adminOrdersContainer}>
            <div className="container">
                <div className={styles.pageHeader}>
                    <h1>Order Management</h1>
                    <p>View and manage all customer orders</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <div className={styles.filterSection}>
                    <button
                        className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("all")}
                    >
                        All ({orders.length})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "pending" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("pending")}
                    >
                        Pending ({orders.filter((o) => o.status === "pending").length})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "processing" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("processing")}
                    >
                        Processing (
                        {orders.filter((o) => o.status === "processing").length})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "shipped" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("shipped")}
                    >
                        Shipped ({orders.filter((o) => o.status === "shipped").length})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === "delivered" ? styles.active : ""
                            }`}
                        onClick={() => setFilter("delivered")}
                    >
                        Delivered ({orders.filter((o) => o.status === "delivered").length})
                    </button>
                </div>

                <div className={styles.ordersTableWrapper}>
                    <table className={styles.ordersTable}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Shipping Address</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyRow}>
                                        No orders found
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td>${parseFloat(order.totalPrice).toFixed(2)}</td>
                                        <td className={styles.addressCell}>
                                            {order.shippingAddress}
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${getStatusBadgeClass(
                                                    order.status
                                                )}`}
                                            >
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
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
                                                    {updatingOrderId === order.id ? "..." : nextStatus}
                                                </button>
                                            ))}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}