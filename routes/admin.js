const express = require("express");
const router = express.Router();

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");

const Products = require("../Modles/products.js");
const Order = require("../Modles/order.js");
const verifyToken = require("../middleware/middleware.js");
const adminOnly = require("../middleware/adminMiddleware.js");

const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDirectory);
    },

    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        callback(
            null,
            `${crypto.randomUUID()}${extension}`
        );
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Upload a JPG, PNG, WEBP, or GIF image.")
            );
        }

        callback(null, true);
    }
});

router.use(verifyToken);
router.use(adminOnly);

router.get("/dashboard", async (req, res) => {
    try {
        const products = await Products.find().sort({ _id: -1 });

        res.render("admin/dashboard", {
            admin: req.user,
            products
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Unable to load dashboard.");
    }
});

router.get("/products/new", (req, res) => {
    res.render("admin/newProduct", {
        admin: req.user,
        error: null
    });
});

router.post("/products", (req, res, next) => {
    upload.single("image")(req, res, (error) => {
        if (error) {
            return res.status(400).render("admin/newProduct", {
                admin: req.user,
                error: error.message
            });
        }

        next();
    });
}, async (req, res) => {
    let imagePath;

    try {
        const {
            name,
            brand,
            category,
            size,
            price,
            stock,
            ratings,
            description
        } = req.body;

        if (
            !name?.trim() ||
            !brand?.trim() ||
            !category?.trim() ||
            !size?.trim() ||
            !description?.trim() ||
            !req.file
        ) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).render("admin/newProduct", {
                admin: req.user,
                error: "Please complete every field and select an image."
            });
        }

        imagePath = req.file.path;

        const parsedPrice = Number(price);
        const parsedStock = Number(stock);
        const parsedRatings = Number(ratings);

        if (
            price === "" ||
            stock === "" ||
            ratings === "" ||
            !Number.isFinite(parsedPrice) ||
            parsedPrice < 0 ||
            !Number.isSafeInteger(parsedStock) ||
            parsedStock < 0 ||
            !Number.isFinite(parsedRatings) ||
            parsedRatings < 0 ||
            parsedRatings > 5
        ) {
            fs.unlinkSync(imagePath);

            return res.status(400).render("admin/newProduct", {
                admin: req.user,
                error: "Enter valid price, stock, and rating values."
            });
        }

        await Products.create({
            name: name.trim(),
            brand: brand.trim(),
            category: category.trim(),
            size: size.trim(),
            price: parsedPrice,
            stock: parsedStock,
            ratings: parsedRatings,
            description: description.trim(),
            image: `public/uploads/${req.file.filename}`
        });

        return res.redirect("/admin/dashboard");

    } catch (error) {
        console.error("Create product error:", error);

        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        return res.status(500).render("admin/newProduct", {
            admin: req.user,
            error: "Unable to create product."
        });
    }
});

router.post("/products/:id/delete", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send("Invalid product ID.");
        }

        const product = await Products.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).send("Product not found.");
        }

        if (product.image?.startsWith("public/uploads/")) {
            const imagePath = path.resolve(
                process.cwd(),
                product.image
            );

            if (
                imagePath.startsWith(uploadDirectory + path.sep) &&
                fs.existsSync(imagePath)
            ) {
                fs.unlinkSync(imagePath);
            }
        }

        res.redirect("/admin/dashboard");

    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).send("Unable to delete product.");
    }
});

router.post("/products/:id/stock", async (req, res) => {
    try {
        const { id } = req.params;
        const stock = Number(req.body.stock);

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send("Invalid product ID.");
        }
        if (!Number.isSafeInteger(stock) || stock < 0) {
            return res.status(400).send("Stock must be a whole number (0 or more).");
        }

        const product = await Products.findByIdAndUpdate(
            id,
            { $set: { stock } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).send("Product not found.");
        }

        res.redirect("/admin/dashboard");
    } catch (error) {
        console.error("Update stock error:", error);
        res.status(500).send("Unable to update stock.");
    }
});

router.get("/analytics", async (req, res) => {
    try {
        res.render("admin/analytics");
    } catch (error) {
        console.log("Analytics page error:", error);
        res.status(500).send("Unable to open analytics page");
    }
});

router.get("/analytics/data", async (req, res) => {
    try {
        const period = ["7days", "6months", "1year"].includes(req.query.period)
            ? req.query.period
            : "7days";

        const TZ = "Asia/Kolkata";
        const dayLabel = (date) => date.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

        const labels = [];
        let groupFormat;

        if (period === "7days") {
            groupFormat = "%Y-%m-%d";
            for (let i = 6; i >= 0; i--) {
                labels.push(dayLabel(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
            }
        } else {
            groupFormat = "%Y-%m";
            const count = period === "6months" ? 6 : 12;
            const [year, month] = dayLabel(new Date()).split("-").map(Number);
            for (let i = count - 1; i >= 0; i--) {
                const d = new Date(Date.UTC(year, month - 1 - i, 15));
                labels.push(dayLabel(d).slice(0, 7));
            }
        }

        const firstLabel = labels[0];
        const startDate = new Date(
            (firstLabel.length === 7 ? firstLabel + "-01" : firstLabel) + "T00:00:00+05:30"
        );

        const match = { paymentStatus: "paid", createdAt: { $gte: startDate } };

        const [summary, series, productStats] = await Promise.all([
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$totalAmount" },
                        orders: { $sum: 1 },
                        units: { $sum: { $sum: "$items.quantity" } }
                    }
                }
            ]),

            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $dateToString: { format: groupFormat, date: "$createdAt", timezone: TZ } },
                        revenue: { $sum: "$totalAmount" }
                    }
                }
            ]),

            Order.aggregate([
                { $match: match },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.product",
                        name: { $first: "$items.name" },
                        orderIds: { $addToSet: "$_id" },
                        unitsSold: { $sum: "$items.quantity" },
                        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                    }
                },
                { $sort: { revenue: -1 } }
            ])
        ]);

        const totals = summary[0] || { revenue: 0, orders: 0, units: 0 };

        const revenueByLabel = new Map(series.map((row) => [row._id, row.revenue]));
        const sales = labels.map((label) => ({
            id: label,
            revenue: revenueByLabel.get(label) || 0
        }));

        const stockDocs = await Products.find({
            _id: { $in: productStats.map((p) => p._id) }
        }).select("stock");
        const stockById = new Map(stockDocs.map((p) => [String(p._id), p.stock]));

        const products = productStats.map((p) => ({
            productId: String(p._id),
            name: p.name,
            orders: p.orderIds.length,
            unitsSold: p.unitsSold,
            revenue: p.revenue,
            stock: stockById.has(String(p._id)) ? stockById.get(String(p._id)) : null
        }));

        return res.json({
            success: true,
            period,
            totalRevenue: totals.revenue,
            totalOrders: totals.orders,
            totalProductsSold: totals.units,
            averageOrderValue: totals.orders ? totals.revenue / totals.orders : 0,
            sales,
            products
        });
    } catch (error) {
        console.error("Analytics data error:", error);
        return res.status(500).json({ success: false, message: "Unable to load analytics." });
    }
});

module.exports = router;