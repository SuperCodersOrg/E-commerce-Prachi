const express=require('express');
const jwt = require('jsonwebtoken');
const router=express.Router();

const path = require('path');
const fs  = require('fs');

const crypto = require('crypto');

const razorpay = require("../config/razorpay");

const Order = require("../Modles/order.js");

const auth=require('router');

const verifyToken = require('../middleware/middleware.js');
// const { json } = require('stream/consumers');

router.use('/auth',auth);

const Products = require('../Modles/products.js');
const addToCart = require('../Modles/addToCart.js');
const { default: mongoose } = require('mongoose');
router.use( verifyToken);
const UserAddress = require('../Modles/address.js');
// const products = require('../Modles/products.js');

const User = require('../Modles/user.js');

const DISCOUNT_RULES = {
    basic:   { percent: 5,  minAmount: 20000 },
    premium: { percent: 10, minAmount: 35000 }
};

const limit = 5;

router.get('/',async (req,res)=>{
    console.log("Oder is ", Order);

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
    res.render('productDetails',{ product ,
        isLogin: Boolean(req.user && req.user.userId)
    });
    console.log("ADD TO CART ROUTE REACHED");
});



function getUserId(req) {
    return req.user && req.user.userId ? req.user.userId : null;
}

router.get('/cart', async (req, res) => {
    try {
        const userId = getUserId(req);
        let cartItems = [];

        if (userId) {
            cartItems = await addToCart.find({ user: userId }).populate('products');
        }

        return res.render('cartDetails', {
            cartItems,
            isLogin: Boolean(userId)
        });
    } catch (err) {
        console.error('Cart page error:', err);
        return res.status(500).send('Unable to load your cart');
    }
});

router.get('/cart/confirm', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        return res.redirect('/auth/login?next=checkout');
    }

    try {
        const cartItems = await addToCart.find({ user: userId }).populate('products');

        const invalid =
            cartItems.length === 0 ||
            cartItems.some(i => !i.products || i.products.stock < 1 || i.quantity > i.products.stock);

        if (invalid) {
            return res.redirect('/home/cart');
        }

        return res.render('addressForm');
    } catch (err) {
        console.error('Confirm page error:', err);
        return res.status(500).send('Unable to open the address form');
    }
});


router.post('/cart/guest-details', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid data.' });
        }

        const validIds = [...new Set(ids)]
            .filter(id => mongoose.isValidObjectId(id))
            .slice(0, 100);

        const products = await Products.find({ _id: { $in: validIds } })
            .select('name price image stock');

        return res.json({ success: true, products });
    } catch (err) {
        console.error('Guest details error:', err);
        return res.status(500).json({ success: false, message: 'Unable to load cart items.' });
    }
});


router.post('/cart/merge', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please sign in.' });
        }

        const { cart } = req.body;
        if (!Array.isArray(cart)) {
            return res.status(400).json({ success: false, message: 'Invalid cart data.' });
        }

        // 1) validate + total quantity per product
        const quantities = new Map();
        for (const item of cart) {
            if (
                !item ||
                !mongoose.isValidObjectId(item.productId) ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity < 1
            ) {
                return res.status(400).json({ success: false, message: 'Invalid product ID or quantity.' });
            }
            quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
        }

        // 2) check stock and save (quantity is capped at the available stock)
        const notes = [];
        for (const [productId, guestQuantity] of quantities) {
            const product = await Products.findById(productId);

            if (!product) continue;               // product was deleted
            if (product.stock < 1) {
                notes.push(`${product.name} is out of stock and was not added.`);
                continue;
            }

            const existing = await addToCart.findOne({ user: userId, products: product._id });
            const wanted = (existing ? existing.quantity : 0) + guestQuantity;
            const finalQuantity = Math.min(wanted, product.stock);

            if (finalQuantity < wanted) {
                notes.push(`Only ${product.stock} of ${product.name} available.`);
            }

            await addToCart.findOneAndUpdate(
                { user: userId, products: product._id },
                { $set: { quantity: finalQuantity } },
                { upsert: true, new: true, runValidators: true }
            );
        }

        return res.json({ success: true, message: 'Guest cart synced.', notes });
    } catch (err) {
        console.error('Cart merge error:', err);
        return res.status(500).json({ success: false, message: 'Unable to merge cart.' });
    }
});


router.post('/cart/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                userNotLogin: true,
                message: 'Please log in to save your cart.'
            });
        }

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID.' });
        }

        const quantity = req.body.quantity ?? 1;
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Invalid quantity.' });
        }

        const product = await Products.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        if (product.stock < 1) {
            return res.status(400).json({ success: false, message: 'Out of stock.' });
        }

        const existingItem = await addToCart.findOne({ user: userId, products: product._id });
        const newQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

        if (newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} item(s) available in stock.`
            });
        }

        if (existingItem) {
            existingItem.quantity = newQuantity;
            await existingItem.save();
        } else {
            await addToCart.create({ user: userId, products: product._id, quantity });
        }

        return res.status(200).json({
            success: true,
            message: 'Product added to cart.',
            quantity: newQuantity
        });
    } catch (err) {
        console.error('Add to cart route error:', err);
        return res.status(500).json({ success: false, message: 'Unable to add product to cart.' });
    }
});


router.patch('/cart/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, userNotLogin: true, message: 'Please log in.' });
        }

        const { id } = req.params;
        const { quantity } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID.' });
        }
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Invalid quantity.' });
        }

        const product = await Products.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        if (product.stock < 1) {
            return res.status(400).json({ success: false, message: 'Out of stock.' });
        }
        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} item(s) available in stock.`
            });
        }

        const item = await addToCart.findOneAndUpdate(
            { user: userId, products: product._id },
            { $set: { quantity } },
            { new: true }
        );
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item is not in your cart.' });
        }

        return res.json({ success: true, quantity: item.quantity });
    } catch (err) {
        console.error('Update cart error:', err);
        return res.status(500).json({ success: false, message: 'Unable to update cart.' });
    }
});


