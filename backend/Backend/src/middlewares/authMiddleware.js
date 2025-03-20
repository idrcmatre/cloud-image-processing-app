const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { loadConfig } = require('../../config');

let verifier;

async function initializeVerifier() {
    const config = await loadConfig();
    verifier = CognitoJwtVerifier.create({
        userPoolId: config.COGNITO_USER_POOL_ID,
        tokenUse: "id",
        clientId: config.COGNITO_CLIENT_ID,
    });
}

initializeVerifier();

exports.isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('Authorization header missing');
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('Token missing from Authorization header');
            return res.status(401).json({ error: 'Token missing from Authorization header' });
        }

        console.log('Verifying token...');
        const payload = await verifier.verify(token);
        console.log('Token verified successfully');
        console.log('Full JWT payload:', JSON.stringify(payload, null, 2));

        req.user = {
            ...payload,
            'custom:Role': payload['custom:Role'] || payload['custom:role'],
            'custom:role': payload['custom:Role'] || payload['custom:role'],
        };
        console.log('Processed req.user:', JSON.stringify(req.user, null, 2));

        return next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Unauthorized - Invalid Token' });
    }
};

// Check if the user is an admin
exports.isAdmin = (req, res, next) => {
    if (req.user && (req.user['custom:Role'] === 'admin' || req.user['custom:role'] === 'admin')) {
        next();
    } else {
        console.log('Admin access denied for user:', req.user);
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Check if the user is a premium user or admin
exports.isPremiumOrAdmin = (req, res, next) => {
    const userRole = req.user['custom:Role'] || req.user['custom:role'];
    if (req.user && (userRole === 'premium' || userRole === 'admin')) {
        next();
    } else {
        console.log('Premium or Admin access denied for user:', req.user);
        res.status(403).json({ error: 'Premium or Admin access required' });
    }
};

// New middleware to refresh the token if it's close to expiration
exports.refreshTokenIfNeeded = async (req, res, next) => {
    if (req.user && req.user.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExp = req.user.exp;
        const timeUntilExp = tokenExp - currentTime;

        // If token expires in less than 5 minutes (300 seconds), refresh it
        if (timeUntilExp < 300) {
            try {
                console.log('Token close to expiration, attempting to refresh...');
                // Implement your token refresh logic here
                // This might involve calling Cognito to get a new token
                // Update the req.user with the new token information
                // For now, we'll just log it
                console.log('Token refresh logic would be implemented here');
            } catch (error) {
                console.error('Error refreshing token:', error);
            }
        }
    }
    next();
};