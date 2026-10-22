import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    getDashboardStats,
    isAdmin,
    isAuthenticated,
} from "../../../services/api";
import styles from "./AdminDashboard.module.css";


export default function AdminDashboard() {


    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalProducts: 0,
        totalCategories: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getDashboardStats();
            setStats({
                totalProducts: data.totalProducts || 0,
                totalCategories: data.totalCategories || 0,
                totalOrders: data.totalOrders || 0,
                totalUsers: data.totalUsers || 0,
                totalRevenue: data.totalRevenue || 0,
            });
        } catch (error: any) {
            console.error("Error fetching stats:", error);
            setError(error.message || "Failed to fetch dashboard statistics");
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/login");
        } else if (!isAdmin()) {
            navigate("/products");
        } else {
            fetchDashboardStats();
        }
    }, [navigate]);

    if (loading) {
        return (
            <div className={styles.adminDashboard}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.adminDashboard}>
                <div className="container">
                    <div className={styles.errorContainer}>
                        <div className={styles.errorMessage}>
                            <h3>Error Loading Dashboard</h3>
                            <p>{error}</p>
                        </div>
                        <button onClick={fetchDashboardStats} className={styles.retryBtn}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.adminDashboard}>
            <div className="container">
                <div className={styles.dashboardHeader}>
                    <h1>Admin Dashboard</h1>
                    <p>Welcome back, Admin</p>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>📦</div>
                        <div className={styles.statInfo}>
                            <h3>{stats.totalProducts}</h3>
                            <p>Total Products</p>
                        </div>
                        <Link to="/admin/products" className={styles.statLink}>
                            Manage →
                        </Link>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>📁</div>
                        <div className={styles.statInfo}>
                            <h3>{stats.totalCategories}</h3>
                            <p>Categories</p>
                        </div>
                        <Link to="/admin/categories" className={styles.statLink}>
                            Manage →
                        </Link>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>🛒</div>
                        <div className={styles.statInfo}>
                            <h3>{stats.totalOrders}</h3>
                            <p>Total Orders</p>
                        </div>
                        <Link to="/admin/orders" className={styles.statLink}>
                            View →
                        </Link>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>👥</div>
                        <div className={styles.statInfo}>
                            <h3>{stats.totalUsers}</h3>
                            <p>Total Users</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>💰</div>
                        <div className={styles.statInfo}>
                            <h3>
                                ${stats.totalRevenue.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </h3>
                            <p>Total Revenue</p>
                        </div>
                    </div>
                </div>

                <div className={styles.quickActions}>
                    <h2>Quick Actions</h2>
                    <div className={styles.actionsGrid}>
                        <Link to="/admin/products/add" className={styles.actionCard}>
                            <span>➕</span>
                            <p>Add New Product</p>
                        </Link>
                        <Link to="/admin/categories" className={styles.actionCard}>
                            <span>📁</span>
                            <p>Manage Categories</p>
                        </Link>
                        <Link to="/admin/register" className={styles.actionCard}>
                            <span>👤</span>
                            <p>Register User</p>
                        </Link>
                        <Link to="/admin/orders" className={styles.actionCard}>
                            <span>📋</span>
                            <p>Manage Orders</p>
                        </Link>
                        <Link to="/products" className={styles.actionCard}>
                            <span>🛍️</span>
                            <p>View Store</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}