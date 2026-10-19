const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,

    },
    email: {
        type: String,
        required: true,
        unique: [true, "Email is not registered"],
        lowercase: true,
        trim: true, 
    },
    password: {
        type: String,
        required: true,
        
    }
})