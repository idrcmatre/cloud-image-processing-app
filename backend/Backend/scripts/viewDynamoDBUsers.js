const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { fromSSO } = require("@aws-sdk/credential-provider-sso");

async function scanTable() {
  try {
    // Create DynamoDB client with SSO credentials
    const client = new DynamoDBClient({
      region: "ap-southeast-2",
      credentials: fromSSO({ profile: "default" }) // Use your SSO profile name if not "default"
    });

    const command = new ScanCommand({
      TableName: "n11484209-Users",
    });

    const response = await client.send(command);
    console.log("Success. Table contents:");
    console.log(JSON.stringify(response.Items, null, 2));
  } catch (err) {
    console.error("Error", err);
  }
}

scanTable();
