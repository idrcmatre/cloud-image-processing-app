import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

export const signIn = (username, password, newPassword = null) => {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({
            Username: username,
            Pool: userPool,
        });

        const authDetails = new AuthenticationDetails({
            Username: username,
            Password: password,
        });

        user.authenticateUser(authDetails, {
            onSuccess: (result) => {
                console.log('Login successful:', result);
                resolve(result);
            },
            onFailure: (err) => {
                console.error('Login failed:', err);
                reject(err);
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
                console.log('New password required for:', username);
                if (newPassword) {
                    delete userAttributes.email_verified;
                    delete userAttributes.phone_number_verified;
                    user.completeNewPasswordChallenge(newPassword, userAttributes, {
                        onSuccess: (result) => {
                            console.log('Password updated successfully:', result);
                            resolve(result);
                        },
                        onFailure: (err) => {
                            console.error('Password update failed:', err);
                            reject(err);
                        },
                    });
                } else {
                    reject({ type: 'NEW_PASSWORD_REQUIRED', userAttributes });
                }
            },
            totpRequired: (challengeName, challengeParameters) => {
                console.log('TOTP required for:', username);
                reject({ type: 'MFA_REQUIRED', challengeName, challengeParameters, user });
            },
            mfaSetup: (challengeName, challengeParameters) => {
                console.log('MFA setup required for:', username);
                reject({ type: 'MFA_SETUP', challengeName, challengeParameters, user });
            },
        });
    });
};

export const setupMFA = (user) => {
    return new Promise((resolve, reject) => {
        if (user) {
            user.associateSoftwareToken({
                associateSecretCode: (secretCode) => {
                    console.log('MFA setup successful, secret code:', secretCode);
                    resolve(secretCode);
                },
                onFailure: (err) => {
                    console.error('MFA setup failed:', err);
                    reject(err);
                }
            });
        } else {
            reject({ message: 'No Cognito user available for MFA setup.' });
        }
    });
};

export const verifyMFADuringSetup = (mfaCode, user) => {
    return new Promise((resolve, reject) => {
        user.verifySoftwareToken(mfaCode, 'My MFA', {
            onSuccess: (result) => {
                console.log('MFA setup complete, verified:', result);
                resolve(result);
            },
            onFailure: (err) => {
                console.error('MFA verification failed during setup:', err);
                reject(err);
            },
        });
    });
};

export const verifyMFA = (code, user) => {
    return new Promise((resolve, reject) => {
        user.sendMFACode(code, {
            onSuccess: (result) => {
                console.log('MFA verified:', result);
                resolve(result);
            },
            onFailure: (err) => {
                console.error('MFA verification failed:', err);
                reject(err);
            }
        }, 'SOFTWARE_TOKEN_MFA');
    });
};

export const getCurrentUserSession = async () => {
    try {
        const session = await refreshCognitoToken();
        return session;
    } catch (error) {
        console.error('Error getting current user session:', error);
        throw error;
    }
};

export const isAuthenticated = async () => {
    try {
        await refreshCognitoToken();
        return true;
    } catch (error) {
        console.error('Authentication check failed:', error);
        return false;
    }
};

export const signOut = () => {
    return new Promise((resolve) => {
        const user = userPool.getCurrentUser();
        if (user) {
            user.signOut();
        }
        // Clear Google tokens if they exist
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        // Clear any other auth-related items in localStorage
        localStorage.removeItem('CognitoIdentityServiceProvider.YOUR_CLIENT_ID.LastAuthUser');
        localStorage.removeItem('CognitoIdentityServiceProvider.YOUR_CLIENT_ID.YOUR_USERNAME.accessToken');
        localStorage.removeItem('CognitoIdentityServiceProvider.YOUR_CLIENT_ID.YOUR_USERNAME.idToken');
        localStorage.removeItem('CognitoIdentityServiceProvider.YOUR_CLIENT_ID.YOUR_USERNAME.refreshToken');
        resolve();
    });
};

export const refreshCognitoToken = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.getSession((err, session) => {
                if (err) {
                    reject(err);
                } else {
                    if (session.isValid()) {
                        resolve(session);
                    } else {
                        cognitoUser.refreshSession(session.getRefreshToken(), (err, newSession) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(newSession);
                            }
                        });
                    }
                }
            });
        } else {
            // Check for Google tokens
            const idToken = localStorage.getItem('idToken');
            const accessToken = localStorage.getItem('accessToken');
            if (idToken && accessToken) {
                // For Google users, we can't refresh the token on the client side
                // We'll return the existing tokens, but you might want to implement
                // a server-side refresh mechanism for Google tokens
                resolve({
                    getIdToken: () => ({
                        getJwtToken: () => idToken,
                        decodePayload: () => JSON.parse(atob(idToken.split('.')[1]))
                    }),
                    getAccessToken: () => ({ getJwtToken: () => accessToken })
                });
            } else {
                reject(new Error('No current user session found.'));
            }
        }
    });
};

export const isAdmin = async () => {
    try {
        const session = await getCurrentUserSession();
        const idToken = session.getIdToken();
        const payload = idToken.decodePayload();
        const groups = payload['cognito:groups'] || [];
        return groups.includes('Admin');
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};


export default {
    signIn,
    signOut,
    isAuthenticated,
    getCurrentUserSession,
    refreshCognitoToken,
    setupMFA,
    verifyMFA,
    verifyMFADuringSetup,
    isAdmin
};