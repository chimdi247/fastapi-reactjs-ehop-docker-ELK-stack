import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    addToCart,
    decrementCartItem,
    getCart,
    getProducts,
    getProductRating,
    isAuthenticated,
} from "../../services/api";
import styles from "./ProductPage.module.css";



export default function ProductsPage() {
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get("categoryId");

    const navigate = useNavigate();

    const [products, setProducts] = useState<any[]>([]);
    const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("name_asc");
    const [page, setPage] = useState(1);

    const [hasMore, setHasMore] = useState(true);

    const [selectedCategory, setSelectedCategory] = useState<number | null>(
        categoryId ? parseInt(categoryId) : null
    );

    const [cartItemsMap, setCartItemsMap] = useState<Record<number, number>>({});
    const [ratingsMap, setRatingsMap] = useState<Record<number, any>>({});

    const observerRef = useRef<IntersectionObserver | null>(null);
    const lastProductRef = useRef<HTMLDivElement | null>(null);

    const ITEMS_PER_PAGE = 5;



    const fetchCartItems = async () => {
        try {
            const cart = await getCart();
            const itemsMap: Record<number, number> = {};
            cart.items?.forEach((item: any) => {
                itemsMap[item.productId] = item.quantity;
            });
            setCartItemsMap(itemsMap);
        } catch (error) {
            console.error("Failed to fetch cart:", error);
        }
    };


    const fetchRatingsForProducts = async (productsList: any[]) => {
        const ratingsData: Record<number, any> = {};

        for (const product of productsList) {
            try {
                const rating = await getProductRating(product.id);
                ratingsData[product.id] = rating;
            } catch (error) {
                console.error(`Failed to fetch rating for product ${product.id}:`, error);
                ratingsData[product.id] = { average_rating: 0, total_reviews: 0 };
            }
        }

        setRatingsMap(ratingsData);
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            setPage(1);
            const data = await getProducts(selectedCategory || undefined);
            setProducts(data);
            setDisplayedProducts(data.slice(0, ITEMS_PER_PAGE));
            setHasMore(data.length > ITEMS_PER_PAGE);

            await fetchRatingsForProducts(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch products");
        } finally {
            setLoading(false);
        }
    };


    // Fetch products when category changes
    useEffect(() => {
        fetchProducts();
    }, [selectedCategory]);



    // Fetch cart items on mount and when cart updates
    useEffect(() => {
        if (isAuthenticated()) {
            fetchCartItems();
        }

        const handleCartUpdate = () => {
            if (isAuthenticated()) {
                fetchCartItems();
            }
        };

        window.addEventListener("cartUpdated", handleCartUpdate);
        return () => window.removeEventListener("cartUpdated", handleCartUpdate);
    }, []);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        const toast = document.createElement("div");
        toast.className = `${styles.toastNotification} ${type === "error" ? styles.error : ""
            }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };






    const handleUpdateQuantity = async (productId: number, change: number) => {
        try {
            if (change === 1) {
                await addToCart(productId, 1);
            } else if (change === -1) {
                await decrementCartItem(productId);
            }

            await fetchCartItems();
            window.dispatchEvent(new Event("cartUpdated"));
            showToast(change === 1 ? "Item quantity increased" : "Item quantity decreased");
        } catch (err: any) {
            showToast(err.message || "Failed to update cart", "error");
        }
    };


    const renderStars = (rating: number) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - Math.ceil(rating);

        const stars = [];

        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <span key={`full-${i}`} className={`${styles.star} ${styles.starFilled}`}>
                    ★
                </span>
            );
        }

        if (hasHalfStar) {
            stars.push(
                <span key="half" className={`${styles.star} ${styles.starHalfFilled}`}>
                    ★
                </span>
            );
        }

        for (let i = 0; i < emptyStars; i++) {
            stars.push(
                <span key={`empty-${i}`} className={styles.star}>
                    ☆
                </span>
            );
        }

        return stars;
    };

    const handleAddToCart = async (product: any) => {
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }

        try {
            await addToCart(product.id, 1);
            await fetchCartItems();
            window.dispatchEvent(new Event("cartUpdated"));
            showToast(`${product.name} added to cart!`);
        } catch (err: any) {
            showToast(err.message || "Failed to add to cart", "error");
        }
    };

    const getFilteredAndSortedProducts = useCallback(() => {
        let result = [...products];

        if (searchTerm) {
            result = result.filter(
                (product) =>
                    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        switch (sortBy) {
            case "price_asc":
                result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case "price_desc":
                result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case "name_asc":
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "name_desc":
                result.sort((a, b) => b.name.localeCompare(a.name));
                break;
            default:
                break;
        }

        return result;
    }, [products, searchTerm, sortBy]);



    useEffect(() => {
        const filtered = getFilteredAndSortedProducts();
        setDisplayedProducts(filtered.slice(0, page * ITEMS_PER_PAGE));
        setHasMore(filtered.length > page * ITEMS_PER_PAGE);
    }, [products, searchTerm, sortBy, page, getFilteredAndSortedProducts]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            setTimeout(() => {
                setPage((prev) => prev + 1);
                setLoadingMore(false);
            }, 500);
        }
    };

    useEffect(() => {
        if (loading || loadingMore) return;

        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (lastProductRef.current) {
            observerRef.current.observe(lastProductRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [displayedProducts, hasMore, loading, loadingMore]);


    const clearCategoryFilter = () => {
        setSelectedCategory(null);
        navigate("/products");
    };




    if (loading) {
        return (
            <div className="container">
                <div className={styles.productsContainer}>
                    <div className={styles.productsHeader}>
                        <h1>Our Products</h1>
                        <p>Discover our collection of high-quality products</p>
                    </div>
                    <div className={styles.productsGrid}>
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className={`${styles.productCard} ${styles.loadingCard}`}>
                                <div className={styles.loadingImage}></div>
                                <div className={styles.loadingContent}>
                                    <div className={styles.loadingTitle}></div>
                                    <div className={styles.loadingDescription}></div>
                                    <div className={styles.loadingPrice}></div>
                                    <div className={styles.loadingButton}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className={styles.productsContainer}>
                    <div className={styles.errorContainer}>
                        <div className={styles.errorMessage}>
                            <h3>Error loading products</h3>
                            <p>{error}</p>
                        </div>
                        <button onClick={fetchProducts} className={styles.retryBtn}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const filteredProducts = getFilteredAndSortedProducts();
    const totalProducts = filteredProducts.length;

    return (
        <div className="container">
            <div className={styles.productsContainer}>
                {/* Header */}
                <div className={styles.productsHeader}>
                    <h1>Our Products</h1>
                    <p>Discover our collection of high-quality products</p>
                    {selectedCategory && (
                        <div className={styles.categoryFilterBadge}>
                            <span>Category: {selectedCategory}</span>
                            <button onClick={clearCategoryFilter} className={styles.clearFilter}>
                                ✕ Clear Filter
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters Section */}
                <div className={styles.filtersSection}>
                    <div className={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.sortSelect}
                    >
                        <option value="name_asc">Name A-Z</option>
                        <option value="name_desc">Name Z-A</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                    </select>
                </div>

                {/* Products Grid */}
                {displayedProducts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🔍</div>
                        <h3>No products found</h3>
                        <p>Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.productsGrid}>
                            {displayedProducts.map((product, index) => {
                                const rating = ratingsMap[product.id];
                                const averageRating = rating?.average_rating || 0;
                                const totalReviews = rating?.total_reviews || 0;

                                return (
                                    <div
                                        key={product.id}
                                        className={styles.productCard}
                                        ref={
                                            index === displayedProducts.length - 1 ? lastProductRef : null
                                        }
                                    >
                                        <Link to={`/products/${product.id}`}>
                                            <div className={styles.productImageContainer}>
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className={styles.productImage}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = "/images/product.jpeg";
                                                    }}
                                                />
                                                {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
                                                    <span className={`${styles.stockBadge} ${styles.lowStock}`}>
                                                        Only {product.stockQuantity} left
                                                    </span>
                                                )}
                                                {product.stockQuantity === 0 && (
                                                    <span className={`${styles.stockBadge} ${styles.outOfStock}`}>
                                                        Out of Stock
                                                    </span>
                                                )}
                                            </div>
                                        </Link>

                                        <div className={styles.productInfo}>
                                            <Link to={`/products/${product.id}`}>
                                                <h3 className={styles.productTitle}>{product.name}</h3>
                                            </Link>

                                            {/* Rating Display */}
                                            <div className={styles.productRating}>
                                                <div className={styles.ratingStars}>
                                                    {renderStars(averageRating)}
                                                </div>
                                                <span className={styles.ratingValue}>
                                                    {averageRating.toFixed(1)}
                                                </span>
                                                <span className={styles.reviewCount}>({totalReviews})</span>
                                            </div>

                                            <div className={styles.priceSection}>
                                                <span className={styles.productPrice}>
                                                    ${parseFloat(product.price).toFixed(2)}
                                                </span>
                                                <span className={styles.productStock}>
                                                    Stock: {product.stockQuantity}
                                                </span>
                                            </div>

                                            {cartItemsMap[product.id] ? (
                                                <div className={styles.cartQuantityControls}>
                                                    <button
                                                        onClick={() => handleUpdateQuantity(product.id, -1)}
                                                        className={styles.qtyBtn}
                                                        disabled={product.stockQuantity === 0}
                                                    >
                                                        -
                                                    </button>
                                                    <span className={styles.qtyValue}>
                                                        {cartItemsMap[product.id]}
                                                    </span>
                                                    <button
                                                        onClick={() => handleUpdateQuantity(product.id, 1)}
                                                        className={styles.qtyBtn}
                                                        disabled={product.stockQuantity === 0}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddToCart(product)}
                                                    disabled={product.stockQuantity === 0}
                                                    className={styles.addToCartBtn}
                                                >
                                                    {product.stockQuantity === 0
                                                        ? "Out of Stock"
                                                        : "Add to Cart 🛒"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {loadingMore && (
                            <div className={styles.loadingMore}>
                                <div className={styles.loadingSpinner}></div>
                                <p>Loading more products...</p>
                            </div>
                        )}

                        <div className={styles.resultsCount}>
                            Showing {displayedProducts.length} of {totalProducts} products
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}