require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const users = [
    {
        username: 'admin1',
        password: 'adminpass1', // In a real app, this should be hashed
        role: 'admin'
    },
    {
        username: 'premium1',
        password: 'premiumpass1', // In a real app, this should be hashed
        role: 'premium'
    },
    {
        username: 'standard1',
        password: 'standardpass1', // In a real app, this should be hashed
        role: 'standard'
    },
    {
        username: 'standard2',
        password: 'standardpass2', // In a real app, this should be hashed
        role: 'standard'
    }
];

async function createUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/image_processor");

        for (const userData of users) {
            const existingUser = await User.findOne({ username: userData.username });
            if (existingUser) {
                console.log(`User ${userData.username} already exists. Skipping.`);
                continue;
            }

            const newUser = new User(userData);
            await newUser.save();
            console.log(`User ${userData.username} (${userData.role}) created successfully`);
        }

    } catch (error) {
        console.error('Error creating users:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createUsers();