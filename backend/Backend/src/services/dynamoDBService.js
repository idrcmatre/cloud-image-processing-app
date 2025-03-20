const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const qutUsername = "n11484209@qut.edu.au";
const USER_TABLE_NAME = "n11484209-Users";
const IMAGE_METADATA_TABLE_NAME = "n11484209-ImageMetadata";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

const getUser = async (username) => {
    const params = {
        TableName: USER_TABLE_NAME,
        Key: {
            "qut-username": qutUsername,
            "username": username.toLowerCase()
        }
    };

    try {
        console.log('GetUser params:', JSON.stringify(params, null, 2));
        const command = new GetCommand(params);
        const result = await docClient.send(command);
        console.log('Raw DynamoDB result:', JSON.stringify(result, null, 2));
        if (!result.Item) {
            console.log('User not found in DynamoDB:', username);
            return null;
        }
        console.log('Complete user object from DynamoDB:', JSON.stringify(result.Item, null, 2));
        return result.Item;
    } catch (error) {
        console.error('Error fetching user data from DynamoDB:', error);
        throw error;
    }
};

const createUser = async (userData) => {
    const command = new PutCommand({
        TableName: USER_TABLE_NAME,
        Item: {
            "qut-username": qutUsername,
            ...userData
        }
    });

    try {
        await docClient.send(command);
        console.log('User created in DynamoDB:', userData.username);
    } catch (error) {
        console.error('Error creating user in DynamoDB:', error);
        throw error;
    }
};

const updateUserImagesProcessed = async (username) => {
    const today = new Date().toISOString().split('T')[0];
    const command = new UpdateCommand({
        TableName: USER_TABLE_NAME,
        Key: {
            "qut-username": qutUsername,
            "username": username.toLowerCase()
        },
        UpdateExpression: `
            SET imagesProcessed = if_not_exists(imagesProcessed, :zero) + :inc,
                lastProcessedDate = if_not_exists(lastProcessedDate, :today)
        `,
        ExpressionAttributeValues: {
            ':inc': 1,
            ':zero': 0,
            ':today': today
        },
        ReturnValues: 'UPDATED_NEW'
    });

    try {
        const response = await docClient.send(command);
        const updatedAttributes = response.Attributes;

        // Check if it's a new day and reset if necessary
        if (updatedAttributes.lastProcessedDate < today) {
            const resetCommand = new UpdateCommand({
                TableName: USER_TABLE_NAME,
                Key: {
                    "qut-username": qutUsername,
                    "username": username.toLowerCase()
                },
                UpdateExpression: 'SET imagesProcessed = :inc, lastProcessedDate = :today',
                ExpressionAttributeValues: {
                    ':inc': 1,
                    ':today': today
                },
                ReturnValues: 'UPDATED_NEW'
            });
            const resetResponse = await docClient.send(resetCommand);
            return resetResponse.Attributes;
        }

        return updatedAttributes;
    } catch (error) {
        console.error('Error updating user imagesProcessed in DynamoDB:', error);
        throw error;
    }
};

const saveImageMetadata = async (metadata) => {
    const command = new UpdateCommand({
        TableName: IMAGE_METADATA_TABLE_NAME,
        Key: {
            "qut-username": qutUsername,
            "originalFilename": metadata.originalFilename
        },
        UpdateExpression: `SET 
            userId = :userId,
            originalImageUrl = :originalImageUrl,
            enhancedImageUrl = :enhancedImageUrl,
            analysis = :analysis,
            userSettings = :userSettings,
            processedAt = :processedAt,
            processCount = if_not_exists(processCount, :zero) + :one`,
        ExpressionAttributeValues: {
            ':userId': metadata.userId,
            ':originalImageUrl': metadata.originalImageUrl,
            ':enhancedImageUrl': metadata.enhancedImageUrl,
            ':analysis': metadata.analysis,
            ':userSettings': metadata.userSettings,
            ':processedAt': new Date().toISOString(),
            ':zero': 0,
            ':one': 1
        },
        ReturnValues: 'ALL_NEW'
    });

    try {
        const result = await docClient.send(command);
        console.log('Image metadata saved/updated in DynamoDB:', result.Attributes);
        return result.Attributes;
    } catch (error) {
        console.error('Error saving/updating image metadata in DynamoDB:', error);
        throw error;
    }
};

const getAllUsers = async () => {
    console.log('Fetching all users');
    const params = {
        TableName: USER_TABLE_NAME,
        FilterExpression: "#qut = :qutUsername",
        ExpressionAttributeNames: {
            "#qut": "qut-username"
        },
        ExpressionAttributeValues: {
            ":qutUsername": qutUsername
        }
    };

    try {
        const command = new ScanCommand(params);
        const result = await docClient.send(command);
        console.log('All users result:', result);
        return result.Items || [];
    } catch (error) {
        console.error('Error fetching all users from DynamoDB:', error);
        throw error;
    }
};

const getImagesProcessedToday = async () => {
    console.log('Fetching images processed today');
    const today = new Date().toISOString().split('T')[0];

    const params = {
        TableName: IMAGE_METADATA_TABLE_NAME,
        FilterExpression: "#qut = :qutUsername and begins_with(processedAt, :today)",
        ExpressionAttributeNames: {
            "#qut": "qut-username"
        },
        ExpressionAttributeValues: {
            ":qutUsername": qutUsername,
            ":today": today
        }
    };

    try {
        const command = new ScanCommand(params);
        const result = await docClient.send(command);
        console.log('Images processed today result:', result);

        // Sum up all processCount values
        const totalProcessed = result.Items.reduce((sum, item) => sum + (item.processCount || 1), 0);

        return totalProcessed;
    } catch (error) {
        console.error('Error fetching today\'s processed images count:', error);
        throw error;
    }
};

const getAdminStats = async () => {
    console.log('Fetching admin stats');
    try {
        const usersResult = await getAllUsers();
        console.log('Users result:', usersResult);

        const todayImagesResult = await getImagesProcessedToday();
        console.log('Today images result:', todayImagesResult);

        const totalImagesProcessed = usersResult.reduce((sum, user) => sum + (user.imagesProcessed || 0), 0);
        const totalUsers = usersResult.length;

        return {
            totalImagesProcessed,
            totalUsers,
            imagesProcessedToday: todayImagesResult
        };
    } catch (error) {
        console.error('Error in getAdminStats:', error);
        throw error;
    }
};

module.exports = {
    getUser,
    createUser,
    updateUserImagesProcessed,
    saveImageMetadata,
    getAdminStats,
    getAllUsers
};
