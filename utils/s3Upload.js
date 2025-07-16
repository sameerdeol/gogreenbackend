const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

function getS3Folder(fieldname) {
    switch (fieldname) {
        case 'featuredImage': return 'featured-images/';
        case 'galleryImages': return 'gallery-images/';
        case 'brand_logo': return 'productBrand-logos/';
        case 'category_logo': return 'productCategory-images/';
        case 'subcategory_logo': return 'productsubCategory-logos/';
        case 'banner_image': return 'app-banners/';
        case 'identity_proof': return 'identity_proof/';
        case 'worker_profilePic': return 'worker_profilePictures/';
        case 'vendor_thumbnail': return 'vendor_thumbnail/';
        case 'store_image': return 'store_images/';
        case 'profile_pic': return 'profile_pic/';
        case 'bussiness_license_number_pic': return 'bussiness_license_number_pic/';
        case 'gst_number_pic': return 'gst_number_pic/';
        case 'vendor_insurance_certificate': return 'vendor_insurance_certificate/';
        case 'health_inspection_certificate': return 'health_inspection_certificate/';
        case 'food_certificate': return 'food_certificate/';
        default: return '';
    }
}

/**
 * Uploads a file buffer to S3 and returns the public URL.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} originalname - The original file name.
 * @param {string} fieldname - The fieldname from the form.
 * @param {string} mimetype - The file mimetype.
 * @returns {Promise<string>} - The S3 URL.
 */
async function uploadToS3(buffer, originalname, fieldname, mimetype) {
    const folder = getS3Folder(fieldname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalname);
    const key = folder + uniqueSuffix + ext;
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
    };
    await s3.send(new PutObjectCommand(params));
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

module.exports = uploadToS3; 