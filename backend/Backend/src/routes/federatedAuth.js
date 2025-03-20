const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

router.post('/federated-signin', async (req, res) => {
    const { username, email, idToken } = req.body;

    try {
        // Check if user exists in DynamoDB
        const userParams = {
            TableName: process.env.USER_TABLE_NAME,
            Key: {
                'username': username.toLowerCase()
            }
        };

        const userData = await dynamodb.get(userParams).promise();

        if (!userData.Item) {
            // User doesn't exist in DynamoDB, create a new entry
            const newUser = {
                username: username.toLowerCase(),
                email: email,
                role: 'standard',
                dailyLimit: 10,
                imagesProcessed: 0,
                settings: {
                    preferredAnalysis: 'both',
                    enhancementLevel: 1
                }
            };

            await dynamodb.put({
                TableName: process.env.USER_TABLE_NAME,
                Item: newUser
            }).promise();

            // Update Cognito user attributes
            await cognito.adminUpdateUserAttributes({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: username,
                UserAttributes: [
                    { Name: 'custom:Role', Value: 'standard' },
                    { Name: 'custom:dailyLimit', Value: '10' },
                    { Name: 'custom:imagesProcessed', Value: '0' },
                    { Name: 'custom:enhancementLevel', Value: '1' },
                    { Name: 'custom:preferredAnalysis', Value: 'both' }
                ]
            }).promise();
        }

        res.json({ message: 'Federated sign-in successful', user: userData.Item || newUser });
    } catch (error) {
        console.error('Error in federated sign-in:', error);
        res.status(500).json({ error: 'Failed to process federated sign-in' });
    }
});

module.exports = router;