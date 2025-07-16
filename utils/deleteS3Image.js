const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

function getS3KeyFromUrl(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    } catch (e) {
        return null;
    }
}

/**
 * Deletes an image from AWS S3 given its URL.
 * @param {string} imageUrl - The full S3 URL of the image.
 * @returns {Promise<void>} Resolves when deletion is attempted.
 */
async function deleteS3Image(imageUrl) {
    const key = getS3KeyFromUrl(imageUrl);
    if (!key) return;
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key
    };
    try {
        await s3.send(new DeleteObjectCommand(params));
    } catch (err) {
        console.error('Error deleting image from S3:', err);
    }
}

module.exports = deleteS3Image; 