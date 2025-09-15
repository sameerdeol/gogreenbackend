const searchProductModel = require('../models/searchProductModel');

const searchAll = (req, res) => {
    const { searchstring, user_id } = req.body;

    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    searchProductModel.search(searchstring, user_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        // Optional: Return grouped results if using Option 2
        res.status(200).json({
            success: true,
            message: 'Search results fetched successfully',
            data: result
        });
    });
};

const itemSearch = (req, res) => {
    const { searchstring, searchtype, user_id } = req.body;

    if (!searchstring || !searchtype) {
        return res.status(400).json({ success: false, message: 'Search string and type is required.' });
    }

    searchProductModel.searchitem(searchstring, searchtype,user_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        // Optional: Return grouped results if using Option 2
        res.status(200).json({
            success: true,
            message: 'Search results fetched successfully',
            data: result
        });
    });
};

const searchAllbyVendor = (req, res) => {
    const { searchstring, vendor_id } = req.body;

    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    if (!vendor_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    searchProductModel.searchByVendor(searchstring, vendor_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        // Optional: Return grouped results if using Option 2
        res.status(200).json({
            success: true,
            message: 'Search results fetched successfully',
            data: result
        });
    });
};

const searchVendorbyName = (req, res) => {
    const { search_name, user_id } = req.body;

    if (!search_name || typeof search_name !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid search_name is required.' });
    }
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    // Helper function to convert 24-hour time to 12-hour with AM/PM
    const formatTo12Hour = (timeString) => {
        if (!timeString) return null;
        const [hour, minute] = timeString.split(':').map(Number);

        let period = hour >= 12 ? 'PM' : 'AM';
        let formattedHour = hour % 12 || 12; // converts 0 -> 12 for midnight
        return `${formattedHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    // Get current time in India
    const now = new Date();
    const indiaTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    const nowMinutes = indiaTime.getHours() * 60 + indiaTime.getMinutes();

    searchProductModel.searchVendorbyProduct(search_name, user_id, (err, result) => {
        if (err) {
            console.error("Search Error:", err);
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: true,
                message: 'No vendors found matching that product/category/subcategory name.',
                data: []
            });
        }

        // Add featured_images array + is_vendor_opened + 12-hour format
        const formattedResult = result.map(vendor => {
            let is_vendor_opened = false;

            if (vendor.vendor_start_time && vendor.vendor_close_time) {
                const [startHour, startMinute] = vendor.vendor_start_time.split(':').map(Number);
                const [closeHour, closeMinute] = vendor.vendor_close_time.split(':').map(Number);

                const startMinutes = startHour * 60 + startMinute;
                const closeMinutes = closeHour * 60 + closeMinute;

                is_vendor_opened = nowMinutes >= startMinutes && nowMinutes < closeMinutes;
            }

            return {
                ...vendor,
                vendor_start_time: formatTo12Hour(vendor.vendor_start_time),
                vendor_close_time: formatTo12Hour(vendor.vendor_close_time),
                featured_images: vendor.featured_images
                    ? vendor.featured_images.split(',')
                    : [],
                is_vendor_opened
            };
        });

        res.status(200).json({
            success: true,
            message: 'Vendors found successfully.',
            data: formattedResult
        });
    });
};




module.exports = { searchAll, itemSearch, searchAllbyVendor, searchVendorbyName };
