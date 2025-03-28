const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {generateUniqueUsername} = require('../middleware/username');
const db = require('../config/db'); // Import the existing connection
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const fs = require('fs');

require('dotenv').config();

const appsignup = async (req, res) => {
    try {
        const { phonenumber, otp, prefix, role_id } = req.body;

        // Validate required fields
        if (!phonenumber || !prefix) {
            return res.status(400).json({
                success: false,
                message: "Phone number and prefix are required",
            });
        }

        const STATIC_OTP = 1234;
        if (otp && otp !== STATIC_OTP) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP",
            });
        }
        const userData = {
            prefix: prefix,
            phonenumber: phonenumber,
            role_id: role_id,
            is_verified:1
        };
        // Check if user already exists
        User.findCustomerByPhone(phonenumber,role_id, (err, result) => {
            if (err) {
                console.error("Error checking user:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server error while checking user",
                    error: err,
                });
            }

            if (result.length > 0) {
                const user = result[0];
                const token = jwt.sign(
                    { id: user.id, role_id: user.role_id, role: user.role_name, username: user.username },
                    process.env.JWT_SECRET
                );

                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    token,
                });
            }
            console.log
            User.insertUser(userData, (err, newUserResult) => {
                if (err) {
                    console.error("Error inserting user:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Server error while creating user",
                        error: err,
                    });
                }

                const newUserId = newUserResult.insertId; // Get new user ID
                const token = jwt.sign(
                    { id: newUserId, role_id: role_id, phonenumber: phonenumber},
                    process.env.JWT_SECRET
                );

                return res.status(201).json({
                    success: true,
                    message: "User created and logged in successfully",
                    user: { id: newUserId, phonenumber, role_id },
                    token,
                });
            });
        });
    } catch (error) {
        console.error("Unexpected Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};



// login user api
const loginadmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        User.findByEmail(email, async (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Internal server error', error: err });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const user = results[0];

            // ✅ Validate password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // ✅ Generate JWT token with expiration
            const token = jwt.sign(
                { id: user.id, role_id: user.role_id, role: user.role_name, username: user.username },
                process.env.JWT_SECRET,
            );

            return res.json({ message: 'Login successful', token });
        });
    } catch (error) {
        return res.status(500).json({ message: 'Authentication error', error });
    }
};
const updateUser = (req, res) => {
    const userData = req.body;
    const { role_id } = req.user;
    const user_id=28;
    User.updateUser(user_id,role_id,userData, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        }
        else{
            res.status(200).json({ message: 'User updated successfully' });
        }
    });
};
const getUnverifiedUsers = (req, res) => {
    User.getUnverifiedUsers((err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        res.json({ success: true, users });
    });
};

const verifyUser = (req, res) => {
    const userId = req.body.id;

    User.verifyUser(userId, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found or already verified' });
        }
        res.json({ success: true, message: 'User verified successfully' });
    });
};

