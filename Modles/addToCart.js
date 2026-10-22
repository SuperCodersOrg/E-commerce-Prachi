const mongoose = require('mongoose');
const products = require('./products');
const addToCart = new mongoose.schema({
    user: { ref: User},
    products: { ref: products},
    quantity: ,
    productId:
})

modules.exports = mongoose.model("addToCart",addToCart);