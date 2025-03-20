const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || "ap-southeast-2" });
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || "ap-southeast-2" });

async function getSecret(secretName) {
    try {
        const response = await secretsClient.send(
            new GetSecretValueCommand({
                SecretId: secretName,
                VersionStage: "AWSCURRENT",
            })
        );
        return JSON.parse(response.SecretString);
    } catch (error) {
        console.error("Error fetching secret:", error);
        throw error;
    }
}

async function getParameter(parameterName) {
    try {
        const response = await ssmClient.send(
            new GetParameterCommand({ Name: parameterName })
        );
        return response.Parameter.Value;
    } catch (error) {
        console.error(`Error fetching parameter ${parameterName}:`, error);
        throw error;
    }
}

async function loadConfig() {
    const secrets = await getSecret("n11484209-app-secrets");
    const parameters = {};
    const parameterNames = [
        'S3_BUCKET_NAME', 'COGNITO_CLIENT_ID', 'COGNITO_USER_POOL_ID',
        'COGNITO_DOMAIN', 'GOOGLE_CLIENT_ID', 'USER_TABLE_NAME',
        'ELASTICACHE_ENDPOINT', 'FRONTEND_URL', 'API_URL', 'WS_URL', 'API_LAMBDA_KEY', 'CLOUDFRONT_DOMAIN'
    ];

    for (const name of parameterNames) {
        parameters[name] = await getParameter(`/n11484209/${name}`);
        console.log(`Loaded parameter ${name}: ${parameters[name]}`); // Added this line for debugging
    }

    return {
        ...secrets,
        ...parameters,
        PORT: process.env.PORT || 3001,
        NODE_ENV: process.env.NODE_ENV || 'development',
        AWS_REGION: process.env.AWS_REGION || 'ap-southeast-2',
        QUT_USERNAME: process.env.QUT_USERNAME,
        BACKEND_URL: process.env.NODE_ENV === 'production'
            ? 'https://n11484209.cab432.com'
            : `http://localhost:${process.env.PORT || 3001}`,
        SQS_QUEUE_URL: "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11484209-SQS-assignment3",
    };
}

module.exports = { loadConfig };