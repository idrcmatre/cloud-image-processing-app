const mongoose = require('mongoose');

// Define your User model (you might need to adjust the path to your actual model file)
const User = require('./src/models/User'); // Adjust the path as needed

// Define your MongoDB URI
const MONGODB_URI = "mongodb://localhost:27017/image_processor";
// Connect to MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');

    try {
      // Attempt to find the user "admin1"
      const user = await User.findOne({ username: 'admin1' });
      console.log('User found:', user);
    } catch (err) {
      console.error('Error fetching user:', err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => console.error('Connection error:', err));
