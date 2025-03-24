const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db'); // Import the existing connection
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const fs = require('fs');

require('dotenv').config();

const signup = async (req, res) => {
    try {
        const { username, email, password, role_id, firstname, lastname, phonenumber, identity_type, prefix } = req.body;
        const identity_proof = req.file ? req.file.filename : null; // Get uploaded file

        if ([1, 2].includes(parseInt(role_id))) {
            return res.status(403).json({
                success: false,
                message: 'You are not allowed to create an account with this role.'
            });
        }

        if ([3, 4].includes(parseInt(role_id)) && !identity_proof) {
            return res.status(400).json({
                success: false,
                message: 'Identity proof is required for this role.'
            });
        }

        const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
        db.query(checkUserQuery, [email], async (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Server error while checking existing user',
                    error: err
                });
            }

            if (result.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this email already exists'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const is_verified = ([3, 4].includes(parseInt(role_id))) ? 0 : 1;

            const insertUserQuery = `
                INSERT INTO users (username, email, password, role_id, firstname, lastname, phonenumber, is_verified,prefix) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)
            `;

            db.query(insertUserQuery, [username, email, hashedPassword, role_id, firstname, lastname, phonenumber, is_verified,prefix], (err, result) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while inserting user',
                        error: err
                    });
                }

                const user_id = result.insertId; // Get the newly inserted user's ID

                if (identity_proof) {
                    const identity_proof_path = identity_proof 
                        ? `uploads/identity_proof/${identity_proof}` 
                        : null;
                    const insertIdentityQuery = `
                        INSERT INTO user_verifications (user_id, identity_proof, identity_type) 
                        VALUES (?, ?, ?)
                    `;

                    db.query(insertIdentityQuery, [user_id, identity_proof_path, identity_type], (err) => {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                message: 'Server error while inserting identity proof',
                                error: err
                            });
                        }

                        return res.status(201).json({
                            success: true,
                            message: is_verified
                                ? 'User created successfully'
                                : 'User created successfully, pending admin approval'
                        });
                    });
                } else {
                    return res.status(201).json({
                        success: true,
                        message: is_verified
                            ? 'User created successfully'
                            : 'User created successfully, pending admin approval'
                    });
                }
            });
        });

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Server Error'
            });
        }
    }
};




const appsignup = async (req, res) => {
    try {
        const { phonenumber, otp, prefix } = req.body;
        if (!phonenumber || !prefix) {
            return res.status(400).json({
                success: false,
                message: "Phone number and prefix are required",
            });
        }

        // Static OTP for login
        const STATIC_OTP = "1234";

        if (otp && otp !== STATIC_OTP) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Check if user exists
        User.findUserByPhone(phonenumber, (err, result) => {
            if (err) {
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
                    user,
                    token, // Include token in response
                });
            }

            // Assign default role_id = 5 (Customer)
            let role_id = req.body.role_id ?? 5;

            // If user doesn't exist, create new user
            User.createUser(phonenumber, role_id, prefix, (err, newUserResult) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Server error while creating user",
                        error: err,
                    });
                }

                const newUser = {
                    id: newUserResult.insertId,
                    phonenumber,
                    role_id,
                    role_name: "Customer", // Default role
                    username: "", // Assuming no username provided at signup
                };

                // Generate token for new user
                const token = jwt.sign(
                    { id: newUser.id, role_id: newUser.role_id, role: newUser.role_name, username: newUser.username },
                    process.env.JWT_SECRET,
                    { expiresIn: "7d" }
                );

                res.status(201).json({
                    success: true,
                    message: "User created and logged in successfully",
                    user: newUser,
                    token,
                });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};



// login user api
const loginUser = (req, res) => {
    const { email, password } = req.body;

    User.findByEmail(email, async (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error', error: err });
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 🚀 Role-based verification check
        if ([3, 4].includes(user.role_id) && user.is_verified === 0) {
            return res.status(403).json({ message: 'Your account is pending admin approval.' });
        }

        // ✅ Generate JWT token
        const token = jwt.sign(
            { id: user.id, role_id: user.role_id, role: user.role_name, username: user.username },
            process.env.JWT_SECRET
        );

        res.json({ message: 'Login successful', token });
    });
};


// dashboard accorsing to roleid
const getDashboard = (req, res) => {
    const { role_id } = req.user;

    switch (role_id) {
        case 1:
            res.json({ message: 'Super Admin Dashboard' });
            break;
        case 2:
            res.json({ message: 'Vendor Dashboard' });
            break;
        case 3:
            res.json({ message: 'Delivery Partner Dashboard' });
            break;
        case 4:
            res.json({ message: 'Customer Dashboard' });
            break;
        case 5:
            res.json({ message: 'Manager Dashboard' });
            break;    
        default:
            res.status(403).send('Access Denied');
    }
};
const getuserDetails = (req, res) => {
    const { id } = req.user;  // Get the user_id from the authenticated user (assumes JWT token contains id)

    // Call the findById method to get user data by user_id
    User.findById(id, (err, results) => {
        if (err) {
            console.error('Error fetching user details:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        // Check if the user with that id exists
        if (results.length === 0) {
            return res.status(404).json({ message: 'No user found with that id' });
        }
        const user = results[0];
        // Assuming results is an array, return the first user object from the array
        res.status(200).json(user);  // Return the first user object, not the entire array
    });
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
const fetchUser = (req, res) => {
    const { role_id } = req.user;

    User.fetchUsersByCondition(role_id, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
    });
};

const getUnverifiedVendors = (req, res) => {
    User.getUnverifiedUsersByRole(3, (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        res.json({ success: true, users });
    });
};

const getUnverifiedDeliveryPartners = (req, res) => {
    User.getUnverifiedUsersByRole(4, (err, users) => {
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
module.exports = { uploadFields, signup, loginUser, getDashboard, getuserDetails , fetchUser, updateUser,appsignup, getUnverifiedVendors, getUnverifiedDeliveryPartners,verifyUser};
