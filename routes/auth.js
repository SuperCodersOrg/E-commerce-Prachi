const express = require('express');
const router = express.Router();

const cookie = require('cookie-parser');

const nodeMailer = require('nodemailer');

const jwt = require('jsonwebtoken')

const crypto = require('crypto');
const bcrypt = require('bcrypt');

const Cookie_Name = process.env.Cookie_Name;
const cookie_Security_Key = process.env.cookie_Security_Key;

const User = require('../Modles/user');

router.use(express.json());

router.use(express.urlencoded({ extended: true }));

router.use(express.static("public"));

const authController = require('../controllers/authController');



router.get('/login',authController.getLogin);

router.post('/login',authController.postLogin);


router.get('/signin',authController.getSignin);

router.post('/signin',authController.postSignin);


router.get('/forgot',authController.getForgot);

router.post('/forgot',authController.postForgot)


router.get('/reset/:token',authController.getReset);

router.post('/reset',authController.postReset);


router.get('/changePass', authController.getChangePass);

router.post('/changePass',authController.postChangePass);


router.get('/logout',authController.getLogout);

router.post('/logout',authController.postLogout);


module.exports = router;