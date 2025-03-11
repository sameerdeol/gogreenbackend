const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db'); // Import the existing connection

require('dotenv').config();

const signup = async (req, res) => {
    try {
        const { username, email, password, role_id, firstname, lastname, phonenumber } = req.body;
        const loggedInUserRole = req.user ? req.user.role_id : null; // Get the role of the logged-in user

        // If no user is logged in, restrict user creation
        if (!loggedInUserRole) {
            return res.status(401).send('Authentication required');
        }

        // Restrict user creation based on roles
        if (loggedInUserRole === 1) {  // SuperAdmin
            if (![1, 2, 3, 4, 5].includes(role_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'SuperAdmin can only create users with valid roles.'
                });
            }
        } else if (loggedInUserRole === 2) {  // Manager
            if (![3, 4, 5].includes(role_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Manager can only create vendors and delivery partners.'
                });
            }
        } else if (loggedInUserRole === 3) {  // Vendor
            if (![4, 5].includes(role_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Vendor can only create delivery partners.'
                });
            }
        } else if (loggedInUserRole === 4) {  // Delivery Partner
            return res.status(403).json({
                success: false,
                message: 'Delivery partner cannot create any users.'
            });
        } else {
            return res.status(403).send('You do not have permission to create this role');
        }

        // Check if the user already exists with the same phone
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

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into users table
            const insertUserQuery = `
                INSERT INTO users (username, email, password, role_id, firstname, lastname, phonenumber) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;

            db.query(insertUserQuery, [username, email, hashedPassword, role_id, firstname, lastname, phonenumber], (err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while inserting user',
                        error: err
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'User created successfully'
                });
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};


// app signup
const appsignup = async (req, res) => {
    try {
        const { phonenumber, otp , prefix } = req.body;

        if (!phonenumber & !prefix) {
            return res.status(400).json({
                success: false,
                message: "Phone number and prefix is required",
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
                // User exists, proceed to login
                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    user: result[0],
                });
            }

            // Assign default role_id = 5 (Customer)
            let role_id = req.body.role_id ?? 5;

            // If user doesn't exist, create new user
            User.createUser(phonenumber, role_id,prefix, (err, newUserResult) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Server error while creating user",
                        error: err,
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "User created and logged in successfully",
                    user: {
                        id: newUserResult.insertId,
                        phonenumber,
                        role_id, // Include role_id in the response
                    },
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

        const token = jwt.sign(
            { id: user.id, role_id: user.role_id, role: user.role_name ,username:user.username },
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
module.exports = { signup, loginUser, getDashboard, getuserDetails , fetchUser, updateUser,appsignup};
