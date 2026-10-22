import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    getCategories,
    getProductById,
    isAdmin,
    isAuthenticated,
    updateProduct,
} from "../../../services/api";
import styles from "./EditProduct.module.css";



export default function EditProductPage() {


    const navigate = useNavigate();
    const params = useParams();
    const productId = params.id as string;

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");
    const [imagePreview, setImagePreview] = useState("");
    const [currentImage, setCurrentImage] = useState("");

    const [formData, setFormData] = useState({
        id: "",
        name: "",
        description: "",
        price: "",
        stockQuantity: "",
        categoryId: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);



    const fetchData = async () => {
        try {
            setFetching(true);
            const [product, categoriesData] = await Promise.all([
                getProductById(parseInt(productId)),
                getCategories(),
            ]);

            setCategories(categoriesData);
            setFormData({
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                stockQuantity: product.stockQuantity,
                categoryId: product.categoryId,
            });
            setCurrentImage(product.imageUrl);
            setImagePreview(product.imageUrl);
        } catch (err: any) {
            setError(err.message || "Failed to load product");
        } finally {
            setFetching(false);
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
    }, [navigate, productId]);



    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const submitFormData = new FormData();
            submitFormData.append("id", formData.id);
            submitFormData.append("name", formData.name);
            submitFormData.append("description", formData.description);
            submitFormData.append("price", formData.price);
            submitFormData.append("stock_quantity", formData.stockQuantity);
            submitFormData.append("category_id", formData.categoryId);

            if (selectedFile) {
                submitFormData.append("file", selectedFile);
            }

            await updateProduct(submitFormData);
            navigate("/admin/products");
        } catch (err: any) {
            setError(err.message || "Failed to update product");
        } finally {
            setLoading(false);
        }
    };




    if (fetching) {
        return (
            <div className={styles.adminProductsContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading product...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminProductsContainer}>
            <div className="container">
                <div className={styles.formHeader}>
                    <Link to="/admin/products" className={styles.backLink}>
                        ← Back to Products
                    </Link>
                    <h1>Edit Product</h1>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.productForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Product Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter product name"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="categoryId">Category *</label>
                            <select
                                id="categoryId"
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                required
                            >
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="price">Price *</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="stockQuantity">Stock Quantity *</label>
                            <input
                                type="number"
                                id="stockQuantity"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleChange}
                                required
                                min="0"
                                placeholder="0"
                            />
                        </div>

                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label htmlFor="description">Description *</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={5}
                                placeholder="Enter product description"
                            />
                        </div>

                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label>Current Image</label>
                            {currentImage && (
                                <div className={styles.imagePreview}>
                                    <img src={imagePreview} alt="Current" />
                                </div>
                            )}
                            <label htmlFor="image" className={styles.uploadLabel}>
                                Change Image (Optional)
                            </label>
                            <input
                                type="file"
                                id="image"
                                name="image"
                                onChange={handleFileChange}
                                accept="image/*"
                            />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <Link to="/admin/products" className={styles.cancelBtn}>
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}