const express=require('express');
const app=express();
const port = 2700;

const cors = require('cors');

const cookie = require('cookie-parser');

const jwt=require('jsonwebtoken');

const fs=require('fs');
const path=require('path');

const adminRouter = require("./routes/admin.js");
const authRoutes=require("./routes/auth.js");
const homeRoutes = require("./routes/home.js");

const User = require('./Modles/user.js');

require('dotenv').config();

const connectDb = require('./config/db.js');
const razorpay = require('./config/razorpay');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.set('view engine','ejs');


 connectDb();

app.get('/',(req,res)=>{
res.render('index');
})

app.use(cookie());
app.use("/admin", adminRouter);
app.use('/auth',authRoutes);
app.use('/home',homeRoutes);
// app.use('/home', require('./routes/home.js'));

app.listen(port,()=>{
    console.log("server is on load!");
})