const mongoose = require('mongoose');
const connectDb = async ()=>{
try{
    
    await mongoose.connect(process.env.MONGODB_URL );
    console.log("momnggodb connected");
}
catch(err){
    console.log("error is: ", err.name);
    console.log(err.message);
}

}
module.exports = connectDb;