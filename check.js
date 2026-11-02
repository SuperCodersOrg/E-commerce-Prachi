require('dotenv').config();
const id = process.env.RAZORPAY_API_KEY || '';
const secret = process.env.RAZORPAY_SECRET_KEY || '';
console.log('key id starts with:', id.slice(0, 9), '| length:', id.length);
console.log('secret length:', secret.length);