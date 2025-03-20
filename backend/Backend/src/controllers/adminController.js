const { getAdminStats, getAllUsers } = require('../services/dynamoDBService');

exports.getAdminStats = async (req, res) => {
    console.log('Getting admin stats');
    try {
        const stats = await getAdminStats();
        console.log('Admin stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({
            error: 'Failed to fetch admin statistics',
            details: error.message,
            stack: error.stack
        });
    }
};

exports.getAllUsers = async (req, res) => {
    console.log('Getting all users');
    try {
        const users = await getAllUsers();
        console.log('Users:', users);
        res.json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({
            error: 'Failed to fetch user list',
            details: error.message,
            stack: error.stack
        });
    }
};