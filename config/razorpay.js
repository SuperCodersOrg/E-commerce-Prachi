const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RASORPAY_API_KEY,
    key_secret: process.env.RASOEPAY_SECRET_KEY,
});

module.exports = razorpay;
