const AWS = require('aws-sdk');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize the DynamoDB client with the region explicitly set
const client = new DynamoDBClient({
  region: 'ap-southeast-2'
});

const docClient = DynamoDBDocumentClient.from(client);

const USER_TABLE_NAME = 'n11484209-Users';

async function updateUserWithCognitoInfo(dynamoUsername, cognitoUsername, cognitoEmail) {
  const params = {
    TableName: USER_TABLE_NAME,
    Key: {
      'qut-username': `n11484209@qut.edu.au#${dynamoUsername}`,
    },
    UpdateExpression: 'set cognitoUsername = :cognitoUsername, cognitoEmail = :cognitoEmail',
    ExpressionAttributeValues: {
      ':cognitoUsername': cognitoUsername,
      ':cognitoEmail': cognitoEmail,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    console.log('User updated successfully:', Attributes);
    return Attributes;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function getUser(username) {
  const params = {
    TableName: USER_TABLE_NAME,
    Key: {
      'qut-username': `n11484209@qut.edu.au#${username}`,
    },
  };

  try {
    const { Item } = await docClient.send(new GetCommand(params));
    return Item;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

async function linkCognitoUserToDynamoDB() {
  const dynamoUsername = 'admin1';
  const cognitoUsername = 'vai';
  const cognitoEmail = 'vaishnavrai18@gmail.com'; // Replace with actual email if different

  try {
    // First, check if the user exists in DynamoDB
    const existingUser = await getUser(dynamoUsername);
    if (!existingUser) {
      console.error('User not found in DynamoDB:', dynamoUsername);
      return;
    }

    // Update the user with Cognito information
    const updatedUser = await updateUserWithCognitoInfo(dynamoUsername, cognitoUsername, cognitoEmail);
    console.log('User linked successfully:', updatedUser);
  } catch (error) {
    console.error('Error linking user:', error);
  }
}

linkCognitoUserToDynamoDB();
