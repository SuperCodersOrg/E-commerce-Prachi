const Cookie_Name = process.env.Cookie_Name;

const cookie_Security_Key = process.env.cookie_Security_Key;

require('dotenv').config();
const jwt = require('jsonwebtoken');

// Reads the login cookie and sets req.user (if the token is valid).
// Guests simply continue without req.user.
function verifyToken(req, res, next) {
    // Read env here (not at the top of the file) so it is always loaded.
    const Cookie_Name = process.env.Cookie_Name;
    const cookie_Security_Key = process.env.cookie_Security_Key;

    const token = req.cookies && req.cookies[Cookie_Name];

    if (!token) {
        return next();
    }

    try {
        req.user = jwt.verify(token, cookie_Security_Key);
        return next();
    } catch (error) {
        console.log("Invalid or expired token:", error.message);
        res.clearCookie(Cookie_Name, { httpOnly: true, sameSite: 'lax' });
        return next();
    }
}

module.exports = verifyToken;