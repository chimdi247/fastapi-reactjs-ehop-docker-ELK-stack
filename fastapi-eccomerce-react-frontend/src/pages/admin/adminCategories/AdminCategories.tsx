import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createCategory,
    deleteCategory,
    getCategories,
    isAdmin,
    isAuthenticated,
    updateCategory,
} from "../../../services/api";
import styles from "./AdminCategories.module.css";


export default function AdminCategoriesPage() {

    const navigate = useNavigate();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<"add" | "edit" | "delete">("add");
    const [selectedCategory, setSelectedCategory] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    const [submitting, setSubmitting] = useState(false);


    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await getCategories();
            setCategories(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch categories");
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
        fetchCategories();
    }, [navigate]);


    const handleOpenAddModal = () => {
        setModalType("add");
        setFormData({ name: "", description: "" });
        setShowModal(true);
    };

    const handleOpenEditModal = (category: any) => {
        setModalType("edit");
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            description: category.description || "",
        });
        setShowModal(true);
    };

    const handleOpenDeleteModal = (category: any) => {
        setModalType("delete");
        setSelectedCategory(category);
        setShowModal(true);
    };



    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            if (modalType === "add") {
                await createCategory(formData);
                showToast("Category created successfully!");
            } else if (modalType === "edit" && selectedCategory) {
                await updateCategory({
                    id: selectedCategory.id,
                    name: formData.name,
                    description: formData.description,
                });
                showToast("Category updated successfully!");
            }

            setShowModal(false);
            await fetchCategories();
        } catch (err: any) {
            setError(err.message || "Failed to save category");
        } finally {
            setSubmitting(false);
        }
    };


    const handleDelete = async () => {
        if (!selectedCategory) return;

        setSubmitting(true);
        setError(null);

        try {
            await deleteCategory(selectedCategory.id);
            showToast("Category deleted successfully!");
            setShowModal(false);
            await fetchCategories();
        } catch (err: any) {
            setError(err.message || "Failed to delete category");
        } finally {
            setSubmitting(false);
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



    if (loading) {
        return (
            <div className={styles.adminCategoriesContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading categories...</p>
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div className={styles.adminCategoriesContainer}>
            <div className="container">
                <div className={styles.adminHeader}>
                    <div>
                        <h1>Manage Categories</h1>
                        <p>Add, edit, or remove product categories</p>
                    </div>
                    <button onClick={handleOpenAddModal} className={styles.addCategoryBtn}>
                        + Add New Category
                    </button>
                </div>

                {error && (
                    <div className={styles.errorAlert}>
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <div className={styles.categoriesGrid}>
                    {categories.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📂</div>
                            <h3>No Categories Yet</h3>
                            <p>Click "Add New Category" to create your first category.</p>
                        </div>
                    ) : (
                        categories.map((category) => (
                            <div key={category.id} className={styles.categoryCard}>
                                <div className={styles.categoryIcon}>
                                    {getCategoryIcon(category.name)}
                                </div>
                                <div className={styles.categoryInfo}>
                                    <h3>{category.name}</h3>
                                    <p>{category.description || "No description provided"}</p>
                                    <div className={styles.categoryStats}>
                                        <span>ID: {category.id}</span>
                                    </div>
                                </div>
                                <div className={styles.categoryActions}>
                                    <button
                                        onClick={() => handleOpenEditModal(category)}
                                        className={styles.editBtn}
                                        title="Edit Category"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleOpenDeleteModal(category)}
                                        className={styles.deleteBtn}
                                        title="Delete Category"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className={styles.statsFooter}>
                    <p>Total Categories: {categories.length}</p>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h2>
                                {modalType === "add" && "Add New Category"}
                                {modalType === "edit" && "Edit Category"}
                                {modalType === "delete" && "Delete Category"}
                            </h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {modalType === "delete" ? (
                            <>
                                <div className={styles.modalBody}>
                                    <p>
                                        Are you sure you want to delete{" "}
                                        <strong>{selectedCategory?.name}</strong>?
                                    </p>
                                    <p className={styles.warningText}>
                                        ⚠️ This action cannot be undone. Products in this category
                                        will lose their category assignment.
                                    </p>
                                </div>
                                <div className={styles.modalFooter}>
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={styles.confirmDeleteBtn}
                                        onClick={handleDelete}
                                        disabled={submitting}
                                    >
                                        {submitting ? "Deleting..." : "Delete Category"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className={styles.modalBody}>
                                    {error && (
                                        <div className={styles.modalError}>
                                            <span>⚠️</span>
                                            <p>{error}</p>
                                        </div>
                                    )}

                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Category Name *</label>
                                        <input
                                            type="text"
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            required
                                            placeholder="Enter category name"
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="description">Description *</label>
                                        <textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows={3}
                                            required
                                            placeholder="Enter category description"
                                            disabled={submitting}
                                        />
                                    </div>
                                </div>
                                <div className={styles.modalFooter}>
                                    <button
                                        type="button"
                                        className={styles.cancelBtn}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={submitting}
                                    >
                                        {submitting
                                            ? "Saving..."
                                            : modalType === "add"
                                                ? "Add Category"
                                                : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function getCategoryIcon(categoryName: string): string {
    const icons: Record<string, string> = {
        electronics: "📱",
        fashion: "👕",
        books: "📚",
        "home & garden": "🏠",
        "home and garden": "🏠",
        sports: "⚽",
        toys: "🧸",
        beauty: "💄",
        food: "🍕",
    };

    const normalizedName = categoryName.toLowerCase().trim();

    if (icons[normalizedName]) {
        return icons[normalizedName];
    }

    for (const [key, icon] of Object.entries(icons)) {
        if (normalizedName.includes(key)) {
            return icon;
        }
    }

    return "📦";
}