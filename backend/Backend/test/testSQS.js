const { SQSClient, SendMessageCommand, ReceiveMessageCommand } = require('@aws-sdk/client-sqs');

const QUEUE_URL = 'https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11484209-SQS-assignment3';

async function testSQS() {
    console.log('Starting SQS test...');
    
    const client = new SQSClient({
        region: 'ap-southeast-2'
    });

    try {
        // Send a test message
        const sendCommand = new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
                test: 'Hello SQS',
                timestamp: new Date().toISOString()
            })
        });

        console.log('Sending message...');
        const sendResult = await client.send(sendCommand);
        console.log('Message sent:', sendResult);

        // Try to receive the message
        const receiveCommand = new ReceiveMessageCommand({
            QueueUrl: QUEUE_URL,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 5
        });

        console.log('Receiving message...');
        const receiveResult = await client.send(receiveCommand);
        console.log('Receive result:', receiveResult);

    } catch (error) {
        console.error('Error:', error);
    }
}

testSQS();
