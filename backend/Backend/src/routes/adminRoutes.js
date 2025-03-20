const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { getAllUsers, getAdminStats } = require('../controllers/adminController');
const { getAvgProcessingTimes } = require('../services/postgresService');

console.log('Registering admin routes');

router.get('/stats', isAuthenticated, isAdmin, (req, res, next) => {
    console.log('Admin stats route hit');
    getAdminStats(req, res, next);
});

router.get('/users', isAuthenticated, isAdmin, (req, res, next) => {
    console.log('Admin users route hit');
    getAllUsers(req, res, next);
});

router.get('/avg-processing-times', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const avgTimes = await getAvgProcessingTimes();
        res.json(avgTimes);
    } catch (error) {
        console.error('Error fetching average processing times:', error);
        res.status(500).json({ error: 'Failed to fetch average processing times' });
    }
});

module.exports = router;