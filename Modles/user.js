const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            
        },
        email: {
            type: String,
            required: true,
            unique: true
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
       
    },
     { 
            timestamps: true 
        }
);

module.exports=mongoose.model("user",userSchema);