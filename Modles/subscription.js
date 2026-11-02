const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    plan:{

        type: String,
        enum: ["basic", "premium"],
        default : "premium"

    },
    razorpaySubscriptionId:{

        type: String,
        required: true,
        unique: true

    },
    razorpayPaymentId: { type: String},
    status:{

        type: String,
        enum: [
            "created",
            "authenticated",
            "active",
            "halted",
            "cancelled",
            "completed",
            "expired"
        ],
            default: "created",
    },
    startDate: Date,
    endDate: Date,

},
{
    timestamps: true
})

module.exports = mongoose.model('subscription',subscriptionSchema);