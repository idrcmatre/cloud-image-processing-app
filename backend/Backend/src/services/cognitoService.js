const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { loadConfig } = require('../../config');

let USER_POOL_ID;

const initializeCognitoService = async () => {
    const config = await loadConfig();
    USER_POOL_ID = config.COGNITO_USER_POOL_ID;
    if (!USER_POOL_ID) {
        throw new Error('COGNITO_USER_POOL_ID is not set in configuration');
    }
};

const client = new CognitoIdentityProviderClient({ region: "ap-southeast-2" });

const updateUserAttributes = async (username, attributes) => {
    if (!USER_POOL_ID) {
        await initializeCognitoService();
    }

    const userAttributes = Object.entries(attributes)
        .filter(([_, value]) => value !== undefined)
        .map(([Name, Value]) => ({ Name, Value: Value.toString() }));

    if (userAttributes.length === 0) {
        console.log('No valid attributes to update for user:', username);
        return;
    }

    const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: userAttributes
    });

    try {
        await client.send(command);
        console.log(`Updated Cognito attributes for user: ${username}`);
    } catch (error) {
        console.error('Error updating Cognito user attributes:', error);
        throw error;
    }
};

module.exports = {
    updateUserAttributes
};