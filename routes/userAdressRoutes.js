const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
    createAddress,
    getUserAddresses,
    getAddressById,
    updateAddressById,
    deleteAddressById
} = require('../controllers/userAddressController');

// Routes for User Addresses
router.post('/user-addresses', verifyToken, createAddress);
router.get('/user-addresses', verifyToken, getUserAddresses);
router.post('/user-addressesbyid', verifyToken, getAddressById);
router.put('/updateUser-addresses', verifyToken, updateAddressById);
router.delete('/deleteUser-addresses', verifyToken, deleteAddressById);

module.exports = router;
