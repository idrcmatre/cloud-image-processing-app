const isAdmin = async (req, res, next) => {
    console.log('Checking admin status');
    if (!req.user) {
        console.log('No user found in request');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('User found:', req.user);
    const groups = req.user['cognito:groups'] || [];
    console.log('User groups:', groups);
    if (groups.includes('Admin')) {
        console.log('User is admin');
        next();
    } else {
        console.log('User is not admin');
        res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
};

module.exports = { isAdmin };