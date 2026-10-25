const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
        
    },
    size: {
        type: String,
        required: true,
    },
    stock:{
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,

    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        type: String,
        required: true
    },
    ratings:{
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    brand: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
    }

},
{
    timestamps: true
})

module.exports = mongoose.model('Products',productSchema);