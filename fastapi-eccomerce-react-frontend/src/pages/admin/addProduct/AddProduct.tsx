
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    createProduct,
    getCategories,
    isAdmin,
    isAuthenticated,
} from "../../../services/api";
import styles from "./AddProduct.module.css";


export default function AddProductPage() {

    const navigate = useNavigate();

    const [categories, setCategories] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [imagePreview, setImagePreview] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        stockQuantity: "",
        categoryId: "",
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);


    const fetchCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
            if (data.length > 0) {
                setFormData((prev) => ({
                    ...prev,
                    categoryId: data[0].id.toString(),
                }));
            }
        } catch (err: any) {
            setError(err.message || "Failed to load categories");
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
        fetchCategories();
    }, [navigate]);




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
        if (!selectedFile) {
            setError("Please select an image for the product");
            return;
        }

        if (!formData.categoryId) {
            setError("Please select a category");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const submitFormData = new FormData();
            submitFormData.append("name", formData.name);
            submitFormData.append("description", formData.description);
            submitFormData.append("price", formData.price);
            submitFormData.append("stock_quantity", formData.stockQuantity);
            submitFormData.append("category_id", formData.categoryId);
            submitFormData.append("file", selectedFile);

            await createProduct(submitFormData);
            navigate("/admin/products");
        } catch (err: any) {
            setError(err.message || "Failed to create product");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className={styles.adminProductsContainer}>
            <div className="container">
                <div className={styles.formHeader}>
                    <Link to="/admin/products" className={styles.backLink}>
                        ← Back to Products
                    </Link>
                    <h1>Add New Product</h1>
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
                            <label htmlFor="image">Product Image *</label>
                            <input
                                type="file"
                                id="image"
                                name="image"
                                onChange={handleFileChange}
                                accept="image/*"
                                required
                            />
                            {imagePreview && (
                                <div className={styles.imagePreview}>
                                    <img src={imagePreview} alt="Preview" />
                                </div>
                            )}
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
                            {loading ? "Creating..." : "Create Product"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}