const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    address:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAddress',
        required: true
    },
    items: 
        [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                         ref: 'Products',
                    required: true
                },
                name: {
                    type: String,
                    required: true
                },
                price: {
                    type: Number,
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true
                },
                image: String
            }
        ],
    
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
     currency: {
            type: String,
            default: "INR"
        },
    razorpayOrderId:{
        type:String,
        default: null
    },
    razorpayPaymentId: {
            type: String,
            default: null
        },

      razorpaySignature: {
            type: String,
            default: null
        },
          paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending"
        },
         orderStatus: {
            type: String,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);
module.exports  = mongoose.model("Order", orderSchema); 