const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/protected', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        message: 'You have access to this protected route',
        user: req.user,
    });
});

router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully. Clear the token on the client.' });
});

module.exports = router;