const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            unique: true
        },
        token: {
            type: String,
            default: undefined

        },
        expiryTime: {
            type: Date,
            default: Date.now(),
        },
        subscriptionPlan: {
            type: String,
            enum: ['none', 'basic', 'premium'],
            default: 'none'
        },
        subscriptionEndDate: {
            type: Date
        },
        membershipDiscountUsed: {
            type: Boolean,
            default: false
},
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("user", userSchema);