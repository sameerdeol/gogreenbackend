const AppBanner = require('../models/appBannerModel');
const uploadFields = require('../middleware/multerConfig');
const fs = require('fs');

// Create a new app banner
const createBanner = (req, res) => {

    const { title, status } = req.body;
    const image = req.files && req.files['banner_image']
        ? req.files['banner_image'][0].path
        : null;

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
const updateBannerById = (req, res) => {
    const { id, title, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Banner ID is required.' });
    }

    // Step 1: Fetch Existing Banner
    AppBanner.findById(id, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching banner', error: err });

        if (!results.length) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        const existingBanner = results[0];

        const updateFields = {
            title: title || existingBanner.title,
            status: status !== undefined ? status : existingBanner.status,
            image_url: existingBanner.image_url
        };

        // Step 2: Handle Image Upload (if applicable)
        if (req.files && req.files['banner_image']) {
            const newImage = req.files['banner_image'][0].path;
            updateFields.image = newImage;

            // Delete old image if exists
            if (existingBanner.image_url) {
                fs.unlink(existingBanner.image_url, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
        }

        // Step 3: Update the Banner in DB
        AppBanner.update(id, updateFields, (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ success: false, message: 'Error updating banner', error: updateErr });
            }

            res.status(200).json({
                success: true,
                message: 'Banner updated successfully',
                banner: updateFields,
            });
        });
    });
};

// Delete banner by ID
const deleteBannerById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Banner ID is required.' });
    }

    AppBanner.findById(id, (err, banner) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching banner', error: err });

        if (!banner.length) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        console.log("banner is",banner[0])
        const existingBanner = banner[0];

        if (existingBanner.image_url) {
            fs.unlink(existingBanner.image_url, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
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
