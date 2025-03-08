const UserAddress = require('../models/userAddressModel');

// Create a new user address
const createAddress = (req, res) => {
    const { user_id, address, city, province, postal_code, road_number, landmark, type } = req.body;

    if (!user_id || !address || !city || !province || !postal_code || !road_number || !type) {
        return res.status(400).json({ success: false, message: 'All fields except landmark are required.' });
    }

    UserAddress.create(user_id, address, city, province, postal_code, road_number, landmark, type, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error creating address', error: err });
        }
        res.status(201).json({ success: true, message: 'Address created successfully', id: result.insertId });
    });
};
// Get all addresses of a specific user
const getUserAddresses = (req, res) => {
    const { user_id } = req.body; // Get user_id from request

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    UserAddress.findByUserId(user_id, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching user addresses', error: err });
        }
        if (!results.length) {
            return res.status(404).json({ success: false, message: 'No addresses found for this user' });
        }
        res.status(200).json({ success: true, addresses: results });
    });
};

// Get address by ID
const getAddressById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Address ID is required.' });
    }

    UserAddress.findById(id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching address', error: err });
        }
        if (!result.length) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        res.status(200).json({ success: true, address: result[0] });
    });
};

// Update address by ID
const updateAddressById = (req, res) => {
    const { id, address, city, province, postal_code, road_number, landmark, type } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Address ID is required.' });
    }

    UserAddress.findById(id, (err, addressData) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching address', error: err });

        if (!addressData.length) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const existingAddress = addressData[0];
        const updateFields = {
            address: address || existingAddress.address,
            city: city || existingAddress.city,
            province: province || existingAddress.province,
            postal_code: postal_code || existingAddress.postal_code,
            road_number: road_number || existingAddress.road_number,
            landmark: landmark !== undefined ? landmark : existingAddress.landmark,
            type: type || existingAddress.type
        };

        UserAddress.update(id, updateFields, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating address', error: err });
            }
            res.status(200).json({ success: true, message: 'Address updated successfully' });
        });
    });
};

// Delete address by ID
const deleteAddressById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Address ID is required.' });
    }

    UserAddress.findById(id, (err, addressData) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching address', error: err });

        if (!addressData.length) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        UserAddress.delete(id, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error deleting address', error: err });
            }
            res.status(200).json({ success: true, message: 'Address deleted successfully' });
        });
    });
};

module.exports = {
    createAddress,
    getUserAddresses,
    getAddressById,
    updateAddressById,
    deleteAddressById
};
