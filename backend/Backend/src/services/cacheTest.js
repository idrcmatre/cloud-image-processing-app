require('dotenv').config();
const UserService = require('./userService');

async function testCaching() {
    const userService = new UserService();
    const userId = "testUser123";

    try {
        console.log("First request (should be a cache miss):");
        console.time("First request");
        const user1 = await userService.getUser(userId);
        console.timeEnd("First request");
        console.log(user1);

        console.log("\nSecond request (should be a cache hit):");
        console.time("Second request");
        const user2 = await userService.getUser(userId);
        console.timeEnd("Second request");
        console.log(user2);

        console.log("\nUpdating user:");
        const updatedUser = { ...user2, name: "Updated Name" };
        await userService.updateUser(userId, updatedUser);

        console.log("\nThird request after update (should be a cache hit with updated data):");
        console.time("Third request");
        const user3 = await userService.getUser(userId);
        console.timeEnd("Third request");
        console.log(user3);
    } catch (error) {
        console.error("Error during test:", error);
        if (error.code === 'ETIMEDOUT') {
            console.error("ElastiCache connection timed out. Check your security group settings and network configuration.");
        }
        if (error.$metadata && error.$metadata.httpStatusCode === 400) {
            console.error("DynamoDB authentication failed. Ensure your AWS credentials are correctly set in the .env file.");
        }
    }
}

testCaching().catch(console.error);