router.delete('/cart/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, userNotLogin: true, message: 'Please log in.' });
        }

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID.' });
        }

        await addToCart.deleteOne({ user: userId, products: id });
        return res.json({ success: true, message: 'Item removed.' });
    } catch (err) {
        console.error('Remove cart item error:', err);
        return res.status(500).json({ success: false, message: 'Unable to remove item.' });
    }
});


router.post('/address',async(req,res)=>{

    razorpayKey: process.env.RAZORPAY_API_KEY;

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

        if(!Number.isSafeInteger(Math.round(total * 100))){//
              return res.status(400).send(
                "Invalid order amount"
            );
        } 

        const subtotal = total;
        let discountPercent = 0;
        let discountAmount = 0;

        const buyer = await User.findById(userId)
            .select('subscriptionPlan subscriptionEndDate membershipDiscountUsed');
        const rule = buyer && DISCOUNT_RULES[buyer.subscriptionPlan];

        if (
            rule &&
            buyer.subscriptionEndDate > new Date() &&
            !buyer.membershipDiscountUsed &&
            subtotal > rule.minAmount
        ) {
            discountPercent = rule.percent;
            discountAmount = Math.round(subtotal * rule.percent) / 100;
        }

        const finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;

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
            subtotal,
            discountPercent,
            discountAmount,
            totalAmount: finalTotal,
            currency: 'INR',
            paymentStatus: "pending",
            orderStatus: "pending"
        });

        return res.render('bill', {
            orderItems,
            subtotal,
            discountPercent,
            discountAmount,
            total: finalTotal,
            internalOrderId: saveOrder._id.toString(),
            razorpayKey: process.env.RAZORPAY_API_KEY
        });
        
})


router.post('/payment/create',async(req,res)=>{

   try{

    key: process.env.RAZORPAY_API_KEY;

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
    const order = await Order.findOne({
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

        if(order.discountAmount > 0){
            const buyer = await User.findById(req.user.serId).select('membershipDiscountUsed');
            if(buyer && buyer.membershipDiscountUsed){
                return res.status(404).json({
                    success: false,
                    message: 'Your membership discount was already'
                })
            }
        }

        const amountInPaise = Math.round(order.totalAmount * 100);


        if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment amount'
            });
        }


        if(order.razorpayOrderId){
            return res.json({
                success: true,
                key: process.env.RAZORPAY_API_KEY,
                orderId: order.razorpayOrderId,
                amount: amountInPaise,
                currency: order.currency
            })
        }

        const razorpayOrder  = await razorpay.orders.create({
            amount: amountInPaise,
            currency: order.currency,
            receipt : order._id.toString()
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();


        // const amountInPaise = Math.round( Math.round(order.totalAmount * 100 ))

        return res.status(200).json({
            success: true,
            key: process.env.RAZORPAY_API_KEY,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency
        });
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
    const order = await Order.findOne({
            _id: internalOrderId,
            user: req.user.userId
        });

         if (!order || !order.razorpayOrderId) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }


        if(order.razorpayOrderId != razorpay_order_id){
            return res.status(400).json({
                success: false,
                message: 'Razorpay order ID mismatch'
            });
        }


        const expectedSignature = crypto 
        .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
        .update(`${order.razorpayOrderId}|${razorpay_payment_id}`)
        .digest('hex');


        const expectedBuffer = Buffer.from(expectedSignature,'hex');
        const receivedBuffer = Buffer.from(razorpay_signature,'hex');

        if(!/^[a-f0-9]{64}$/i.test(razorpay_signature)|| expectedBuffer.length != receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)){
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

    
         const expectedAmount = Math.round(
            order.totalAmount * 100
        );

        if( payment.order_id !== order.razorpayOrderId  || payment.currency !== order.currency || payment.amount !== expectedAmount){

            
            return res.status(400).json({
                success: false,
                message: "Payment details do not match the order"
            });
        }

        if(payment.status != 'captured'){
            return res.status(400).json({
                success: false,
                message: "Payment has not been captured"
            });
        }

        const updatedOrder  = await Order.findOneAndUpdate( { _id: order._id,
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
            const latestOrder  = await Order.findById(order._id);

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

            if(updatedOrder.discountAmount > 0){
                await User.updateOne(
                    { _id: req.user.userId },
                    {$set: {membershipDiscountUsed: true}}
                ); 
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


router.get('/payment/success/:id',async(req,res)=>{
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

          console.error("Order confirmation error:", err);

        return res.status(500).send(
            "Unable to display order confirmation"
        );

    }
})



module.exports = router;
