const mongoose = require('mongoose');

async function connectToDatabase() {
    try {
        // Correct the MongoDB URI to match the Docker network setup
        const mongoURI = process.env.MONGODB_URI || "mongodb://image-classifier-mongo:27017/image_processor";

        // Connect to MongoDB using the connection URI
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        // Check if the User model is defined before querying
        if (mongoose.models.User) {
            const User = mongoose.model('User');

            // Attempt to find a user with the username 'admin1'
            const testUser = await User.findOne({ username: 'admin1' });
            if (testUser) {
                console.log('Test user found:', testUser.username);
            } else {
                console.log('Test user not found. This might indicate a problem with the database connection or data.');
            }
        } else {
            console.log('User model is not defined. Make sure it is properly imported or defined before calling this function.');
        }

    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1); // Exit the process if connection fails
    }
}

module.exports = { connectToDatabase };
