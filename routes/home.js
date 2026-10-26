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
const addToCart = require('../Modles/addToCart.js');
const { default: mongoose } = require('mongoose');
router.use( verifyToken);
const UserAddress = require('../Modles/address.js');

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
                nextCursor,
                
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
             return res.send("Unable to load productsd");
    }
})
   

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
    console.log("ADD TO CART ROUTE REACHED");
});

router.get('/cart', async(req,res)=>{
    if(!req.user){
        console.log("yes it exists");
        return res.redirect('/auth/login');
    }
    console.log("noo");
    const userId = req.user.userId;

    const cartItems = await addToCart .find({user : userId}).populate('products');

     if (cartItems.length === 0) {
            return res.status(400).send('Your cart is empty');
        }

    return res.render('cartDetails', { cartItems });
})

router.get('/cart/confirm', async(req,res)=>{

     if(!req.user){
        console.log("yes it exists");
        return res.redirect('/auth/login');
    }

    const userId = req.user.userId;
    const cartItems = await addToCart.find({ user: userId}).populate('products');

    if(!cartItems.length) return  res.status(400).send('Your cart is empty');

    if (cartItems.length === 0) {
            return res.status(400).send('Your cart is empty');
        }

    return res.render('addressForm', { cartItems });

})


router.post('/cart/:id', verifyToken,async (req,res,next)=>{
    console.log("ADD TO CART ROUTE REACHED");

    let { id }  = req.params;
    console.log("item selected",id);

    if(!mongoose.isValidObjectId(id)){
        return res.status(404).json({
            message: "Invalid product Id"
        });
    }

    const Product = await Products.findById(id);
    
    if(!Product){
        return res.status(404).send("Cart is Empty!");
    }

    console.log("product is",Product._id);

    const user = req.user;

    if(!req.user){  
        
        // console.log(req.user);
         
        // return res.render('login');

        return res.status(401).json({
        userNotLogin: true,
        message: 'Please log in to save your cart'
    });

    }
    const userId = req.user.userId; 
    
    const existingItem = await addToCart.findOne({
    user: userId,
    products: Product._id
   })

   if(existingItem){
    if(existingItem.quantity >= Product.stock){
        return res.status(400).json({message: 'Available limit reach'});
    }
    existingItem.quantity += 1;
    await existingItem.save();
   }

   else{
    if(Product.stock < 1){
        return res.status(400).json({message: 'Product out of stock'});
        }

      await addToCart.create({ 
        
        user: userId,
        products:  Product._id,
        quantity: 1
        }); 
   }
        console.log("product selected is: ",Product);
        return res.redirect('/home/cart');

});

router.post('/address',async(req,res)=>{
    if(!req.user){
        console.log("yes it exists");
        return res.redirect('/auth/login');
    }
    const userId = req.user.userId;
    const { receiverName,
        contact,
        landmark,
        city,
        state,
        pincode
    } = req.body;

    if(!receiverName || !contact || !landmark || !city|| !state||  !pincode){
           return res.status(400).send(
                'Please fill all required address fields'
            )

    }

    const cartItems = await addToCart.find({user : userId}).populate('products');

     if (!cartItems.length) {
            return res.status(400).send('Your cart is empty');
        }

          if (cartItems.length === 0) {
            return res.status(400).send('Your cart is empty');
        }

    const orderItems = [];
        let total = 0;

        for(const item of cartItems){
            if(!item.products){
                return res.status(400).send(
                    'A product in your cart no longer exists'
                );
            }
            if(item.products.stock < 1 || item.quantity > item.products.stock){
                return res.status(400).send( `Insufficient stock for ${item.products.name}`
                );

            }
            const price =  item.products.price;

            orderItems.push({
                product: item.products._id,
                name: item.products.name,
                price:  price,
                quantity: item.quantity,
                image: item.products.image,
            })
            total += price * item.quantity;
        }

        const address = await UserAddress.create({
            user: userId,
            receiverName,
            contact,
            landmark,
            city,
            state,
            pincode
        });

        return res.render('bill', {
            address,
            orderItems,
            total,
            paymentStatus: 'Payment not completed'
        });
        
})

module.exports = router;
