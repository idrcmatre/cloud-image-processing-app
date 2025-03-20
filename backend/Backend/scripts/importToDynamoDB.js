require("dotenv").config();
const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require('fs').promises;

const qutUsername = "n11484209@qut.edu.au";
const userTableName = "n11484209-Users";
const imageTableName = "n11484209-ImageMetadata";

async function setupClient() {
  const client = new DynamoDBClient({ region: "ap-southeast-2" });
  return DynamoDBDocumentClient.from(client);
}

async function createTable(docClient, tableName, sortKey) {
  const command = new CreateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [
      { AttributeName: "qut-username", AttributeType: "S" },
      { AttributeName: sortKey, AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "qut-username", KeyType: "HASH" },
      { AttributeName: sortKey, KeyType: "RANGE" },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  try {
    const response = await docClient.send(command);
    console.log(`Table ${tableName} created successfully:`, response);
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log(`Table ${tableName} already exists`);
    } else {
      console.error(`Error creating table ${tableName}:`, err);
    }
  }
}

async function importData(docClient, filename, tableName) {
  const data = JSON.parse(await fs.readFile(filename, 'utf-8'));
  const chunkSize = 25;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const params = {
      RequestItems: {
        [tableName]: chunk.map(item => ({
          PutRequest: { 
            Item: {
              ...item,
              colorAnalysis: item.colorAnalysis ? JSON.stringify(item.colorAnalysis) : null,
              originalClassification: item.originalClassification ? JSON.stringify(item.originalClassification) : null,
              enhancedClassification: item.enhancedClassification ? JSON.stringify(item.enhancedClassification) : null,
            } 
          }
        }))
      }
    };

    try {
      await docClient.send(new BatchWriteCommand(params));
      console.log(`Imported items ${i + 1} to ${i + chunk.length} into ${tableName}`);
    } catch (err) {
      console.error(`Error importing items into ${tableName}:`, err);
    }
  }
}

async function main() {
  const docClient = await setupClient();

  // Create tables
  await createTable(docClient, userTableName, "username");
  await createTable(docClient, imageTableName, "originalFilename");

  // Wait for tables to be created
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Import data
  await importData(docClient, 'users-export.json', userTableName);
  await importData(docClient, 'image-metadata-export.json', imageTableName);

  console.log('Import completed');
}

main();
