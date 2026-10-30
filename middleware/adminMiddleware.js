const adminOnly = (req, res, next) => {
    const adminEmail = (process.env.ADMIN_EMAIL || "")
        .trim()
        .toLowerCase();

    if (!req.user) {
        return res.redirect("/auth/login");
    }

    const userEmail = (req.user.email || "")
        .trim()
        .toLowerCase();

    if (!adminEmail || userEmail !== adminEmail) {
        return res.status(403).send("Access denied. Admin only.");
    }

    next();
};

module.exports = adminOnly;