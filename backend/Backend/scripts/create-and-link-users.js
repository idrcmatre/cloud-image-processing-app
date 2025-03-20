const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const {
    CognitoIdentityProviderClient,
    AdminUpdateUserAttributesCommand,
    AdminSetUserPasswordCommand,
    AdminGetUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const { fromSSO } = require("@aws-sdk/credential-provider-sso");
const fs = require('fs').promises;

// Cognito User Pool ID - replace with your actual User Pool ID
const USER_POOL_ID = 'ap-southeast-2_iv3tKxrjR';

// Create clients
const dynamodb = new DynamoDBClient({
    region: "ap-southeast-2",
    credentials: fromSSO({ profile: "default" }) // Use your SSO profile name if not "default"
});

const cognito = new CognitoIdentityProviderClient({
    region: "ap-southeast-2",
    credentials: fromSSO({ profile: "default" }) // Use your SSO profile name if not "default"
});

function ensurePasswordMeetsPolicy(password) {
    let newPassword = password;
    if (!/[A-Z]/.test(newPassword)) newPassword += 'A';
    if (!/[a-z]/.test(newPassword)) newPassword += 'a';
    if (!/\d/.test(newPassword)) newPassword += '1';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) newPassword += '!';
    while (newPassword.length < 8) newPassword += 'x';
    return newPassword;
}

async function updateUsers() {
    const userPasswords = [];

    try {
        console.log('Starting DynamoDB scan...');
        const scanCommand = new ScanCommand({ TableName: 'n11484209-Users' });
        const { Items: users } = await dynamodb.send(scanCommand);
        console.log(`Found ${users.length} users in DynamoDB.`);

        for (const user of users) {
            const username = user.username.S;
            const email = `${username}@example.com`;
            const originalPassword = user.password.S;
            const password = ensurePasswordMeetsPolicy(originalPassword);

            try {
                console.log(`Updating user: ${username}`);

                // Check if user exists
                try {
                    await cognito.send(new AdminGetUserCommand({
                        UserPoolId: USER_POOL_ID,
                        Username: username
                    }));
                } catch (error) {
                    if (error.name === 'UserNotFoundException') {
                        console.log(`User ${username} not found in Cognito. Skipping.`);
                        continue;
                    }
                    throw error;
                }

                // Update user attributes
                const updateUserCommand = new AdminUpdateUserAttributesCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: username,
                    UserAttributes: [
                        { Name: 'email', Value: email },
                        { Name: 'email_verified', Value: 'true' },
                        { Name: 'custom:Role', Value: user.role.S },
                        { Name: 'custom:dailyLimit', Value: user.dailyLimit.N.toString() },
                        { Name: 'custom:imagesProcessed', Value: user.imagesProcessed.N.toString() },
                        { Name: 'custom:preferredAnalysis', Value: user.settings.M.preferredAnalysis.S },
                        { Name: 'custom:enhancementLevel', Value: user.settings.M.enhancementLevel.N.toString() },
                        { Name: 'custom:originalEmail', Value: user['qut-username'].S }
                    ]
                });
                await cognito.send(updateUserCommand);

                // Set password
                const setPasswordCommand = new AdminSetUserPasswordCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: username,
                    Password: password,
                    Permanent: true
                });
                await cognito.send(setPasswordCommand);

                userPasswords.push({ username, password });
                console.log(`Successfully updated user: ${username}`);
            } catch (error) {
                console.error(`Error updating user ${username}:`, error);
            }
        }

        console.log('Update completed. Saving passwords...');

        await fs.writeFile('user_passwords.json', JSON.stringify(userPasswords, null, 2));
        console.log('User passwords have been saved to user_passwords.json');

        // Log passwords to console as well
        console.log('User Passwords:');
        console.log(JSON.stringify(userPasswords, null, 2));

    } catch (error) {
        console.error('Update failed:', error);
    }
}

updateUsers().catch(error => console.error('Unhandled error:', error));