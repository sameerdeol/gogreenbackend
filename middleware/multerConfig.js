const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFields = upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 5 },
    { name: 'brand_logo', maxCount: 1 },
    { name: 'category_logo', maxCount: 1 },
    { name: 'subcategory_logo', maxCount: 1 },
    { name: 'banner_image', maxCount: 1 },
    { name: 'identity_proof', maxCount: 1 },
    { name: 'worker_profilePic', maxCount: 1 },
    { name: 'vendor_thumbnail', maxCount: 1 },
    { name: 'store_image', maxCount: 1 },
    { name: 'bussiness_license_number_pic', maxCount: 1 },
    { name: 'gst_number_pic', maxCount: 1 },
    { name: 'profile_pic', maxCount: 1 },
    { name: 'food_certificate', maxCount: 1 },
    { name: 'health_inspection_certificate', maxCount: 1 },
    { name: 'vendor_insurance_certificate', maxCount: 1 },
    { name: 'vendor_type_image', maxCount: 1 },
    { name: 'void_cheque', maxCount: 1 }
]);

module.exports = uploadFields;
