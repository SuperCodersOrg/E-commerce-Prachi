const mongoose = require('mongoose');
const products = require('./products');
const User = require('./user');
const addToCart = new mongoose.schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: user
    },
    products: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: Products
    },
    quantity: {
        type: Number,
        default : 1,
    },
       
})

modules.exports = mongoose.model("addToCart",addToCart);