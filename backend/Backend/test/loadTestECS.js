// load-test.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://n11484209.cab432.com';
const CONCURRENT_REQUESTS = 10;
const TEST_DURATION_MS = 300000; // 5 minutes
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second

// Add your test user credentials
const TEST_USER = {
    username: 'admin2@example.com', // Add your test username
    password: 'adminpass2A!'  // Add your test password
};

// Function to get authentication token
async function getAuthToken() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: TEST_USER.username,
            password: TEST_USER.password
        });
        return response.data.token; // Adjust based on your auth response structure
    } catch (error) {
        console.error('Authentication failed:', error.message);
        throw error;
    }
}

async function sendImageRequest(imagePath, token) {
    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        
        const response = await axios.post(`${BASE_URL}/api/image/process`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`,
            },
            timeout: 10000 // 10 second timeout
        });
        
        return response.status === 200;
    } catch (error) {
        console.error(`Error sending request: ${error.message}`);
        return false;
    }
}

async function runBatch(imagePath, token, batchSize) {
    const promises = Array(batchSize).fill().map(() => sendImageRequest(imagePath, token));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = batchSize - successful;
    
    return { successful, failed };
}

async function runLoadTest() {
    try {
        // Get auth token first
        console.log('Authenticating...');
        const token = await getAuthToken();
        console.log('Authentication successful');

        const startTime = Date.now();
        let totalSuccessful = 0;
        let totalFailed = 0;
        
        const imagePath = path.join(__dirname, 'test-image.jpg');
        
        console.log('Starting load test...');
        console.log(`Concurrent requests per batch: ${CONCURRENT_REQUESTS}`);
        console.log(`Test duration: ${TEST_DURATION_MS / 1000} seconds`);
        
        while (Date.now() - startTime < TEST_DURATION_MS) {
            const { successful, failed } = await runBatch(imagePath, token, CONCURRENT_REQUESTS);
            
            totalSuccessful += successful;
            totalFailed += failed;
            
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
            process.stdout.write(`\rTime: ${elapsedSeconds}s | Successful: ${totalSuccessful} | Failed: ${totalFailed}`);
            
            // Wait before next batch
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
        
        console.log('\nLoad test completed!');
        console.log(`Total successful requests: ${totalSuccessful}`);
        console.log(`Total failed requests: ${totalFailed}`);
    } catch (error) {
        console.error('Load test failed:', error.message);
    }
}

runLoadTest().catch(console.error);
