const express = require("express");
const router = express.Router();

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");

const Products = require("../Modles/products.js");
const verifyToken = require("../middleware/middleware.js");
const adminOnly = require("../middleware/adminMiddleware.js");

const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

// Image storage
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

// Every admin route requires authentication and admin access.
router.use(verifyToken);
router.use(adminOnly);

// Dashboard: admin profile and all products
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

// Display the create-product form
router.get("/products/new", (req, res) => {
    res.render("admin/newProduct", {
        admin: req.user,
        error: null
    });
});

// Create a product and save it in MongoDB
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

// Delete a product
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

        // Delete only images stored in the uploads folder.
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

router.get("/analytics", async(req, res)=>{

try{
    res.render("admin/analytics");
}
catch(error){

console.log("Analytics page error:", error);
res.status(500).send("Unable to open analytics page");
}
});

router.get("/analytics/data",async (req,res)=>{
    condole.log("hi");
})

module.exports = router;