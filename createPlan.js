require('dotenv').config();
const fs = require('fs');
const path = require('path');
const razorpay = require('./config/razorpay');

const PLANS = [
    { envKey: 'RAZORPAY_BASIC_PLAN_ID',   name: 'Seraphic Basic',   amount: 299 },
    { envKey: 'RAZORPAY_PREMIUM_PLAN_ID', name: 'Seraphic Premium', amount: 599 }
];

function setEnvValue(content, key, value) {
    const line = key + '=' + value;
    const regex = new RegExp('^' + key + '=.*$', 'm');
    return regex.test(content)
        ? content.replace(regex, line)
        : content.trimEnd() + '\n' + line + '\n';
}

async function main() {
    const keyId = process.env.RAZORPAY_API_KEY || '';
    const secret = process.env.RAZORPAY_SECRET_KEY || '';

    if (!keyId.startsWith('rzp_test_') || !secret) {
        console.log('Check RAZORPAY_API_KEY and RAZORPAY_SECRET_KEY in .env');
        return;
    }

    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    for (const p of PLANS) {
        const plan = await razorpay.plans.create({
            period: 'monthly',
            interval: 1,
            item: {
                name: p.name,
                amount: p.amount * 100,   // paise
                currency: 'INR'
            }
        });
        console.log(p.name + ' -> ' + plan.id);
        envContent = setEnvValue(envContent, p.envKey, plan.id);
    }

    fs.writeFileSync(envPath, envContent);
    console.log('Done. Plan IDs saved in .env. Restart your server now.');
}

main().catch(e => {
    console.log('error:', (e && e.error && e.error.description) || e);
});