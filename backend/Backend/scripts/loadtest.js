const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = process.env.BASE_URL || 'http://ec2-3-27-108-148.ap-southeast-2.compute.amazonaws.com:3001';
const LOGIN_URL = `${BASE_URL}/auth/login`;
const API_URL = `${BASE_URL}/api/process-bulk`;
const IMAGE_PATH = path.join(__dirname, 'uploads', 'table.jpg');
const NUM_CONCURRENT_REQUESTS = 5;
const TOTAL_REQUESTS = 80;

// Add your login credentials here
const LOGIN_CREDENTIALS = {
  username: 'admin1',
  password: 'adminpass1'
};

let cookieJar = null;

async function login() {
  try {
    const response = await axios.post(LOGIN_URL, LOGIN_CREDENTIALS);
    if (response.headers['set-cookie']) {
      cookieJar = response.headers['set-cookie'][0];
      console.log('Login successful');
    } else {
      throw new Error('No cookie received after login');
    }
  } catch (error) {
    console.error('Login failed:', error.message);
    process.exit(1);
  }
}

async function sendRequest() {
  const formData = new FormData();
  formData.append('images', fs.createReadStream(IMAGE_PATH));

  try {
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookieJar
      },
      timeout: 300000 // 5 minutes timeout
    });
    console.log('Request successful');
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

async function runLoadTest() {
  console.log(`Starting load test with ${TOTAL_REQUESTS} total requests, ${NUM_CONCURRENT_REQUESTS} concurrent...`);
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_REQUESTS; i += NUM_CONCURRENT_REQUESTS) {
    const batch = Math.min(NUM_CONCURRENT_REQUESTS, TOTAL_REQUESTS - i);
    const requests = Array(batch).fill().map(() => sendRequest());
    await Promise.all(requests);
    console.log(`Completed ${i + batch} requests`);
  }

  const endTime = Date.now();
  console.log(`Load test completed in ${(endTime - startTime) / 1000} seconds`);
}

// Check if the image file exists before running the test
fs.access(IMAGE_PATH, fs.constants.F_OK, (err) => {
  if (err) {
    console.error(`Error: The file at ${IMAGE_PATH} does not exist.`);
    console.log('Please ensure you have a test image in your uploads folder and update the IMAGE_PATH accordingly.');
  } else {
    login().then(() => {
      runLoadTest();
    });
  }
});
