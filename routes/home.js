const express=require('express');
const jwt = require('jsonwebtoken');
const router=express.Router();

const path = require('path');
const fs  = require('fs');

const razorpay = require("../config/razorpay");

const auth=require('router');

const verifyToken = require('../middleware/middleware.js');
const { json } = require('stream/consumers');

router.use('/auth',auth);

const Products = require('../Modles/products.js');
const addToCart = require('../Modles/addToCart.js');
const { default: mongoose } = require('mongoose');
router.use( verifyToken);
const UserAddress = require('../Modles/address.js');
const products = require('../Modles/products.js');

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
    
        if(!lastId){
        return res.render("home",{
            fileData,
            hasMore,
            nextCursor,
            isLogin: Boolean(req.user && req.user.userId)
        });
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

router.post('/cart/merge', async (req,res)=>{

    try{
        if(!req.user || !req.user.userId){
            return res.status(401).json({
                message: "plaese signin "
            });
        }

        const userId = req.user.userId;
        const cart = req.body.cart;

        if(!Array.isArray(cart)){
            return res.status(400).json({
                message: "Invalid cart data"

            });
            
        }

        for(const item of cart){
            if(!item || !mongoose.isValidObjectId(item.product) || !Number.isInteger(item.quantity) || item.quantity < 1){
                 return res.status(400).json({
                    message: "Invalid product ID or quantity"
                });
            }
            const product = await Product.findById(item.productId);
            if(!product){
                return res.status(400).json({
                    message: "A product in your cart no longer exists"
                });
            }
        } 
        const existingItem = await addToCart.findOne({
            user: userId,
            products: product._id
        });

        const finalQuntity = (existingItem ? existingItem.quantity: 0) + item.quantity;

        if(finalQuantity > product.stock){
            return res.status(400).json({
                    message: `Not enough stock for ${product.name}`
                });
        }

        for(const item of cart){
            const product = await Products.findById(item.productId);
            const existingItem = await addToCart.findOne({
                user: userId,
                products: product._id,
            });

            if(existingItem){
               
                existingItem.quantity += item.quantity;
                await existingItem.save();
            }
            else{
              
                await addToCart.create({
                    user: userId,
                    products: products._id,
                    quantity: item.quantity
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Product added to cart"
        });
    }
catch(err){

console.log(err);
return res.status(500).json({message: "Unable to add product"});

}
});

router.post('/cart/:id', verifyToken,async (req,res,next)=>{
    console.log("ADD TO CART ROUTE REACHED");

try{
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

    if(!req.user || !req.user.userId){  
        
        console.log("product to be stored",req.body);

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
    if(existingItem.quantity +1 > Product.stock){
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
        // console.log("product selected is: ",Product);
        // return res.redirect('/home/cart');

        return res.json({
            success: true,
            message: "Product added to cart"
        });
     
    }
    catch(err){
        console.log(err);
         return res.status(500).json({
            message: "Unable to add product"
        });
    }

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
        total = Math.round(total * 100) / 100;

        if(!Number.isSafeInteger(Math.round(total * 100))){
              return res.status(400).send(
                "Invalid order amount"
            );
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

        const saveOrder = await Order.create({
            user: userId,
            address: address._id,
            items: orderItems,
            totalAmount: total,
            currency: "INR",
            paymentStatus: "pending",
            orderStatus: "pending"
        })

        return res.render('bill', {
            address,
            orderItems,
            total,
            internalPrderId: savedOrder._id.toString(),

            paymentStatus: 'Payment not completed'
        });
        
})

router.get('/payment/creater',async(req,res)=>{

   try{
    if(!req.user || !req.user.userId){
        return res.status(401).json({
            success: false,
            message: "Please log in first"
        });
    }

    const { internalOrderId } = req.body;
    if(!mongoose.isValidObjectId(internalOrderId)){

        return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });

    }
    const order = await Order.findIne({
        _id : internalOrderId,
        user: req.user.userId

    })

    if(!order){
        return res.status(404).json({
                success: false,
                message: "Order not found"
            });
    }

        if (order.paymentStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: "This order is not awaiting payment"
            });
        }
        if(order.razorpayOrderId){
            return res.json({
                success: true,
                key: process.env.RAZORPAY_KEY_ID,
                orderId: order.razorpayOrderId,
                amount: Math.round(order.totalAmount * 100),
                currency: order.currency

            })
        }

                if (
            !Number.isSafeInteger(amountInPaise) ||
            amountInPaise <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount"
            });
        }

        const razorpay = await razorpay.orders.create({
            amount: amountInPaise,
            currency: order.currency,
            receipt : order._id.toString()
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();


        const amountInPaise = Math.round( Math.round(order.totalAmount * 100 ))

        return res.status(200).json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            orderId: razorpayOrder.id,
            amount: razorpay.amount,
            currency: razorpayOrder.currency
        })
   }
   catch(error){
    console.error("Razorpay order creation error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Unable to initiate payment"
        });
   }
});

