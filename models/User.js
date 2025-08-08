const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    resetToken: String,
    resetTokenExpires: Date,
    // Campos para MFA (Multi-Factor Authentication)
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String,
        default: null
    },
    mfaBackupCodes: [{
        code: String,
        used: { type: Boolean, default: false }
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);