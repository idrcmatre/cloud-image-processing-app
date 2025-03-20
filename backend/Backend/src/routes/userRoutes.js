const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const dynamoDBService = require('../services/dynamoDBService');
const router = express.Router();

const qutUsername = "n11484209@qut.edu.au";

router.get('/info', isAuthenticated, async (req, res) => {
    console.log('User info request received');
    console.log('Full req.user object:', JSON.stringify(req.user, null, 2));

    try {
        const cognitoUsername = req.user['cognito:username'].toLowerCase();

        // Fetch user data from DynamoDB
        let userData = await dynamoDBService.getUser(cognitoUsername);

        if (!userData) {
            // User doesn't exist in DynamoDB, create new user
            userData = {
                username: cognitoUsername,
                email: req.user.email,
                role: req.user['custom:Role'] || 'standard',
                dailyLimit: parseInt(req.user['custom:dailyLimit'] || '10', 10),
                imagesProcessed: parseInt(req.user['custom:imagesProcessed'] || '0', 10),
                settings: {
                    preferredAnalysis: req.user['custom:preferredAnalysis'] || 'both',
                    enhancementLevel: parseInt(req.user['custom:enhancementLevel'] || '1', 10)
                }
            };

            // Save the new user to DynamoDB
            await dynamoDBService.createUser(userData);
        }

        console.log('Processed user info:', JSON.stringify(userData, null, 2));
        res.json(userData);
    } catch (error) {
        console.error('Error processing user information:', error);
        res.status(500).json({ error: 'Failed to process user information' });
    }
});

router.post('/create', async (req, res) => {
    console.log('Received data:', req.body);
    const { username, email, dailyLimit, enhancementLevel, imagesProcessed, preferredAnalysis, role } = req.body;

    const userData = {
        username: username.toLowerCase(),
        email,
        dailyLimit,
        enhancementLevel,
        imagesProcessed,
        preferredAnalysis,
        role,
        settings: {
            preferredAnalysis,
            enhancementLevel
        }
    };

    try {
        await dynamoDBService.createUser(userData);
        res.status(201).json({ message: "User added to DynamoDB successfully" });
    } catch (error) {
        console.error("Error adding user to DynamoDB:", error);
        res.status(500).json({ error: "Failed to add user to DynamoDB", details: error.message });
    }
});

module.exports = router;