const vendorRiderSignup = async (req, res) => {
    try {
        const { firstname, lastname, email, password, role_id, phonenumber, prefix } = req.body;
        const is_verified = 0;
        const { username } = generateUniqueUsername(firstname, phonenumber); // Generate unique username

        // 1️⃣ Check if email already exists
        User.findByEmail(email, async (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Server error while checking existing user',
                    error: err.message
                });
            }

            if (result.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this email already exists'
                });
            }

            // 2️⃣ Hash password before storing
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3️⃣ Insert into `users` table (No `user_roles`)
            const userData = {
                username: username,
                firstname: firstname,
                lastname: lastname,
                password: hashedPassword, // Make sure password is hashed before passing
                prefix: prefix,
                phonenumber: phonenumber,
                email: email,
                role_id: role_id,
                is_verified:is_verified
            };

            User.insertUser(userData, (err, userResult) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while inserting user',
                        error: err.message
                    });
                }

                // 4️⃣ Generate JWT Token
                const token = jwt.sign(
                    { user_id: userResult.insertId, username, email, role_id, firstname,  lastname},
                    process.env.JWT_SECRET,
                );

                return res.status(201).json({
                    success: true,
                    message: 'User created successfully',
                    token
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const vendorRiderLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        User.findByEmailForVendorRider(email, async (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Internal server error', error: err });
            }

            if (!results || !results.success) {
                return res.status(404).json({ success: false, message: results?.message || 'User not found' });
            }

            const user = results.user;
            // ✅ Validate password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // ✅ Generate JWT token with expiration
            const token = jwt.sign(
                { id: user.user_id, role_id: user.role_id, username: user.username, firstname:user.firstname, lastname:user.lastname, email:user.email, phonenumber:user.phonenumber },
                process.env.JWT_SECRET
            );

            return res.json({ success: true, message: 'Login successful', token });
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Authentication error', error });
    }
};



const createSuperadminManagers = (req, res) => {
    try {
        const { email, password, firstname, lastname, prefix, phonenumber, role_id } = req.body;

        // Generate unique username
        const { username } = generateUniqueUsername(firstname, phonenumber); 

        if (!email || !password || !firstname || !lastname || !phonenumber || !role_id) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Check if user exists
        User.findByEmail(email, (err, existingUser) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Server error", error: err });
            }

            if (existingUser.length > 0) {
                return res.status(400).json({ success: false, message: "User with this email already exists" });
            }

            // Hash password before inserting
            const hashedPassword = bcrypt.hashSync(password, 10);
            const userData = {
                username: username,
                firstname: firstname,
                lastname: lastname,
                password: hashedPassword, // Make sure password is hashed before passing
                prefix: prefix,
                phonenumber: phonenumber,
                email: email,
                role_id: role_id,
                is_verified: 1
            };

            // Insert user and get user ID
            User.insertUser(userData, (insertErr, userResult) => {
                if (insertErr) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while inserting user',
                        error: insertErr.message
                    });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { user_id: userResult.insertId, username, email, role_id },
                    process.env.JWT_SECRET
                );

                return res.status(201).json({
                    success: true,
                    message: "User created successfully",
                    token
                });
            });
        });

    } catch (error) {
        console.error("Error in createSuperadminManagers:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

const vendorRiderVerification = async (req, res) => {
    try {
        const { role_id,storename, storeaddress, sincode, countrystatus, identity_proof, user_id, license_number } = req.body;

        if ([1, 2].includes(parseInt(role_id))) {
            return res.status(403).json({ success: false, message: 'You are not allowed to create an account with this role.' });
        }

        const userData = { user_id,storename, storeaddress, sincode, countrystatus, identity_proof, license_number };

        User.insertUserVerification(role_id, userData, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error saving verification details', error: err });
            }
            res.status(201).json({ success: true, message: 'Verification details stored successfully' });
        });

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};


const updatePassword = (req, res) => {
    const { role_id, previous_password, new_password, user_id } = req.body;

    // Prevent admins from changing password
    if ([1, 2].includes(parseInt(role_id))) {
        return res.status(403).json({ success: false, message: 'You are not allowed to update the password.' });
    }

    // Find user
    User.findById(user_id, (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        bcrypt.compare(previous_password, user.password, (err, isMatch) => {
            if (err) {
                console.error('🔴 Error during bcrypt comparison:', err);
                return res.status(500).json({ success: false, message: 'Error checking password', error: err });
            }
        
            if (!isMatch) {
                console.log('❌ Passwords do NOT match!');
                return res.status(400).json({ success: false, message: 'Incorrect previous password' });
            }
            User.updatePassword(user_id, new_password, (err, result) => {
                if (err) return res.status(500).json({ success: false, message: 'Error updating password', error: err });

                res.status(200).json({ success: true, message: 'Password updated successfully' });
            });
        });        
    });
};


const updateWorkersProfile = (req, res) => {
    const { role_id, firstname, lastname, storename, storeaddress, email, sincode, phonenumber, user_id, prefix, license_number } = req.body;

    // Prevent admins from changing password
    if ([1, 2].includes(parseInt(role_id))) {
        return res.status(403).json({ success: false, message: 'You are not allowed to update the password.' });
    }

    // Find user
    User.findById(user_id, (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const userData = {
            firstname: firstname,
            prefix: prefix,
            phonenumber: phonenumber,
            email: email,
            store_name:storename,
            store_address:storeaddress,
            sin_code:sincode,
            license_number:license_number,
            lastname:lastname
        };
        User.updateWorkerData(user_id,role_id,userData, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query failed' });
            }
            else{
                res.status(200).json({ message: 'User updated successfully' });
            }
        });       
    });
};

module.exports = { uploadFields, loginadmin , updateUser,appsignup, getUnverifiedUsers,verifyUser,vendorRiderSignup,createSuperadminManagers, vendorRiderVerification,vendorRiderLogin, updatePassword, updateWorkersProfile};
