const express=require('express');
const jwt = require('jsonwebtoken');
const router=express.Router();

const path = require('path');
const fs  = require('fs');

const auth=require('router');

const verifyToken = require('../middleware/middleware.js');
const { json } = require('stream/consumers');

router.use('/auth',auth);


// router.use('view engine','ejs');

router.use( verifyToken);

router.get('/',(req,res)=>{

    const file = fs.readFileSync(path.join(__dirname,'..','data','/products.json'));
    console.log(__dirname);
    const fileData = JSON.parse(file);

    console.log(fileData);
    console.log("udu");
    
    res.render('home',{fileData});
})

router.get('/products/:id',(req,res)=>{
    const file = fs.readFileSync(path.join(__dirname,'..','data','/products.json'));
    const fileData = JSON.parse(file); 
    
   const product = fileData.find((image)=>image.id == req.params.id)
    console.log(product);
    res.render('productDetails',{ product });
})

module.exports = router;