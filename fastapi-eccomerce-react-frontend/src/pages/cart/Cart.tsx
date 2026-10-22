import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    addToCart,
    checkout,
    clearCart,
    decrementCartItem,
    getCart,
    isAuthenticated,
    removeCartItem,
} from "../../services/api";
import styles from "./Cart.module.css";



export default function CartPage(){

    const navigate = useNavigate();
    const [cart, setCart] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => Promise<void>) | null;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null,
    });


    const openModal = (title: string, message: string, onConfirm: () => Promise<void>) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            onConfirm,
        });
    };

    const closeModal = () => {
        setModalConfig({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
        });
    };


    const handleConfirm = async () => {
        if (modalConfig.onConfirm) {
            const action = modalConfig.onConfirm;
            closeModal();
            await action();
        }
    };

    const updateNavbarCartCount = () => {
        window.dispatchEvent(new Event("cartUpdated"));
    };

    const fetchCart = async () => {
        try {
            setLoading(true);
            const data = await getCart();
            setCart(data);
        } catch (err: any) {
            setError(err.message || "Failed to load cart");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }
        fetchCart();
    }, [navigate]);



    const handleAddOne = async (productId: number) => {
        setUpdating(true);
        try {
            await addToCart(productId, 1);
            await fetchCart();
            updateNavbarCartCount();
        } catch (err: any) {
            setError(err.message || "Failed to update cart");
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveOne = async (productId: number) => {
        setUpdating(true);
        try {
            await decrementCartItem(productId);
            await fetchCart();
            updateNavbarCartCount();
        } catch (err: any) {
            setError(err.message || "Failed to update cart");
        } finally {
            setUpdating(false);
        }
    };


    const executeRemoveItem = async (productId: number) => {
        setUpdating(true);
        try {
            await removeCartItem(productId);
            await fetchCart();
            updateNavbarCartCount();
        } catch (err: any) {
            setError(err.message || "Failed to remove item");
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveItem = (productId: number) => {
        openModal(
            "Remove Item",
            "Are you sure you want to remove this item from your cart?",
            () => executeRemoveItem(productId)
        );
    };

    const executeClearCart = async () => {
        setUpdating(true);
        try {
            await clearCart();
            await fetchCart();
            updateNavbarCartCount();
        } catch (err: any) {
            setError(err.message || "Failed to clear cart");
        } finally {
            setUpdating(false);
        }
    };

    const handleClearCart = () => {
        openModal(
            "Clear Cart",
            "Are you sure you want to clear your entire cart?",
            executeClearCart
        );
    };

    const handleCheckout = async () => {
        setUpdating(true);
        try {
            const result = await checkout();
            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                navigate("/orders");
            }
        } catch (err: any) {
            setError(err.message || "Failed to process checkout");
        } finally {
            setUpdating(false);
        }
    };


    if (loading) {
        return (
            <div className={styles.cartContainer}>
                <div className="container">
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading cart...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!cart || cart.items?.length === 0) {
        return (
            <div className={styles.cartContainer}>
                <div className="container">
                    <div className={styles.emptyCart}>
                        <div className={styles.emptyCartIcon}>🛒</div>
                        <h2>Your cart is empty</h2>
                        <p>Looks like you haven't added any items to your cart yet.</p>
                        <Link to="/products" className={styles.shopNowBtn}>
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.cartContainer}>
            <div className="container">
                <div className={styles.cartWrapper}>
                    <div className={styles.cartHeader}>
                        <h1>Shopping Cart</h1>
                        <p>{cart.totalQuantity} item(s) in your cart</p>
                    </div>

                    {error && (
                        <div className={styles.errorAlert}>
                            <span>⚠️</span>
                            <p>{error}</p>
                        </div>
                    )}

                    <div className={styles.cartContent}>
                        {/* Cart Items */}
                        <div className={styles.cartItems}>
                            <div className={styles.cartItemsHeader}>
                                <div className={styles.colProduct}>Product</div>
                                <div className={styles.colPrice}>Price</div>
                                <div className={styles.colQuantity}>Quantity</div>
                                <div className={styles.colTotal}>Total</div>
                                <div className={styles.colAction}></div>
                            </div>

                            {cart.items.map((item: any) => (
                                <div key={item.id} className={styles.cartItem}>
                                    <div className={styles.colProduct}>
                                        <div className={styles.productInfo}>
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className={styles.productImage}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = "/images/product.jpeg";
                                                }}
                                            />
                                            <div className={styles.productDetails}>
                                                <Link
                                                    to={`/products/${item.productId}`}
                                                    className={styles.productName}
                                                >
                                                    {item.productName}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.colPrice}>
                                        <span className={styles.price}>
                                            ${parseFloat(item.productPrice).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className={styles.colQuantity}>
                                        <div className={styles.quantityControls}>
                                            <button
                                                onClick={() => handleRemoveOne(item.productId)}
                                                disabled={updating}
                                                className={styles.qtyBtn}
                                            >
                                                -
                                            </button>
                                            <span className={styles.qtyValue}>{item.quantity}</span>
                                            <button
                                                onClick={() => handleAddOne(item.productId)}
                                                disabled={updating}
                                                className={styles.qtyBtn}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.colTotal}>
                                        <span className={styles.totalPrice}>
                                            ${parseFloat(item.subtotal).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className={styles.colAction}>
                                        <button
                                            onClick={() => handleRemoveItem(item.productId)}
                                            disabled={updating}
                                            className={styles.removeBtn}
                                            title="Remove item"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className={styles.cartActions}>
                                <button
                                    onClick={handleClearCart}
                                    disabled={updating}
                                    className={styles.clearCartBtn}
                                >
                                    Clear Cart
                                </button>
                                <Link to="/products" className={styles.continueShopping}>
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>

                        {/* Cart Summary */}
                        <div className={styles.cartSummary}>
                            <h2>Order Summary</h2>
                            <div className={styles.summaryDetails}>
                                <div className={styles.summaryRow}>
                                    <span>Subtotal ({cart.totalQuantity} items)</span>
                                    <span>${parseFloat(cart.totalPrice).toFixed(2)}</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Shipping</span>
                                    <span>Free</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Tax</span>
                                    <span>${(parseFloat(cart.totalPrice) * 0.1).toFixed(2)}</span>
                                </div>
                                <div className={`${styles.summaryRow} ${styles.total}`}>
                                    <span>Total</span>
                                    <span>${(parseFloat(cart.totalPrice) * 1.1).toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={updating || cart.items?.length === 0}
                                className={styles.checkoutBtn}
                            >
                                {updating ? "Processing..." : "Proceed to Checkout"}
                            </button>
                            <p className={styles.paymentInfo}>
                                🔒 Secure payment powered by Stripe
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            {modalConfig.isOpen && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div
                        className={styles.modalContainer}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h3>{modalConfig.title}</h3>
                            <button className={styles.modalCloseBtn} onClick={closeModal}>
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>{modalConfig.message}</p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={`${styles.modalBtn} ${styles.cancelBtn}`}
                                onClick={closeModal}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.modalBtn} ${styles.confirmBtn}`}
                                onClick={handleConfirm}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}