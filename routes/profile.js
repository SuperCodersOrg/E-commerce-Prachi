const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/middleware.js');
const User = require('../Modles/user.js');
const Subscription = require('../Modles/subscription.js');

router.use(verifyToken);

router.get('/', async (req, res) => {
    const u = req.user;
    const userId = u && (u._id || u.id || u.userId);

    if (!userId) {
        return res.redirect('/auth/login');
    }

    try {
        const user = await User.findById(userId)
            .select('username email createdAt subscriptionPlan subscriptionEndDate');

        if (!user) {
            return res.redirect('/auth/login');
        }

        let subscription = null;

        if (
            user.subscriptionPlan &&
            user.subscriptionPlan !== 'none' &&
            user.subscriptionEndDate &&
            user.subscriptionEndDate > new Date()
        ) {
            subscription = {
                plan: user.subscriptionPlan,
                endDate: user.subscriptionEndDate
            };
        } else {
            // Fallback: look at the payment records and repair the user
            const sub = await Subscription.findOne({
                user: userId,
                status: 'active',
                endDate: { $gt: new Date() }
            }).sort({ createdAt: -1 });

            if (sub) {
                subscription = { plan: sub.plan, endDate: sub.endDate };
                await User.findByIdAndUpdate(userId, {
                    subscriptionPlan: sub.plan,
                    subscriptionEndDate: sub.endDate
                });
            }
        }

        res.render('profile', { user, subscription });
    } catch (error) {
        console.log('profile error:', error);
        res.status(500).send('Unable to load profile');
    }
});

module.exports = router;