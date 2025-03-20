const { sendToProcessingQueue } = require('../src/services/queueService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testQueue() {
    try {
        console.log('Starting queue test...');

        // Test data
        const testData = {
            fileName: `test-image-${Date.now()}.jpg`,
            username: 'testuser',
            enhancementLevel: 5,
            preferredAnalysis: 'both'
        };

        console.log('\nSending test message to queue with data:', testData);

        // Send to queue
        const queueResponse = await sendToProcessingQueue(testData);
        
        console.log('\nQueue response:', queueResponse);

        if (queueResponse.messageId) {
            console.log('✅ Message successfully queued with ID:', queueResponse.messageId);
        } else {
            console.log('❌ Failed to get message ID from queue');
        }

        console.log('\nTest Summary:');
        console.log('-------------');
        console.log(`Queue Message ID: ${queueResponse.messageId}`);
        console.log(`Message Status: ${queueResponse.status}`);
        console.log('\nTo verify:');
        console.log('1. Check AWS SQS Console to see the message');
        console.log('2. Message content should match the test data');
        console.log('3. Message should have userId and fileName attributes');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.error('Error details:', error.message);
    }
}

// Run the test
console.log('=== Queue Integration Test ===');
testQueue().then(() => {
    console.log('\nTest completed!');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
