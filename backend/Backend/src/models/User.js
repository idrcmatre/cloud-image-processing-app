const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['standard', 'premium', 'admin'], default: 'standard' },
    imagesProcessed: { type: Number, default: 0 },
    dailyLimit: { type: Number },
    settings: {
        enhancementLevel: { type: Number, default: 1 },
        preferredAnalysis: { type: String, enum: ['color', 'object', 'both'], default: 'both' }
    }
});

userSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('role')) {
        switch (this.role) {
            case 'standard':
                this.dailyLimit = 10;
                break;
            case 'premium':
                this.dailyLimit = 50;
                break;
            case 'admin':
                this.dailyLimit = 100;
                break;
            default:
                this.dailyLimit = 10;
        }
    }
    next();
});

module.exports = mongoose.model('User', userSchema);