//export const SERVER_URL = 'http://ec2-3-26-3-183.ap-southeast-2.compute.amazonaws.com:3001';
export const SERVER_URL = 'http://localhost:3001';
export const COGNITO = {
    REGION: 'ap-southeast-2', // Adjust this based on your AWS region
    USER_POOL_ID: 'your_cognito_user_pool_id',
    CLIENT_ID: 'your_cognito_client_id',
    REDIRECT_URI: 'http://localhost:3000', // Use the same URI as your authorized JS origins
};

