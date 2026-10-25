const mongoose = require('mongoose');

const User  = require('./user');
const address = new mongoose.Schema({
        User: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        receiverName:{
            type: String,
            required: true
        },
        contact: {
            type: String,
            required: true,
        },
        landmark:{
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true,
        },
        state:{
            type: String,
            required: true
        },
        pincode:{
            type: String,
            required: true
        }
},
  { 
    timestamps: true 
  }
);

module.exports = mongoose.model("UserAddress", address);