const { getUser, updateUserSettings, getUserImageMetadata } = require('../services/dynamoDBService');

exports.getUserInfo = async (req, res) => {
    try {
        const user = await getUser(req.user.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Remove sensitive information before sending
        const { password, ...userInfo } = user;
        
        res.json(userInfo);
    } catch (error) {
        console.error('Error fetching user information:', error);
        res.status(500).json({ error: 'Failed to fetch user information' });
    }
};

exports.updateUserSettings = async (req, res) => {
    try {
        const { enhancementLevel, preferredAnalysis } = req.body;
        const updatedUser = await updateUserSettings(req.user.username, { enhancementLevel, preferredAnalysis });
        
        res.json({ message: 'Settings updated successfully', settings: updatedUser.settings });
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: 'Failed to update user settings' });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const user = await getUser(req.user.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userImages = await getUserImageMetadata(req.user.username);
        
        const stats = {
            totalImagesProcessed: user.imagesProcessed,
            imagesProcessedToday: userImages.filter(img => {
                const imgDate = new Date(img.processedAt);
                const today = new Date();
                return imgDate.toDateString() === today.toDateString();
            }).length,
            remainingDailyLimit: user.dailyLimit - user.imagesProcessed,
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
};
