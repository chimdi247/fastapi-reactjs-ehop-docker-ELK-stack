import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    addToCart,
    decrementCartItem,
    getCart,
    getProductById,
    getProductRating,
    isAuthenticated,
} from "../../services/api";
import styles from "./ProductDetails.module.css";



export default function ProductDetailsPage() {

    const params = useParams();
    const navigate = useNavigate();

    const productId = params.id as string;

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [activeImage, setActiveImage] = useState("");

    const [cartQuantity, setCartQuantity] = useState(0);

    const [ratingStats, setRatingStats] = useState({
        average_rating: 0,
        total_reviews: 0,
    });


    const fetchProduct = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getProductById(parseInt(productId));
            setProduct(data);
            setActiveImage(data.imageUrl || "/images/product.jpeg");
        } catch (err: any) {
            setError(err.message || "Failed to load product");
        } finally {
            setLoading(false);
        }
    };

    const fetchRatingStats = async () => {
        try {
            const stats = await getProductRating(parseInt(productId));
            setRatingStats(stats);
        } catch (err: any) {
            console.error("Failed to fetch rating stats:", err);
        }
    };

    const fetchCartItemQuantity = async () => {
        try {
            const cart = await getCart();
            const item = cart.items?.find((i: any) => i.productId === parseInt(productId));
            if (item) {
                setCartQuantity(item.quantity);
                setQuantity(item.quantity);
            }
        } catch (error) {
            console.error("Failed to fetch cart item:", error);
        }
    };

    useEffect(() => {
        if (productId) {
            fetchProduct();
            fetchRatingStats();
            if (isAuthenticated()) {
                fetchCartItemQuantity();
            }
        }
    }, [productId]);

        const handleQuantityChange = (change: number) => {
        const newQuantity = quantity + change;
        if (newQuantity >= 1 && newQuantity <= product?.stockQuantity) {
            setQuantity(newQuantity);
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

    const handleAddToCart = async () => {
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }

        setAddingToCart(true);
        try {
            await addToCart(parseInt(productId), quantity);
            await fetchCartItemQuantity();
            window.dispatchEvent(new Event("cartUpdated"));
            showToast(`${product.name} added to cart!`);
        } catch (err: any) {
            showToast(err.message || "Failed to add to cart", "error");
        } finally {
            setAddingToCart(false);
        }
    };

    const handleUpdateCart = async (newQuantity: number) => {
        setAddingToCart(true);
        try {
            if (newQuantity > cartQuantity) {
                await addToCart(parseInt(productId), newQuantity - cartQuantity);
            } else if (newQuantity < cartQuantity) {
                const timesToDecrement = cartQuantity - newQuantity;
                for (let i = 0; i < timesToDecrement; i++) {
                    await decrementCartItem(parseInt(productId));
                }
            }
            await fetchCartItemQuantity();
            window.dispatchEvent(new Event("cartUpdated"));
            showToast("Cart updated successfully!");
        } catch (err: any) {
            showToast(err.message || "Failed to update cart", "error");
        } finally {
            setAddingToCart(false);
        }
    };

    const renderStars = (rating: number) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - Math.ceil(rating);

        return (
            <>
                {"⭐".repeat(fullStars)}
                {hasHalfStar && "½"}
                {"☆".repeat(emptyStars)}
            </>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className={styles.productDetailsContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading product details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className={styles.productDetailsContainer}>
                <div className="container">
                    <div className={styles.errorContainer}>
                        <div className={styles.errorMessage}>
                            <p>{error || "Product not found"}</p>
                        </div>
                        <Link to="/products" className={styles.backBtn}>
                            ← Back to Products
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productDetailsContainer}>
            <div className="container">
                {/* Breadcrumb */}
                <div className={styles.breadcrumb}>
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/products">Products</Link>
                    <span>/</span>
                    <span className={styles.current}>{product.name}</span>
                </div>

                {/* Product Main Info */}
                <div className={styles.productMain}>
                    <div className={styles.productGallery}>
                        <div className={styles.mainImage}>
                            <img
                                src={activeImage}
                                alt={product.name}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/placeholder-image.jpg";
                                }}
                            />
                        </div>
                    </div>

                    <div className={styles.productInfoSection}>
                        <h1 className={styles.productTitle}>{product.name}</h1>

                        <div className={styles.productRating}>
                            <div className={styles.stars}>
                                {renderStars(ratingStats.average_rating)}
                            </div>
                            <div className={styles.ratingDetails}>
                                <span className={styles.averageRating}>
                                    {ratingStats.average_rating.toFixed(1)}
                                </span>
                                <span className={styles.reviewCount}>
                                    ({ratingStats.total_reviews}{" "}
                                    {ratingStats.total_reviews === 1 ? "review" : "reviews"})
                                </span>
                            </div>
                        </div>

                        <div className={styles.productPrice}>
                            ${parseFloat(product.price).toFixed(2)}
                        </div>

                        <div className={styles.productStockInfo}>
                            {product.stockQuantity > 0 ? (
                                <span className={styles.inStock}>
                                    ✓ In Stock ({product.stockQuantity} available)
                                </span>
                            ) : (
                                <span className={styles.outOfStock}>✗ Out of Stock</span>
                            )}
                        </div>

                        <div className={styles.productDescription}>
                            <h3>Description</h3>
                            <p>{product.description}</p>
                        </div>

                        {product.stockQuantity > 0 && (
                            <div className={styles.productActions}>
                                {cartQuantity > 0 ? (
                                    <>
                                        <div className={styles.quantityControlsLarge}>
                                            <button
                                                onClick={() => handleUpdateCart(cartQuantity - 1)}
                                                disabled={addingToCart || cartQuantity <= 1}
                                                className={styles.qtyBtn}
                                            >
                                                -
                                            </button>
                                            <span className={styles.qtyValue}>{cartQuantity}</span>
                                            <button
                                                onClick={() => handleUpdateCart(cartQuantity + 1)}
                                                disabled={
                                                    addingToCart || cartQuantity >= product.stockQuantity
                                                }
                                                className={styles.qtyBtn}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => navigate("/cart")}
                                            className={styles.viewCartBtn}
                                        >
                                            View in Cart →
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.quantityControlsLarge}>
                                            <button
                                                onClick={() => handleQuantityChange(-1)}
                                                disabled={quantity <= 1}
                                                className={styles.qtyBtn}
                                            >
                                                -
                                            </button>
                                            <span className={styles.qtyValue}>{quantity}</span>
                                            <button
                                                onClick={() => handleQuantityChange(1)}
                                                disabled={quantity >= product.stockQuantity}
                                                className={styles.qtyBtn}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={addingToCart}
                                            className={styles.addToCartBtnLarge}
                                        >
                                            {addingToCart ? "Adding..." : "Add to Cart 🛒"}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reviews Section */}
                <div className={styles.reviewsSection}>
                    <div className={styles.reviewsHeader}>
                        <div>
                            <h2>Customer Reviews</h2>
                            {ratingStats.total_reviews > 0 && (
                                <div className={styles.ratingSummary}>
                                    <div className={styles.starsLarge}>
                                        {renderStars(ratingStats.average_rating)}
                                    </div>
                                    <span className={styles.ratingValue}>
                                        {ratingStats.average_rating.toFixed(1)} out of 5
                                    </span>
                                    <span className={styles.totalReviews}>
                                        Based on {ratingStats.total_reviews} reviews
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {product.reviews && product.reviews.length > 0 ? (
                        <div className={styles.reviewsList}>
                            {product.reviews.map((review: any) => (
                                <div key={review.id} className={styles.reviewCard}>
                                    <div className={styles.reviewHeader}>
                                        <div className={styles.reviewerInfo}>
                                            <span className={styles.reviewerName}>
                                                {review.username || `User ${review.userId}`}
                                            </span>
                                            <span className={styles.reviewDate}>
                                                {formatDate(review.createdAt)}
                                            </span>
                                        </div>
                                        <div className={styles.reviewRating}>
                                            {renderStars(review.rating)}
                                        </div>
                                    </div>
                                    <p className={styles.reviewComment}>{review.comment}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noReviews}>
                            <p>No reviews yet for this product.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}