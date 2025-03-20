const axios = require('axios');
const { CognitoUserPool, CognitoUser, AuthenticationDetails } = require('amazon-cognito-identity-js');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const BASE_URL = process.env.SERVER_URL || 'https://n11484209.cab432.com';
const TEST_IMAGE_PATH = path.resolve(__dirname, 'test-image.jpg');

const poolData = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    ClientId: process.env.COGNITO_CLIENT_ID
};
const userPool = new CognitoUserPool(poolData);

// Phase configuration
const DELAY_BETWEEN_BATCHES_MS = 1000;
let token = null;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function authenticateUser() {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({
            Username: process.env.TEST_USERNAME,
            Pool: userPool
        });

        const authDetails = new AuthenticationDetails({
            Username: process.env.TEST_USERNAME,
            Password: process.env.TEST_PASSWORD
        });

        user.authenticateUser(authDetails, {
            onSuccess: (result) => {
                token = result.getIdToken().getJwtToken();
                console.log('Authentication successful');
                resolve(token);
            },
            onFailure: (err) => {
                console.error('Authentication failed:', err.message);
                reject(err);
            },
            totpRequired: async () => {
                const mfaCode = await new Promise(resolve => rl.question('Enter MFA code: ', resolve));
                user.sendMFACode(mfaCode, {
                    onSuccess: (result) => {
                        token = result.getIdToken().getJwtToken();
                        console.log('Authentication successful with MFA');
                        resolve(token);
                    },
                    onFailure: (err) => {
                        console.error('MFA verification failed:', err.message);
                        reject(err);
                    }
                }, 'SOFTWARE_TOKEN_MFA');
            }
        });
    });
}

async function getPresignedUploadUrl(fileName) {
    try {
        const response = await axios.post(`${BASE_URL}/api/image/get-s3-upload-url`, {
            fileName,
            contentType: 'image/jpeg'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.uploadUrl;
    } catch (error) {
        console.error('Error getting pre-signed upload URL:', error.message);
        throw error;
    }
}

async function uploadToS3WithPresignedUrl(url, data, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await axios.put(url, data, {
                headers: { 'Content-Type': 'image/jpeg' },
                timeout: 30000
            });
            if (response.status === 200) {
                return;
            }
        } catch (error) {
            if (error.code === 'ETIMEDOUT' && attempt < retries - 1) {
                console.warn(`Timeout on attempt ${attempt + 1}. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw error;
            }
        }
    }
}

async function processImage(fileName, phase, requestNumber) {
    console.log(`Phase ${phase} - Processing request ${requestNumber}`);
    try {
        const uploadUrl = await getPresignedUploadUrl(fileName);
        const imageBuffer = await fs.readFile(TEST_IMAGE_PATH);
        await uploadToS3WithPresignedUrl(uploadUrl, imageBuffer);

        const startTime = Date.now();
        const response = await axios.post(`${BASE_URL}/api/image/process-bulk`, {
            fileNames: [fileName]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const processingTime = Date.now() - startTime;

        return {
            success: true,
            processingTime,
            phase,
            requestNumber
        };
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error.message);
        return {
            success: false,
            error: error.message,
            phase,
            requestNumber
        };
    }
}

async function runPhase(phaseNumber, concurrentRequests, duration) {
    console.log(`\nStarting Phase ${phaseNumber} with ${concurrentRequests} concurrent requests`);
    console.log(`Phase duration: ${duration / 1000} seconds`);

    const phaseStart = Date.now();
    let batchNumber = 0;
    let phaseSuccessful = 0;
    let totalProcessingTime = 0;

    while (Date.now() - phaseStart < duration) {
        batchNumber++;
        console.log(`\nPhase ${phaseNumber} - Batch ${batchNumber}`);

        const batchPromises = Array.from({ length: concurrentRequests }, async (_, i) => {
            const fileName = `phase${phaseNumber}-batch${batchNumber}-req${i}.jpg`;
            return processImage(fileName, phaseNumber, i + 1);
        });

        const results = await Promise.all(batchPromises);
        const successful = results.filter(r => r.success).length;
        phaseSuccessful += successful;

        const processingTimes = results
            .filter(r => r.success)
            .map(r => r.processingTime);

        if (processingTimes.length > 0) {
            const avgTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
            totalProcessingTime += avgTime;
            console.log(`Average processing time for batch: ${avgTime.toFixed(2)}ms`);
        }

        const elapsedSeconds = ((Date.now() - phaseStart) / 1000).toFixed(1);
        console.log(`Phase ${phaseNumber} - Time: ${elapsedSeconds}s | Success: ${successful}/${concurrentRequests} | Total: ${phaseSuccessful}`);

        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }

    const avgProcessingTime = totalProcessingTime / batchNumber;
    return { phaseSuccessful, avgProcessingTime };
}

async function runLoadTest() {
    await authenticateUser();
    console.log('\nStarting gradual load test...');

    const phases = [
        { number: 1, requests: 6, duration: 120000 },  // 2 mins with 3 requests
        { number: 2, requests: 9, duration: 120000 },  // 2 mins with 6 requests
        { number: 3, requests: 12, duration: 120000 }   // 2 mins with 9 requests
    ];

    let totalSuccessful = 0;
    let totalProcessingTime = 0;

    for (const phase of phases) {
        const result = await runPhase(phase.number, phase.requests, phase.duration);
        totalSuccessful += result.phaseSuccessful;
        totalProcessingTime += result.avgProcessingTime;

        console.log(`\nPhase ${phase.number} completed:`);
        console.log(`Successful requests: ${result.phaseSuccessful}`);
        console.log(`Average processing time: ${result.avgProcessingTime.toFixed(2)}ms`);

        // Brief pause between phases
        if (phase.number < phases.length) {
            console.log('\nPausing between phases...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.log('\nLoad test completed:');
    console.log(`Total successful uploads: ${totalSuccessful}`);
    console.log(`Overall average processing time: ${(totalProcessingTime / phases.length).toFixed(2)}ms`);
    rl.close();
}

runLoadTest().catch(console.error);
