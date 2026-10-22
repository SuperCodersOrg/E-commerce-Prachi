const express=require('express');
const jwt = require('jsonwebtoken');
const router=express.Router();

const path = require('path');
const fs  = require('fs');

const auth=require('router');

const verifyToken = require('../middleware/middleware.js');
const { json } = require('stream/consumers');

router.use('/auth',auth);

const Products = require('../Modles/products.js');
const { default: mongoose } = require('mongoose');
router.use( verifyToken);

const limit = 5;

router.get('/',async (req,res)=>{

console.log("try catch");
    try{
    
    const { lastId } = req.query;
    console.log("last id",lastId);
    const query = {};
    

    if(lastId){
        if(!mongoose.isValidObjectId(lastId)){
           return res.status(404).send("Products are not present");
        }

        query._id = {
            $gt : new mongoose.Types.ObjectId(lastId)

        }
        }
        const products = await Products.find(query).limit(limit + 1);
        console.log();
        if(!products){
            return res.send("products are not vailabe");
        }

        const hasMore = products.length > limit;

        const fileData = products.slice(0,limit);

        const nextCursor = fileData.length ? fileData[fileData.length - 1]._id.toString(): null  ; 

    
        if(!lastId){
            return res.render('home',{
                fileData,
                hasMore,
                nextCursor
            })
        }
    

       return res.json({
        products: fileData,
        hasMore,
        nextCursor
       });
    
    }
    catch(err){
        console.log("rrror occured");
             console.log(err);
             return res.send("Can't lssd");
    }
})


//     catch(error){
//         console.log(error);
//         if(req.query.lastId){
//             return res.status(500).json({message: 'Unable to load more products'})
//         }

//         res.status(500).send('Unable to load products');

// )
// }        

router.get('/products/:id',async(req,res)=>{

    const { id } = req.params;

    
     if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send('Invalid product ID');
        }

    const product = await Products.findById(id);

    if(!product){
        return res.status(404).send('Product not found');
    }
    console.log(product);
    res.render('productDetails',{ product });
})

module.exports = router;