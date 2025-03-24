const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Function to ensure the upload directory exists
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(__dirname, '..', 'uploads'); // Base upload directory

        // Determine folder based on fieldname
        const folderMap = {
            'featuredImage': 'featured-images',
            'galleryImages': 'gallery-images',
            'brand_logo': 'productBrand-logos',
            'category_logo': 'productCategory-images',
            'subcategory_logo': 'productsubCategory-logos',
            'banner_image': 'app-banners',
            'identity_proof': 'identity_proof'
        };

        if (folderMap[file.fieldname]) {
            uploadPath = path.join(uploadPath, folderMap[file.fieldname]);
        }

        ensureDir(uploadPath); // Ensure folder exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter function (Allow only images)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed!'), false);
    }
};

// Multer middleware setup
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Exporting upload fields middleware
const uploadFields = upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 5 },
    { name: 'brand_logo', maxCount: 1 },
    { name: 'category_logo', maxCount: 1 },
    { name: 'subcategory_logo', maxCount: 1 },
    { name: 'banner_image', maxCount: 1 },
    { name: 'identity_proof', maxCount: 1 }
]);

module.exports = uploadFields;
