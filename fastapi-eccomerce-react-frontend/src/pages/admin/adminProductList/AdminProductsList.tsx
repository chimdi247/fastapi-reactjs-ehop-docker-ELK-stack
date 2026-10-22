import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    deleteProduct,
    getCategories,
    getProducts,
    isAdmin,
    isAuthenticated,
} from "../../../services/api";
import styles from "./AdminProductsList.module.css";



export default function AdminProductsPage() {


    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");



    const fetchData = async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData] = await Promise.all([
                getProducts(),
                getCategories(),
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (err: any) {
            setError(err.message || "Failed to fetch data");
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
        fetchData();
    }, [navigate]);

    const handleDeleteClick = (product: any) => {
        setSelectedProduct(product);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedProduct) return;

        try {
            await deleteProduct(selectedProduct.id);
            setProducts(products.filter((p) => p.id !== selectedProduct.id));
            setShowDeleteModal(false);
            setSelectedProduct(null);
            showToast("Product deleted successfully!");
        } catch (err: any) {
            showToast(err.message || "Failed to delete product", "error");
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


    const getCategoryName = (categoryId: number) => {
        const category = categories.find((c) => c.id === categoryId);
        return category ? category.name : "Unknown";
    };

    const filteredProducts = products.filter(
        (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className={styles.adminProductsContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading products...</p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.adminProductsContainer}>
            <div className="container">
                <div className={styles.adminHeader}>
                    <div>
                        <h1>Manage Products</h1>
                        <p>Add, edit, or remove products from your store</p>
                    </div>
                    <Link to="/admin/products/add" className={styles.addProductBtn}>
                        + Add New Product
                    </Link>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <div className={styles.searchBar}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.productsTableWrapper}>
                    <table className={styles.productsTable}>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={styles.emptyRow}>
                                        No products found
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id}>
                                        <td className={styles.productImageCell}>
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className={styles.productThumb}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = "/images/product.png";
                                                }}
                                            />
                                        </td>
                                        <td>{product.id}</td>
                                        <td className={styles.productNameCell}>{product.name}</td>
                                        <td>{getCategoryName(product.categoryId)}</td>
                                        <td>${parseFloat(product.price).toFixed(2)}</td>
                                        <td>
                                            <span
                                                className={`${styles.stockBadge} ${product.stockQuantity <= 5
                                                    ? styles.lowStock
                                                    : styles.inStock
                                                    }`}
                                            >
                                                {product.stockQuantity}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <Link
                                                to={`/admin/products/edit/${product.id}`}
                                                className={styles.editBtn}
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteClick(product)}
                                                className={styles.deleteBtn}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.statsFooter}>
                    <p>Total Products: {products.length}</p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedProduct && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h2>Confirm Delete</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowDeleteModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>
                                Are you sure you want to delete{" "}
                                <strong>{selectedProduct.name}</strong>?
                            </p>
                            <p className={styles.warningText}>
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.confirmDeleteBtn}
                                onClick={confirmDelete}
                            >
                                Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}