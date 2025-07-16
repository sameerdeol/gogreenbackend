const AppBanner = require('../models/appBannerModel');
const uploadFields = require('../middleware/multerConfig');
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');

// Create a new app banner
const createBanner = async (req, res) => {

    const { title, status } = req.body;
    let image = null;
    if (req.files && req.files['banner_image']) {
        const file = req.files['banner_image'][0];
        image = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
    }

    if (!title || !image) {
        return res.status(400).json({ success: false, message: 'Title and image are required.' });
    }

    AppBanner.create(title, image, status, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error creating banner', error: err });
        }
        res.status(201).json({ success: true, message: 'Banner created successfully', id: result.insertId });
    });
};

// Get all banners
const getAllBanners = (req, res) => {
    AppBanner.findAll((err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching banners', error: err });
        }
        res.status(200).json({ success: true, banners: results });
    });
};

// Get banner by ID
const getBannerById = (req, res) => {
    const { id} = req.body;
    AppBanner.findById(id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching banner', error: err });
        }
        if (!result.length) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        res.status(200).json({ success: true, banner: result[0] });
    });
};

// Update banner by ID
const updateBannerById = async (req, res) => {
    const { id, title, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Banner ID is required.' });
    }

    // Step 1: Fetch Existing Banner
    AppBanner.findById(id, async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching banner', error: err });
        }

        if (!results.length) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        const existingBanner = results[0];

        const updateFields = {
            title: title || existingBanner.title,
            status: status !== undefined ? status : existingBanner.status,
            image_url: existingBanner.image_url // ✅ Ensure 'image_url' is returned
        };

        // Step 2: Handle Image Upload (if applicable)
        if (req.files && req.files['banner_image']) {
            const file = req.files['banner_image'][0];
            const newImage = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
            const oldImageUrl = existingBanner.image_url;
            updateFields.image_url = newImage;
            // Delete old image from S3
            if (oldImageUrl) {
                await deleteS3Image(oldImageUrl);
            }
        }

        // Step 4: Update the Banner in DB
        AppBanner.update(id, updateFields, (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ success: false, message: 'Error updating banner', error: updateErr });
            }

            res.status(200).json({
                success: true,
                message: 'Banner updated successfully',
                banner: updateFields, // ✅ Ensure response returns 'image_url'
            });
        });
    });
};


// Delete banner by ID
const deleteBannerById = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Banner ID is required.' });
    }

    AppBanner.findById(id, async (err, banner) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching banner', error: err });

        if (!banner.length) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        const existingBanner = banner[0];

        if (existingBanner.image_url) {
            await deleteS3Image(existingBanner.image_url);
        }

        AppBanner.delete(id, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error deleting banner', error: err });
            }
            res.status(200).json({ success: true, message: 'Banner deleted successfully' });
        });
    });
};

module.exports = {
    uploadFields,
    createBanner,
    getAllBanners,
    getBannerById,
    updateBannerById,
    deleteBannerById
};
