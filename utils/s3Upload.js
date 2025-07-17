const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const sharp = require('sharp'); // ✅ Image processing

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
        case 'vendor_type_image': return 'vendor_type_image/';
        case 'void_cheque': return 'void_cheque/';
        default: return '';
    }
}

/**
 * Compresses and uploads an image to S3
 * @param {Buffer} buffer - The original image buffer
 * @param {string} originalname - The original file name
 * @param {string} fieldname - The field name of the file input
 * @param {string} mimetype - The image MIME type
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
async function uploadToS3(buffer, originalname, fieldname, mimetype) {
    const folder = getS3Folder(fieldname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalname).toLowerCase();
    const key = folder + uniqueSuffix + ext;

    // ✅ Compress the image using sharp
    let compressedBuffer;

    try {
        const image = sharp(buffer);

        if (mimetype === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') {
            compressedBuffer = await image.jpeg({ quality: 70 }).toBuffer();
        } else if (mimetype === 'image/png' || ext === '.png') {
            compressedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
        } else if (mimetype === 'image/webp' || ext === '.webp') {
            compressedBuffer = await image.webp({ quality: 70 }).toBuffer();
        } else {
            // If not an image or unsupported type, use original buffer
            compressedBuffer = buffer;
        }
    } catch (err) {
        console.error("Sharp compression error:", err);
        compressedBuffer = buffer; // Fallback to original buffer if compression fails
    }

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: compressedBuffer,
        ContentType: mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

module.exports = uploadToS3;
