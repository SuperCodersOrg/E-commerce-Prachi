const mongoose = require('mongoose');
const products = require('./products');
const User = require('./user');
const addToCart = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true

    },
    quantity: {
        type: Number,
        default : 1,
        required: true
    },
       
})

module.exports = mongoose.model("addToCart",addToCart);