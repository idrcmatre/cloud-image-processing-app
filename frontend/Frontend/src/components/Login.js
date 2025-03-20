import React, { useState, useEffect } from 'react';
import { signIn, verifyMFA, setupMFA, verifyMFADuringSetup } from '../AuthService'; // Import Cognito sign-in
import { QRCodeCanvas } from 'qrcode.react'; // Use QRCodeCanvas
import axios from 'axios';


const googleSignInUrl = `${process.env.REACT_APP_COGNITO_DOMAIN}/login?response_type=token&client_id=${process.env.REACT_APP_COGNITO_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_REDIRECT_URI}&identity_provider=Google`;

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaSecret, setMfaSecret] = useState(''); // Secret code for MFA setup
    const [cognitoUser, setCognitoUser] = useState(null); // Storing Cognito user for MFA
    const [error, setError] = useState('');
    const [stage, setStage] = useState('LOGIN'); // LOGIN, NEW_PASSWORD, MFA, MFA_SETUP

    const handleGoogleSignIn = () => {
        window.location.href = googleSignInUrl;
    };

    const handleGoogleCallback = async () => {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const idToken = params.get('id_token');
        const accessToken = params.get('access_token');

        if (idToken && accessToken) {
            try {
                // Decode the ID token to get user information
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                const email = payload.email;
                const username = payload['cognito:username'];

                // Call your backend to handle federated sign-in
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/federated-signin`, {
                    username,
                    email,
                    idToken
                });

                // Store tokens
                localStorage.setItem('idToken', idToken);
                localStorage.setItem('accessToken', accessToken);

                // Trigger login in parent component
                onLogin();
            } catch (error) {
                console.error('Error during Google sign-in:', error);
                setError('Failed to complete Google sign-in');
            }
        }
    };

    useEffect(() => {
        if (window.location.hash.includes('id_token')) {
            handleGoogleCallback();
        }
    }, []);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (stage === 'LOGIN') {
                const user = await signIn(email, password); // Log in the user
                setCognitoUser(user); // Store the user for further operations
                onLogin(); // Trigger login update in parent component
            } else if (stage === 'NEW_PASSWORD') {
                await signIn(email, password, newPassword);
                onLogin();
            } else if (stage === 'MFA') {
                await verifyMFA(mfaCode, cognitoUser);
                onLogin();
            } else if (stage === 'MFA_SETUP') {
                // Verify the MFA setup by submitting the code
                await verifyMFADuringSetup(mfaCode, cognitoUser);
                onLogin(); // Now login should be complete after MFA setup
            }
        } catch (err) {
            if (err.type === 'NEW_PASSWORD_REQUIRED') {
                setStage('NEW_PASSWORD');
            } else if (err.type === 'MFA_REQUIRED') {
                setCognitoUser(err.user); // Store user object for MFA verification
                setStage('MFA');
            } else if (err.type === 'MFA_SETUP') {
                const secretCode = await setupMFA(err.user); // Show QR code immediately after login
                setMfaSecret(secretCode);
                setCognitoUser(err.user); // Store user for completing MFA setup
                setStage('MFA_SETUP');
            } else {
                console.error('Login error:', err);
                setError('Login failed: ' + err.message);
            }
        }
    };

    // Generate the QR code URI for Google Authenticator
    const generateQrCodeUri = (secret) => {
        const serviceName = 'ImageClassifierApp'; // You can replace this with your app's name
        const otpauthUri = `otpauth://totp/${serviceName}:${email}?secret=${secret}&issuer=${serviceName}`;
        return otpauthUri;
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">
                {stage === 'LOGIN' && 'Login'}
                {stage === 'NEW_PASSWORD' && 'Set New Password'}
                {stage === 'MFA' && 'Enter MFA Code'}
                {stage === 'MFA_SETUP' && 'MFA Setup Required'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {stage === 'LOGIN' && (
                    <>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                required
                            />
                        </div>
                    </>
                )}

                {stage === 'NEW_PASSWORD' && (
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            New Password
                        </label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            required
                        />
                    </div>
                )}

                {stage === 'MFA' && (
                    <div>
                        <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700">
                            MFA Code
                        </label>
                        <input
                            type="text"
                            id="mfaCode"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            required
                        />
                    </div>
                )}

                {stage === 'MFA_SETUP' && (
                    <div>
                        <p className="text-sm mb-4">
                            Scan this QR code in your MFA app (e.g., Google Authenticator):
                        </p>
                        {mfaSecret && (
                            <QRCodeCanvas value={generateQrCodeUri(mfaSecret)} size={200} />
                        )}
                        <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mt-4">
                            Enter MFA Code from app:
                        </label>
                        <input
                            type="text"
                            id="mfaCode"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            required
                        />
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    type="submit"
                    className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-300"
                >
                    {stage === 'LOGIN' && 'Login'}
                    {stage === 'NEW_PASSWORD' && 'Set New Password'}
                    {stage === 'MFA' && 'Verify MFA'}
                    {stage === 'MFA_SETUP' && 'Complete MFA Setup'}
                </button>
            </form>

            <button
                onClick={handleGoogleSignIn}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300 mt-4"
            >
                Sign in with Google
            </button>
        </div>
    );
};

export default Login;
