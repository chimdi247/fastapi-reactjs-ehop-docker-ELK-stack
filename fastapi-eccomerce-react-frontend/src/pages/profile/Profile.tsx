import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    changePassword,
    getCurrentUser,
    isAuthenticated,
    updateProfile,
    uploadAvatar,
} from "../../services/api";
import styles from "./Profile.module.css";



export default function ProfilePage() {


    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        name: "",
        address: "",
    });

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Messages
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");



    const fetchUserProfile = async () => {
        try {
            const userData = await getCurrentUser();
            setUser(userData);
            setProfileForm({
                name: userData.name || "",
                address: userData.address || "",
            });
        } catch (error: any) {
            setErrorMessage(error.message || "Failed to load profile");
        }
    };


    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }
        fetchUserProfile();
    }, [navigate]);



    const handleProfileChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setProfileForm({
            ...profileForm,
            [e.target.name]: e.target.value,
        });
    };



    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordForm({
            ...passwordForm,
            [e.target.name]: e.target.value,
        });
    };

    const handleUpdateProfile = async (e: any) => {
        e.preventDefault();
        setUpdating(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const updateData: any = {};
            if (profileForm.name !== user.name) updateData.name = profileForm.name;
            if (profileForm.address !== user.address)
                updateData.address = profileForm.address;

            if (Object.keys(updateData).length === 0) {
                setErrorMessage("No changes to update");
                return;
            }

            await updateProfile(updateData);
            await fetchUserProfile();
            setSuccessMessage("Profile updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error: any) {
            setErrorMessage(error.message || "Failed to update profile");
        } finally {
            setUpdating(false);
        }
    };

    const handleChangePassword = async (e: any) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setErrorMessage("New passwords do not match");
            return;
        }

        if (passwordForm.newPassword.length < 4) {
            setErrorMessage("Password must be at least 4 characters");
            return;
        }

        setUpdating(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            await changePassword({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            });

            setSuccessMessage("Password changed successfully!");
            setPasswordForm({
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error: any) {
            setErrorMessage(error.message || "Failed to change password");
        } finally {
            setUpdating(false);
        }
    };


    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setErrorMessage("Please upload an image file");
            return;
        }

        if (file.size > 6 * 1024 * 1024) {
            setErrorMessage("File size must be less than 6MB");
            return;
        }

        setUploading(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            await uploadAvatar(file);
            await fetchUserProfile();
            setSuccessMessage("Profile picture updated!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error: any) {
            setErrorMessage(error.message || "Failed to upload avatar");
        } finally {
            setUploading(false);
        }
    };



    const getImageUrl = (imageUrl: string) => {
        if (!imageUrl) return "/images/profile.jpeg";
        return imageUrl;
    };

    const getRoleClass = (role?: string) => {
        switch (role?.toUpperCase()) {
            case "ADMIN":
                return styles.roleAdmin;
            case "DELIVERY":
                return styles.roleDelivery;
            default:
                return styles.roleCustomer;
        }
    };




    return (
        <div className={styles.profileContainer}>
            <div className="container">
                <div className={styles.profileWrapper}>
                    {/* Sidebar */}
                    <div className={styles.profileSidebar}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarWrapper}>
                                <img
                                    src={getImageUrl(user?.profilePicture)}
                                    alt={user?.name || ""}
                                    referrerpolicy="no-referrer"
                                    className={styles.avatarImage}
                                />
                                <label htmlFor="avatar-upload" className={styles.avatarUploadBtn}>
                                    📷
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                        style={{ display: "none" }}
                                    />
                                </label>
                                {uploading && (
                                    <div className={styles.avatarLoading}>Uploading...</div>
                                )}
                            </div>
                            <h3>{user?.name || ""}</h3>
                            <p className={styles.userEmail}>{user?.email}</p>
                            <span className={`${styles.userRole} ${getRoleClass(user?.role)}`}>
                                {user?.role}
                            </span>
                        </div>

                        <div className={styles.profileTabs}>
                            <button
                                className={`${styles.tabBtn} ${activeTab === "profile" ? styles.active : ""
                                    }`}
                                onClick={() => setActiveTab("profile")}
                            >
                                📝 Edit Profile
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeTab === "password" ? styles.active : ""
                                    }`}
                                onClick={() => setActiveTab("password")}
                            >
                                🔒 Change Password
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={styles.profileContent}>
                        {successMessage && (
                            <div className={styles.successAlert}>
                                <span>✅</span>
                                <p>{successMessage}</p>
                            </div>
                        )}

                        {errorMessage && (
                            <div className={styles.errorAlert}>
                                <span>⚠️</span>
                                <p>{errorMessage}</p>
                            </div>
                        )}

                        {activeTab === "profile" && (
                            <div className={styles.profileFormSection}>
                                <h2>Edit Profile</h2>
                                <form onSubmit={handleUpdateProfile} className={styles.profileForm}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Full Name</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={profileForm.name}
                                            onChange={handleProfileChange}
                                            placeholder="Enter your full name"
                                            disabled={updating}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="email">Email Address</label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={user?.email || ""}
                                            disabled
                                            className={styles.disabledInput}
                                        />
                                        <small>Email cannot be changed</small>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="address">Address</label>
                                        <textarea
                                            id="address"
                                            name="address"
                                            value={profileForm.address || ""}
                                            onChange={handleProfileChange}
                                            placeholder="Enter your address"
                                            rows={3}
                                            disabled={updating}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={updating}
                                    >
                                        {updating ? "Saving..." : "Save Changes"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === "password" && (
                            <div className={styles.profileFormSection}>
                                <h2>Change Password</h2>
                                <form onSubmit={handleChangePassword} className={styles.profileForm}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="oldPassword">Current Password</label>
                                        <input
                                            type="password"
                                            id="oldPassword"
                                            name="oldPassword"
                                            value={passwordForm.oldPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter current password"
                                            required
                                            disabled={updating}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="newPassword">New Password</label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            name="newPassword"
                                            value={passwordForm.newPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter new password (min 4 characters)"
                                            required
                                            disabled={updating}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="confirmPassword">Confirm New Password</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={passwordForm.confirmPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Confirm new password"
                                            required
                                            disabled={updating}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={updating}
                                    >
                                        {updating ? "Changing..." : "Change Password"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
