import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin, registerUser } from "../../../services/api";
import styles from "./AdminRegister.module.css";


export default function AdminRegister() {

    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        password: "",
        role: "CUSTOMER",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");




    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError("");
        setSuccess("");
    };



    const handleSubmit = async (e: any) => {

        e.preventDefault();

        if (!isAdmin) {
            navigate("/login")
            return
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await registerUser({
                email: formData.email,
                name: formData.name,
                password: formData.password,
                role: formData.role,
            });

            setSuccess(`${formData.role} user registered successfully!`);
            setFormData({
                email: "",
                name: "",
                password: "",
                role: "CUSTOMER",
            });
            navigate("/admin/dashboard")
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className={styles.adminRegisterContainer}>
            <div className={styles.adminRegisterCard}>
                <div className={styles.adminHeader}>
                    <h1>Register Custom User</h1>
                    <p>Create admin, delivery, or customer accounts</p>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className={styles.successAlert}>
                        <span>✅</span>
                        <p>{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.adminForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter full name"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Enter email address"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Enter password (min 6 characters)"
                            disabled={loading}
                            minLength={6}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="role">Select Role</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        >
                            <option value="CUSTOMER">Customer</option>
                            <option value="ADMIN">Admin</option>
                            <option value="DELIVERY">Delivery Person</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className={styles.adminRegisterBtn}
                        disabled={loading}
                    >
                        {loading ? "Registering..." : "Register User"}
                    </button>
                </form>

                <div className={styles.adminInfo}>
                    <h3>Role Information:</h3>
                    <ul>
                        <li>
                            <strong>Admin:</strong> Full access to manage products, users, and
                            orders
                        </li>
                        <li>
                            <strong>Delivery:</strong> Can update order status and manage
                            deliveries
                        </li>
                        <li>
                            <strong>Customer:</strong> Can browse products, place orders, and
                            leave reviews
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
