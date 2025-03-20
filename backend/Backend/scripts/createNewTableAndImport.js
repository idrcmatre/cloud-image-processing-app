const AWS = require('aws-sdk');
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { fromIni } = require('@aws-sdk/credential-provider-ini');

// Configure AWS SDK
const client = new DynamoDBClient({
  region: 'ap-southeast-2',
  credentials: fromIni({ profile: 'default' })
});
const docClient = DynamoDBDocumentClient.from(client);

const OLD_TABLE_NAME = 'n11484209-Users';
const NEW_TABLE_NAME = 'n11484209-UsersWithCognito';

async function createNewTable() {
  const params = {
    TableName: NEW_TABLE_NAME,
    KeySchema: [
      { AttributeName: 'qut-username', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'qut-username', AttributeType: 'S' },
      { AttributeName: 'cognitoUsername', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CognitoUsernameIndex',
        KeySchema: [
          { AttributeName: 'cognitoUsername', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    await client.send(new CreateTableCommand(params));
    console.log(`Table ${NEW_TABLE_NAME} created successfully`);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`Table ${NEW_TABLE_NAME} already exists`);
    } else {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}

async function importData() {
  try {
    // Scan the old table
    const scanParams = {
      TableName: OLD_TABLE_NAME,
    };
    const { Items } = await docClient.send(new ScanCommand(scanParams));

    // Import data to the new table
    for (const item of Items) {
      const newItem = {
        ...item,
        cognitoUsername: item.username, // Assuming username can be used as cognitoUsername
        cognitoEmail: item.email || `${item.username}@example.com`, // Use email if exists, otherwise generate a fake one
      };

      const putParams = {
        TableName: NEW_TABLE_NAME,
        Item: newItem,
      };

      await docClient.send(new PutCommand(putParams));
      console.log(`Imported user: ${item['qut-username']}`);
    }

    console.log('Data import completed successfully');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

async function linkCognitoUser(dynamoUsername, cognitoUsername, cognitoEmail) {
  const params = {
    TableName: NEW_TABLE_NAME,
    Item: {
      'qut-username': `n11484209@qut.edu.au#${dynamoUsername}`,
      cognitoUsername: cognitoUsername,
      cognitoEmail: cognitoEmail,
      // Include other necessary fields here
    }
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log(`Linked Cognito user ${cognitoUsername} to DynamoDB user ${dynamoUsername}`);
  } catch (error) {
    console.error('Error linking Cognito user:', error);
  }
}

async function main() {
  try {
    await createNewTable();
    await importData();
    
    // Link the Cognito user 'vai' to the DynamoDB user 'admin1'
    await linkCognitoUser('admin1', 'vai', 'vaishnavrai18@gmail.com');

    console.log('Process completed successfully');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
