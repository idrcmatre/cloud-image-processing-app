import React, { useState, useEffect } from 'react';
import { isAuthenticated, signOut, getCurrentUserSession, refreshCognitoToken, isAdmin } from './AuthService';
import axios from 'axios';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ConfirmSignUp from './components/ConfirmSignUp';
import UserInfo from './components/UserInfo';
import ImageUpload from './components/ImageUpload';
import ImageResults from './components/ImageResults';
import AdminRoute from './AdminRoute';
import AdminDashboard from './components/AdminDashboard';
import { GoogleOAuthProvider } from '@react-oauth/google';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

// Create a custom axios instance with interceptors
//adding comment to push //adding comment to push again
const axiosInstance = axios.create({
    baseURL: API_URL
});

// Request interceptor to add the auth token to every request
axiosInstance.interceptors.request.use(
    async (config) => {
        try {
            const session = await getCurrentUserSession();
            const token = session.getIdToken().getJwtToken();
            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.error('Error getting current session:', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const session = await refreshCognitoToken();
                const newToken = session.getIdToken().getJwtToken();
                axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Logout the user if token refresh fails
                await signOut();
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [overallProgress, setOverallProgress] = useState(0);
    const [signUpStep, setSignUpStep] = useState('initial');
    const [signUpUsername, setSignUpUsername] = useState('');
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [adminRefreshTrigger, setAdminRefreshTrigger] = useState(0);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const auth = await isAuthenticated();
                console.log('isLoggedIn:', auth);
                setIsLoggedIn(auth);
                if (auth) {
                    await loadUserData();
                    const adminStatus = await isAdmin();
                    setIsAdminUser(adminStatus);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsLoggedIn(false);
                setLoading(false);
            }
        };

        checkAuth();

        // Handle Google sign-in redirect
        const hash = window.location.hash;
        if (hash.includes('id_token')) {
            const params = new URLSearchParams(hash.replace('#', ''));
            const idToken = params.get('id_token');
            const accessToken = params.get('access_token');

            localStorage.setItem('idToken', idToken);
            localStorage.setItem('accessToken', accessToken);

            setIsLoggedIn(true);
            loadUserData();

            // Clear the hash to prevent re-processing on refresh
            window.history.replaceState(null, document.title, window.location.pathname);
        }
    }, []);

    const loadUserData = async () => {
        try {
            const response = await axiosInstance.get('/api/user/info');
            console.log('User info response:', response.data);
            setUser(response.data);
            setError(null);
        } catch (error) {
            console.error('Failed to load user data:', error);
            if (error.response && error.response.status === 401) {
                // Token expired, sign out the user
                await handleLogout();
            } else {
                setError('Failed to load user data. Please try again.');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setIsLoggedIn(true);
        await loadUserData();
        const adminStatus = await isAdmin();
        setIsAdminUser(adminStatus);
    };

    const handleLogout = async () => {
        try {
            await signOut();
            setIsLoggedIn(false);
            setUser(null);
            setResults([]);
            setProgress(0);
            setStage('');
            setOverallProgress(0);
            setError(null);
            setIsAdminUser(false);
            localStorage.removeItem('idToken');
            localStorage.removeItem('accessToken');
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
            setError('Failed to log out. Please try again.');
        }
    };

    const handleUserUpdate = (updatedUserInfo) => {
        setUser(prevUser => ({
            ...prevUser,
            ...updatedUserInfo
        }));
    };

    const handleUploadComplete = (data) => {
        setResults(data);
        setProgress(0);
        setStage('');
        setOverallProgress(0);
        loadUserData();
        setAdminRefreshTrigger(prev => prev + 1);
    };

    const handleSignUpSuccess = (username) => {
        setSignUpUsername(username);
        setSignUpStep('confirm');
    };

    const handleConfirmSuccess = () => {
        setSignUpStep('initial');
    };

    return (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
            <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
                <div className="container mx-auto px-4 py-8">
                    <header className="bg-white shadow-lg rounded-lg p-6 mb-8">
                        <h1 className="text-3xl font-bold text-center text-indigo-600">
                            Image Classifier and Enhancer
                        </h1>
                    </header>
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : !isLoggedIn ? (
                        <>
                            {signUpStep === 'initial' && (
                                <>
                                    <Login onLogin={handleLogin} />
                                    <button onClick={() => setSignUpStep('signUp')} className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-300">
                                        Sign Up
                                    </button>
                                </>
                            )}
                            {signUpStep === 'signUp' && (
                                <SignUp onSignUpSuccess={handleSignUpSuccess} />
                            )}
                            {signUpStep === 'confirm' && (
                                <ConfirmSignUp username={signUpUsername} onConfirmSuccess={handleConfirmSuccess} />
                            )}
                        </>
                    ) : (
                        <div className="space-y-8">
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                    <strong className="font-bold">Error:</strong>
                                    <span className="block sm:inline"> {error}</span>
                                </div>
                            )}
                            <UserInfo user={user} />
                            <ImageUpload
                                onUploadComplete={handleUploadComplete}
                                onUserUpdate={handleUserUpdate}
                                loadUserData={loadUserData}
                                serverUrl={API_URL}
                                axiosInstance={axiosInstance}
                            />
                            
                           
                            <ImageResults
                                results={results}
                                axiosInstance={axiosInstance}
                                progress={progress}
                                stage={stage}
                                overallProgress={overallProgress}
                             />


                             {isAdminUser && (
                                 <AdminRoute component={AdminDashboard}
                                     axiosInstance={axiosInstance}
                                     refreshTrigger={adminRefreshTrigger}
                                 />
                             )}
                                    
                              <button
                                onClick={handleLogout}
                                className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition duration-300"
                            >
                                Logout
                            </button>       
                                        
                        </div>
                    )}
                </div>
            </div>
        </GoogleOAuthProvider>
    );
}

export default App;