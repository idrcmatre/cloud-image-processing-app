// load-test.js
const { processAndEnhanceImage } = require('../src/services/imageProcessing'); // Adjust this path
const readline = require('readline');
const fs = require('fs').promises;

require('dotenv').config();

const BASE_URL = 'http://n11484209.cab432.com';

// NUCLEAR SETTINGS
const CONCURRENT_REQUESTS = 15;    // Start with 15 and adjust based on performance
const IMAGES_PER_BATCH = 1;        // Single image per request for intensive tasks
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1-second delay between batches
const TEST_DURATION_MS = 300000;   // Start with 5 minutes for observation


let token = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function authenticateUser() {
    return new Promise((resolve, reject) => {
        const poolData = {
            UserPoolId: 'ap-southeast-2_iv3tKxrjR',
            ClientId: '2dnphu64p6l4of1i0dt7npb1dt'
        };

        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        const authData = {
            Username: process.env.TEST_USERNAME,
            Password: process.env.TEST_PASSWORD
        };

        const user = new AmazonCognitoIdentity.CognitoUser({
            Username: process.env.TEST_USERNAME,
            Pool: userPool
        });

        user.authenticateUser(new AmazonCognitoIdentity.AuthenticationDetails(authData), {
            onSuccess: (result) => resolve(result.getIdToken().getJwtToken()),
            onFailure: (err) => reject(err),
            totpRequired: async (challengeName, challengeParameters) => {
                const mfaCode = await new Promise(resolve => {
                    rl.question('Enter MFA code: ', (code) => resolve(code));
                });

                user.sendMFACode(mfaCode, {
                    onSuccess: (result) => resolve(result.getIdToken().getJwtToken()),
                    onFailure: (err) => reject(err)
                }, 'SOFTWARE_TOKEN_MFA');
            }
        });
    });
}

async function runImageProcessingTest(fileName, username) {
    try {
        const imageBuffer = await fs.readFile('./test-image.jpg'); // Path to your test image
        const result = await processAndEnhanceImage(fileName, username, (progress) => {
            console.log(`Processing progress for ${fileName}: ${progress}%`);
        });
        console.log('Image processed:', result);
        return { success: true };
    } catch (error) {
        console.error('Error processing image:', error);
        return { success: false, error: error.message };
    }
}

async function runLoadTest() {
    try {
        console.log('Starting authentication...');
        await authenticateUser(); // Implement authentication if required
        console.log('Authentication successful');

        console.log('\nStarting load test...');
        console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);
        console.log(`Images per batch: ${IMAGES_PER_BATCH}`);
        console.log(`Total images per round: ${CONCURRENT_REQUESTS * IMAGES_PER_BATCH}`);
        console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES_MS}ms\n`);

        const startTime = Date.now();
        let totalSuccessful = 0;
        let batchNumber = 0;

        while (Date.now() - startTime < TEST_DURATION_MS) {
            batchNumber++;
            console.log(`Starting batch ${batchNumber}...`);

            const batchPromises = Array.from({ length: CONCURRENT_REQUESTS }, async (_, i) => {
                const fileName = `test-image-${Date.now()}-${i}.jpg`;
                const username = process.env.TEST_USERNAME; // Replace with test username
                return runImageProcessingTest(fileName, username);
            });

            const results = await Promise.all(batchPromises);
            const successful = results.filter(r => r.success).length;
            totalSuccessful += successful * IMAGES_PER_BATCH;

            const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
            console.log(`Time: ${elapsedMinutes}m | Success: ${successful}/${CONCURRENT_REQUESTS} | Total processed images: ${totalSuccessful}`);

            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        rl.close();
    }
}

runLoadTest().catch(console.error);
