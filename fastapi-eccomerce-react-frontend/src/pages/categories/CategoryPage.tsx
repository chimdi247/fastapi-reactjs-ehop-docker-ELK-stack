import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../../services/api";
import styles from "./CategoryPage.module.css";


export default function CategoriesPage() {


    const [categories, setCategories] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);


    const fetchCategories = async () => {
        try {
            setError(null);
            const data = await getCategories();
            setCategories(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch categories");
        }
    };


    useEffect(() => {
        fetchCategories();
    }, []);

    const getCategoryIcon = (categoryName: string): string => {
        const icons: Record<string, string> = {
            electronics: "📱",
            clothing: "👕",
            books: "📚",
            "home & garden": "🏠",
            sports: "⚽",
            toys: "🧸",
            beauty: "💄",
            food: "🍕",
            fashion: "😅",
        };
        return icons[categoryName.toLowerCase().trim()] || "📦";
    };



    if (error) {
        return (
            <div className="container">
                <div className={styles.categoriesContainer}>
                    <div className={styles.errorContainer}>
                        <div className={styles.errorMessage}>
                            <h3>Error loading categories</h3>
                            <p>{error}</p>
                        </div>
                        <button onClick={fetchCategories} className={styles.retryBtn}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="container">
            <div className={styles.categoriesContainer}>
                <div className={styles.categoriesHeader}>
                    <h1>Shop by Category</h1>
                    <p>Browse our products by category</p>
                </div>

                {categories.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📂</div>
                        <h3>No categories found</h3>
                        <p>Check back later for new categories</p>
                    </div>
                ) : (
                    <div className={styles.categoriesGrid}>
                        {categories.map((category) => (
                            <Link
                                to={`/products?categoryId=${category.id}`}
                                key={category.id}
                                className={styles.categoryCard}
                            >
                                <div className={styles.categoryIcon}>
                                    {getCategoryIcon(category.name)}
                                </div>
                                <h3 className={styles.categoryName}>{category.name}</h3>
                                <p className={styles.categoryDescription}>
                                    {category.description || `Explore ${category.name} products`}
                                </p>
                                <span className={styles.shopNow}>Shop Now →</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );


}