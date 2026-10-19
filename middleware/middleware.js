const Cookie_Name = 'ecom-cookie';

const cookie_Security_Key = 'no-one-can-ever-guess-me';

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next){

    const token = req.cookies[Cookie_Name];

   console.log('Cookies:', req.cookies);
console.log('Token:', req.cookies?.[Cookie_Name]);

    console.log("u",token);
    

    if(!token){
        console.log("user is not verified");
       return res.redirect('/auth/login');
    }
    
        try{

            console.log("User");
           const decode = jwt.verify(token , cookie_Security_Key);
           req.user = decode;
           next();


    }
    catch(error){

        console.log("error: ", error);
        res.clearCookie(Cookie_Name);
        return redirect('/login');
    }
}
module.exports = verifyToken;