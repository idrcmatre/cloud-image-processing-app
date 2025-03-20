import React, { useState, useEffect } from 'react';
import { isAdmin } from './AuthService';

const AdminRoute = ({ component: Component, axiosInstance, ...rest }) => {
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            const adminStatus = await isAdmin();
            setIsAdminUser(adminStatus);
            setLoading(false);
        };
        checkAdminStatus();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return isAdminUser ? <Component {...rest} axiosInstance={axiosInstance} /> : <div>Access Denied</div>;
};

export default AdminRoute;
