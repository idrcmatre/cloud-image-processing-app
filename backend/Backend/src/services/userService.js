const cacheService = require('./cachingService');
const dynamoDBService = require('./dynamoDBService'); // Assuming you have this

class UserService {
    async getUser(userId) {
        const cacheKey = `user:${userId}`;

        // Try to get from cache
        let userData = await cacheService.get(cacheKey);

        if (!userData) {
            console.log("Cache miss for user data, fetching from database");
            // If not in cache, get from database
            userData = await dynamoDBService.getUser(userId);

            // Store in cache for future requests
            if (userData) {
                await cacheService.set(cacheKey, userData, 300); // Cache for 5 minutes
            }
        } else {
            console.log("Cache hit for user data");
            userData = JSON.parse(userData);
        }

        return userData;
    }

    async updateUser(userId, userData) {
        // Update in database
        await dynamoDBService.updateUser(userId, userData);

        // Update cache
        const cacheKey = `user:${userId}`;
        await cacheService.set(cacheKey, userData, 300);

        return userData;
    }
}

module.exports = UserService;