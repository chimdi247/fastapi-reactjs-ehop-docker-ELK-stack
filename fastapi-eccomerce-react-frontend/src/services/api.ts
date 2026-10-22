import axios, { AxiosError } from "axios";
import type { AxiosRequestConfig } from "axios";


// Build-time configurable (Docker: --build-arg VITE_BACKEND_URL=...). Default = previous behaviour.
// Set it to an EMPTY string to call the API same-origin ("/api"), which the bundled nginx proxies.
const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8084";

export const API_CONFIG = {
    BACKEND_URL,
    API_URL: `${BACKEND_URL}/api`,
};


const apiClient = axios.create({
    baseURL: API_CONFIG.API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});


// Automatically inject JWT Bearer Token into requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Generic Handler to process standard backend response wrappers `{ data: ... }`
const handleRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
    try {
        const response = await apiClient<T>(config);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
            throw new Error(error.response.data.message || "API request failed");
        }
        throw error;
    }
};

// ----------------------------------------------------------------------
// Auth Local Helpers
// ----------------------------------------------------------------------

export const saveAuthData = (token: string, role: string): void => {
    localStorage.setItem("token", token);
    localStorage.setItem("userRole", role);
};
export const logout = (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
};


export const getToken = (): string | null => localStorage.getItem("token");
export const getUserRole = (): string | null => localStorage.getItem("userRole");
export const isAuthenticated = (): boolean => !!getToken();
export const isAdmin = (): boolean => getUserRole() === "ADMIN";
export const isDelivery = (): boolean => getUserRole() === "DELIVERY";


// ----------------------------------------------------------------------
// Auth API Endpoints
// ----------------------------------------------------------------------
export const registerUser = async (userData: any): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/auth/register", method: "POST", data: userData });
    return res.data;
};

export const loginUser = async (credentials: any): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/auth/login", method: "POST", data: credentials });
    return res.data;
};

export const getCurrentUser = async (): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/users/me", method: "GET" });
    return res.data;
};

export const updateProfile = async (updateData: any): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/users/update-profile", method: "PUT", data: updateData });
    return res.data;
};

export const uploadAvatar = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await handleRequest<{ data: any }>({
        url: "/users/upload-avatar",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

export const changePassword = async (passwordData: any): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/users/change-password", method: "PUT", data: passwordData });
    return res.data;
};

export const forgotPassword = async (email: string): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/auth/forgot-password", method: "POST", data: { email } });
    return res.data;
};

export const resetPassword = async (code: string, password: string): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/auth/reset-password", method: "POST", data: { code, password } });
    return res.data;
};


// ----------------------------------------------------------------------
// Cart API Endpoints
// ----------------------------------------------------------------------
export const getCart = async (): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/cart", method: "GET" });
    return res.data;
};

export const addToCart = async (productId: number, quantity = 1): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/cart/add", method: "POST", data: { productId, quantity } });
    return res.data;
};

export const decrementCartItem = async (productId: number): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/cart/decrement/${productId}`, method: "POST" });
    return res.data;
};

export const removeCartItem = async (productId: number): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/cart/remove/${productId}`, method: "DELETE" });
    return res.data;
};

export const clearCart = async (): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/cart/clear", method: "DELETE" });
    return res.data;
};

export const checkout = async (): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/orders/checkout", method: "POST" });
    return res.data;
};

// ----------------------------------------------------------------------
// Category API Endpoints
// ----------------------------------------------------------------------
export const getCategories = async (): Promise<any[]> => {
    const res = await handleRequest<{ data: any[] }>({ url: "/categories", method: "GET" });
    return res.data;
};

export const createCategory = async (categoryData: { name: string; description?: string }): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/categories", method: "POST", data: categoryData });
    return res.data;
};

export const updateCategory = async (categoryData: { id: number; name?: string; description?: string }): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/categories", method: "PUT", data: categoryData });
    return res.data;
};

export const deleteCategory = async (categoryId: number): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/categories/${categoryId}`, method: "DELETE" });
    return res.data;
};


// ----------------------------------------------------------------------
// Order API Endpoints
// ----------------------------------------------------------------------
export const getMyOrders = async (): Promise<any[]> => {
    const res = await handleRequest<{ data: any[] }>({ url: "/orders/me", method: "GET" });
    return res.data;
};

export const getAllOrders = async (): Promise<any[]> => {
    const res = await handleRequest<{ data: any[] }>({ url: "/orders/all", method: "GET" });
    return res.data;
};

export const updateOrderStatus = async (orderId: number, status: string): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/orders/${orderId}/status`, method: "PATCH", data: { status } });
    return res.data;
};

// ----------------------------------------------------------------------
// Payment API Endpoints
// ----------------------------------------------------------------------
export const confirmPayment = async (sessionId: string | null): Promise<any> => {
    if (!sessionId) throw new Error("Session ID is required");
    const res = await handleRequest<{ data: any }>({ url: `/payments/confirm?session_id=${sessionId}`, method: "GET" });
    return res.data;
};

export const cancelPayment = async (sessionId: string | null): Promise<any> => {
    if (!sessionId) throw new Error("Session ID is required");
    const res = await handleRequest<{ data: any }>({ url: `/payments/cancel?session_id=${sessionId}`, method: "GET" });
    return res.data;
};


// ----------------------------------------------------------------------
// Product API Endpoints
// ----------------------------------------------------------------------
export const getProducts = async (categoryId?: number): Promise<any[]> => {
    const endpoint = categoryId ? `/products?category_id=${categoryId}` : "/products";
    const res = await handleRequest<{ data: any[] }>({ url: endpoint, method: "GET" });
    return res.data;
};

export const getProductById = async (id: number): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/products/${id}`, method: "GET" });
    return res.data;
};

export const createProduct = async (formData: FormData): Promise<any> => {
    const res = await handleRequest<{ data: any }>({
        url: "/products",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

export const updateProduct = async (formData: FormData): Promise<any> => {
    const res = await handleRequest<{ data: any }>({
        url: "/products/update",
        method: "PUT",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

export const deleteProduct = async (productId: number): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/products/delete/${productId}`, method: "DELETE" });
    return res.data;
};


// ----------------------------------------------------------------------
// Report & Review API Endpoints
// ----------------------------------------------------------------------
export const getDashboardStats = async (): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/reports/dashboard", method: "GET" });
    return res.data;
};

export const getProductRating = async (productId: number): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: `/reviews/product/rating/${productId}`, method: "GET" });
    return res.data;
};

export const createReview = async (reviewData: any): Promise<any> => {
    const res = await handleRequest<{ data: any }>({ url: "/reviews", method: "POST", data: reviewData });
    return res.data;
};