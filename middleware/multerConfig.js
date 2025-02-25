const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Function to ensure directory exists
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("hii",req.files)
        let uploadPath = 'uploads/';

        // Determine the destination folder based on the file fieldname
        if (file.fieldname === 'featuredImage') {
            uploadPath = 'uploads/featured-images/';
        } else if (file.fieldname === 'galleryImages') {
            uploadPath = 'uploads/gallery-images/';
        } else if (file.fieldname === 'brand_logo') {
            uploadPath = 'uploads/productBrand-logos/';
        }

        ensureDir(uploadPath); // Ensure folder exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer middleware setup
const upload = multer({ storage: storage });

// Exporting upload fields middleware with added brandLogo
const uploadFields = upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 5 },
    { name: 'brandLogo', maxCount: 1 }  // Added brandLogo field
]);

module.exports = uploadFields;
