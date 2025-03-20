const AWS = require('aws-sdk');
const { fromSSO } = require("@aws-sdk/credential-providers");

async function createTables() {
  try {
    // Load credentials from SSO
    const credentials = await fromSSO({ profile: "default" })();

    // Configure AWS SDK
    AWS.config.update({ 
      credentials: credentials,
      region: 'ap-southeast-2' // This is typically the region for QUT's AWS setup
    });

    const dynamodb = new AWS.DynamoDB();

    const tables = [
      {
        TableName: "n11484209-Users",
        KeySchema: [
          { AttributeName: "username", KeyType: "HASH" }
        ],
        AttributeDefinitions: [
          { AttributeName: "username", AttributeType: "S" },
          { AttributeName: "role", AttributeType: "S" }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: "RoleIndex",
            KeySchema: [
              { AttributeName: "role", KeyType: "HASH" }
            ],
            Projection: {
              ProjectionType: "ALL"
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ]
      },
      {
        TableName: "n11484209-ImageMetadata",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "originalFilename", KeyType: "RANGE" }
        ],
        AttributeDefinitions: [
          { AttributeName: "userId", AttributeType: "S" },
          { AttributeName: "originalFilename", AttributeType: "S" },
          { AttributeName: "processedAt", AttributeType: "N" }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: "ProcessedAtIndex",
            KeySchema: [
              { AttributeName: "userId", KeyType: "HASH" },
              { AttributeName: "processedAt", KeyType: "RANGE" }
            ],
            Projection: {
              ProjectionType: "ALL"
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ]
      }
    ];

    for (const tableParams of tables) {
      try {
        const result = await dynamodb.createTable(tableParams).promise();
        console.log("Table created successfully:", result.TableDescription.TableName);
      } catch (error) {
        console.error("Error creating table:", tableParams.TableName, error);
      }
    }
  } catch (error) {
    console.error("Error setting up AWS credentials:", error);
  }
}

createTables();
