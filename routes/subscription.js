const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const razorpay = require('../config/razorpay');
const verifyToken = require('../middleware/middleware.js');
const Subscription = require('../Modles/subscription.js');
const User = require('../Modles/user.js');
router.use(verifyToken);

const PRICES = { basic: 299, premium: 599 };   // in rupees
const DURATION_DAYS = 30;

const getUserId = (req) => {
    const u = req.user;
    return (u && (u._id || u.id || u.userId)) || null;
};

const requireLoginPage = (req, res, next) => {
    if (!getUserId(req)) return res.redirect('/auth/login');
    next();
};

const requireLoginApi = (req, res, next) => {
    if (!getUserId(req)) {
        return res.status(401).json({ success: false, message: 'Please log in again' });
    }
    next();
};

router.get('/', requireLoginPage, (req, res) => {
    res.render('subscription', { razorpayKey: process.env.RAZORPAY_API_KEY });
});

router.get('/status', requireLoginPage, async (req, res) => {
    try {
        const sub = await Subscription
            .findOne({ user: getUserId(req) })
            .sort({ createdAt: -1 });

        if (sub && sub.status === 'active' && sub.endDate && sub.endDate < new Date()) {
            sub.status = 'expired';
            await sub.save();
        }

        res.render('subscription-status', { subscription: sub });
    } catch (error) {
        console.log(error);
        res.status(500).send('Unable to load subscription');
    }
});

router.post('/verify', requireLoginApi, async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment details' });
        }

        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        const valid =
            expected.length === razorpay_signature.length &&
            crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));

        if (!valid) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const sub = await Subscription.findOne({
            razorpaySubscriptionId: razorpay_order_id,   // we store the order id here
            user: getUserId(req)
        });

        if (!sub) {
            return res.status(404).json({ success: false, message: 'Membership order not found' });
        }

        const start = new Date();
        const end = new Date(start.getTime() + DURATION_DAYS * 24 * 60 * 60 * 1000);

        sub.razorpayPaymentId = razorpay_payment_id;
        sub.status = 'active';
        sub.startDate = start;
        sub.endDate = end;
        await sub.save();

        await User.findByIdAndUpdate(getUserId(req), {
    subscriptionPlan: sub.plan,
    subscriptionEndDate: end,
    membershipDiscountUsed: false
});

        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

router.post('/:option', requireLoginApi, async (req, res) => {
    try {
        const userId = getUserId(req);
        const option = req.params.option;
        const price = PRICES[option];

        if (!price) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const existing = await Subscription.findOne({
            user: userId,
            status: 'active',
            endDate: { $gt: new Date() }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You already have an active membership' });
        }

        const order = await razorpay.orders.create({
            amount: price * 100,            // paise
            currency: 'INR',
            receipt: ('mem_' + Date.now()).slice(0, 40),
            notes: { userId: userId.toString(), plan: option }
        });

        await Subscription.create({
            user: userId,
            plan: option,
            razorpaySubscriptionId: order.id,
            status: 'created'
        });

        res.json({ success: true, orderId: order.id, amount: order.amount });
    } catch (error) {
        console.log('create error:', (error && error.error) || error);
        res.status(500).json({ success: false, message: 'Unable to create membership order' });
    }
});

module.exports = router;