router.post('/payment/verify',async(req,res)=>{
    try{
          if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first"
            });
        }
        const {internalOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature}= req.body;

        if(!mongoose.isValidObjectId(internalOrderId) || typeof razorpay_payment_id !== "string" || typeof razorpay_order_id !== "string" || typeof razorpay_signature !== "string"){
            return res.status(400).json({
                success: false,
                message: "Invalid payment details"
        });
    }
    const order = await Order.findOne({_id: internalOrderId,
            user: req.user.userId})   ;
         if (!order || !order.razorpayOrderId) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }


        if(order.paymentStatus === "paid"){
         if( order.razorpayPaymentId === razorpay_payment_id && order.razorpayOrderId === razorpay_order_id){

            return res.json({
                    success: true,
                    message: "Payment already verified",
                    orderId: order._id
                });

         }
  
            return res.status(409).json({
                success: false,
                message: "Order has already been paid"
            });
        }

        if(order.paymentStatus != "pending"){
            return res.status(400).json({
            success: false,
                message: "Order is not awaiting payment"
            });
        }

        const payment = await razorpay.payments.fetch(razorpay_payment_id);

         const expectedAmount = Math.round(
            order.totalAmount * 100
        );

        if( payment.order_id !== order.razorpayOrderId ||  payment.order_id !== order.razorpayOrderId  || payment.currency !== order.currency){

            
            return res.status(400).json({
                success: false,
                message: "Payment details do not match the order"
            });
        }
        if(payment.status != "captured"){
            return res.status(400).json({
                success: false,
                message: "Payment has not been captured"
            });
        }

        const updtaeOrder = await Order.indneAndUpdate( { _id: order._id,
                user: req.user.userId,
                paymentStatus: "pending",
                razorpayOrderId: razorpay_order_id
     },{
        $set: {
                    paymentStatus: "paid",
                    orderStatus: "processing",
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature
        }
    },
        { new: true }
        );

         if (!updatedOrder) {
            const latestOrder = await Order.findById(order._id);

             if (
                latestOrder &&
                latestOrder.paymentStatus === "paid" &&
                latestOrder.razorpayPaymentId === razorpay_payment_id
            ) {
                return res.json({
                    success: true,
                    message: "Payment already verified",
                    orderId: latestOrder._id
                });
            }
                 return res.status(409).json({
                success: false,
                message: "Order status changed; please check your order"
            });
            }

             await addToCart.deleteMany({
            user: req.user.userId
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            orderId: updatedOrder._id
        });


    }
    catch(error){
        console.log("verify error", error);
         return res.status(500).json({
            success: false,
            message: "Unable to verify payment"
        });
    }
});

router.get('/payment/success:id',async(req,res)=>{
    try {

        if (!req.user || !req.user.userId) {
            return res.redirect("/auth/login");
        }

        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user.userId,
            paymentStatus: "paid"
        }).populate("address");

        if (!order) {
            return res.status(404).send(
                "Confirmed order not found"
            );
        }

        return res.render("orderSuccess", { order });
    }
    catch(error){

          console.error("Order confirmation error:", err.message);

        return res.status(500).send(
            "Unable to display order confirmation"
        );

    }
})

module.exports = router;
