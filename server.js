const express=require('express');
const app=express();
const port = 2700;
const cookie = require('cookie-parser');
const cors = require('cors');

require('dotenv').config();



const jwt=require('jsonwebtoken');

const fs=require('fs');
const path=require('path');

const adminRouter = require("./routes/admin.js");
const authRoutes=require("./routes/auth.js");
const homeRoutes = require("./routes/home.js");
const profileRoutes = require('./routes/profile.js');

const User = require('./Modles/user.js');

const connectDb = require('./config/db.js');
const razorpay = require('./config/razorpay');

app.set('view engine','ejs');
app.use(cookie());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));



const subscriptionRoutes = require('./routes/subscription');

 connectDb();

app.get('/',(req,res)=>{
res.render('index');
})

app.use('/subscription', subscriptionRoutes); 
app.use("/admin", adminRouter);
app.use('/auth',authRoutes);
app.use('/home',homeRoutes);
app.use('/profile', profileRoutes);
// app.use('/home', require('./routes/home.js'));

app.listen(port,()=>{
    console.log("server is on load!");
})