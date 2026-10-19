const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const cookie = require('cookie-parser');

const nodeMailer = require('nodemailer');

const jwt = require('jsonwebtoken')

const crypto = require('crypto');
const bcrypt = require('bcrypt');

const Cookie_Name = 'ecom-cookie';
const cookie_Security_Key = 'no-one-can-ever-guess-me';

const User = require('../Modles/user');

router.use(express.json());

router.use(express.urlencoded({ extended: true }));

router.use(express.static("public"));

router.get('/login', (req, res) => {
    res.render('login');
})

router.post('/login', async (req, res) => {

    console.log(req.body);
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    let user = await User.findOne({ email });

    // if(user.email != email && user.password != password && user.username != username){

    //     console.log("user info not matched");
    //     return res.send("hdwb");
    // }


    console.log("user", user);

    if (!user) {

        return res.send("User Doesn't exist");

    }
    console.log("user exists", user);

    const correctPass = await bcrypt.compare(password, user.password);

    console.log("correctPass", correctPass);


    if (!correctPass) {
        return res.status(401).send("Incorrect PAssword");
    }

    const payload = {
        username: username,
        email: email,
    }

    const token = jwt.sign(
        payload,
        cookie_Security_Key,
        { expiresIn: '1hr' }
    )

    res.cookie(Cookie_Name, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
    })

    res.redirect('/home');

})

router.get('/signin', (req, res) => {

    res.render('signin');

})

router.post('/signin', async (req, res) => {

    // const file = fs.readFileSync(path.join(__dirname, '..', 'data', 'userinfo.json'), 'utf8');
    // const parsData = JSON.parse(file);

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !password || !email) {
        return res.status(401).send("Enter the information");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(404).send('Email already registered');
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const userDetails = await User.create({
        username,
        email,
        password: hashPassword,
        token: null,
        expiryTime: null
    });

    const payload = {
        username: req.body.username,
        email: req.body.email,
    }
    const token = jwt.sign(
        payload,
        cookie_Security_Key,
        { expiresIn: '1hr' }
    );

    res.cookie(Cookie_Name, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000,
    });

    // const user = {
    //     username: username,
    //     email: email,
    //     password: password
    // }

    // console.log(parsData);
    console.log(req.body);

    // parsData.push(user);

    // fs.writeFileSync(path.join(__dirname, '..', 'data', 'userinfo.json'), JSON.stringify(parsData, null, 2));
    // // res.send('dashboard');
    res.redirect('/home');
})

router.get('/forgot', (req, res) => {

    res.render('forgotPass');

})

router.post('/forgot', async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;

    console.log(req.body.username);

    console.log("user email :  po---", req.body.email);

    if (!username || !email) {

        return res.status(400).send('Enter your username and email');

    }

    const user = await User.findOne({ email });
    console.log("this is forgot user", user);
    if (!user) {

        return res.status(401).send("User doesn't exist");

    }

    console.log("forgot email: ", user);

    //send mail function
    const serverEmail = process.env.serverEmail;
    // console.log("serverEmail is : ",serverEmail);

    const serverEmailPass = process.env.serverEmailPass;
    // console.log("serverEmailPass :",serverEmailPass);

    if (!username || !email) {

        console.log("Enter info to forget information");
        return res.send("redirect to sign page as user doesn't exist");

    }

    else {
        const transporter = nodeMailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {

                user: process.env.serverEmail,
                pass: process.env.serverEmailPass,

            },
        })

        if (user) {

            const token = crypto.randomBytes(32).toString('hex');
            const hashToken = crypto.createHash('sha256').update(token).digest('hex');

            // console.log(token);
            const baseUrl = `http://localhost:${process.env.PORT || 2700}`;
            const resetUrl = `${baseUrl}/auth/reset/${token}`;

            // console.log(resetUrl);
            user.token = hashToken;
            user.expiryTime = Date.now() + 60 * 60 * 1000;

            await user.save();

            try {
                await transporter.sendMail({
                    from: serverEmail,
                    to: email,
                    subject: "Enter the new password",
                    text: "Click the link to reset Password.",
                    html: `<p>Click the link to reset the password</p><a href='${resetUrl}'>Reset URL</a>`,
                    // html: `<p>Click the link to reset the password</p><a href='${resetUrl}'>Reset URL</a><script></script>`,

                })
                res.send('Email is sent on your mail');

                console.log("Email sent");
                console.log(email);
            }
            catch (error) {

                console.log(error);
                // delete user.token;
                // delete user.expiryTime;

                user.token = null;
                user.expiryTime = null;
                await user.save();

            }
        }
    }

})

router.get('/reset/:token', (req, res) => {

    // console.log(req.params.token);
    const tk = req.params.token;
    res.render('resetPassword', { tk });

})

router.post('/reset', async (req, res) => {

    console.log("token", req.body);

    const token = req.body.token;

    const newPass = req.body.password;
    const rePass = req.body.rePassword;

    if (!token || !newPass || !rePass) {

        return res.send("Fill all the details");

    }

    if (newPass != rePass) {

        return res.send("Password doesn't match");

    }

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');//hash

    const user = await User.findOne({ token: hashToken, expiryTime: { $gt: Date.now() } });
    console.log("Reset Pass in the ", user);

    if (!user) {
        return res.status(400).send('Invalid or expired password-reset link');
    }

    const hashedPass = await bcrypt.hash(newPass, 10);
    user.password = hashedPass;

    user.token = null;
    user.expiryTime = null;

    await user.save();
    return res.redirect('./home.js');//redirect to home

})

router.get('/changePass', (req, res) => {

    res.render('changePass');

})

router.post('/changePass', async (req, res) => {

    const currentPas = req.body.password;
    const rePass = req.body.rePassword;
    const newPass = req.body.newPassword;

    console.log("requested params", currentPas, " repas ", rePass, " newPass ", newPass);

    // const username=req.body.username;
    const email = req.body.email;

    // console.log("change",req.body.username);

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).send('User not found');
    }

    if (newPass != rePass) {

        return res.status(400).send("New passwords don't match");

    }

    const correctPass = await bcrypt.compare(currentPas, user.password);

    if (!correctPass) {
        return res.status(401).send("Your current Password is incorrect");
    }

    if (currentPas == rePass) {
        return res.send("New password must be different");
    }

    user.password == await bcrypt.hash(newPass, 10);
    user.token = null;
    user.expiryTime = null;

    await user.save();

    res.clearCookie(Cookie_Name);

    return res.redirect('/login');

})

router.get('/logout', (req, res) => {

    res.send('logout');

})

router.post('/logout', (req, res) => {

    res.clearCookie(Cookie_Name,{
        httpOnly: true,
        sameSite: 'lax',
    });

    return res.redirect('/auth/login');
})

module.exports = router;