import { Navigate, Outlet } from "react-router-dom";
import { getUserRole, isAuthenticated } from "./api";



export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {

    const isAuth = isAuthenticated();
    const role = getUserRole()

    if (!isAuth) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && allowedRoles.length > 0) {
        if (!role || !allowedRoles.includes(role)) {
            return <Navigate to="/login" replace />
        }
    }

    return <Outlet />
}

