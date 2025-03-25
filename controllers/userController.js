const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db'); // Import the existing connection
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const fs = require('fs');

require('dotenv').config();

const signup = async (req, res) => {
    try {
        const { username, email, password, role_id, firstname, lastname, phonenumber, prefix } = req.body;

        // Restrict role_id 1 (Superadmin) & 2 (Manager)
        if ([1, 2].includes(parseInt(role_id))) {
            return res.status(403).json({
                success: false,
                message: 'You are not allowed to create an account with this role.'
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

            // Insert into `users` table (only ID & role_id)
            const insertUserQuery = `INSERT INTO users (role_id) VALUES (?)`;
            db.query(insertUserQuery, [role_id], (err, userResult) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while inserting user',
                        error: err
                    });
                }

                const user_id = userResult.insertId; // Get inserted user's ID

                // Insert into respective role table
                let insertRoleQuery, roleData;
                if (role_id == 3) { // Vendors
                    insertRoleQuery = `INSERT INTO vendors (user_id, username, email, password, firstname, lastname, phonenumber, prefix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    roleData = [user_id, username, email, hashedPassword, firstname, lastname, phonenumber, prefix];
                } else if (role_id == 4) { // Delivery Partners
                    insertRoleQuery = `INSERT INTO delivery_partners (user_id, username, email, password, firstname, lastname, phonenumber, prefix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    roleData = [user_id, username, email, hashedPassword, firstname, lastname, phonenumber, prefix];
                } else if (role_id == 5) { // Customers
                    insertRoleQuery = `INSERT INTO customers (user_id, username, email, password, firstname, lastname, phonenumber, prefix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    roleData = [user_id, username, email, hashedPassword, firstname, lastname, phonenumber, prefix];
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid role_id'
                    });
                }

                db.query(insertRoleQuery, roleData, (err) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: `Server error while inserting into role-specific table`,
                            error: err
                        });
                    }

                    return res.status(201).json({
                        success: true,
                        message: 'User created successfully'
                    });
                });
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
        const { phonenumber, otp, prefix} = req.body;
        if (!phonenumber || !prefix) {
            return res.status(400).json({
                success: false,
                message: "Phone number, prefix, and firstname are required",
            });
        }

        const STATIC_OTP = 1234;
        if (otp && otp !== STATIC_OTP) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Check if user exists
        User.findCustomerByPhone(phonenumber, (err, result) => {
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
                    token,
                });
            }

            let role_id = req.body.role_id ?? 5;

            // Insert into `users` table
            User.createUser(role_id, (err, newUserResult) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Server error while creating user",
                        error: err,
                    });
                }

                const newUserId = newUserResult.insertId;

                // Insert into `customers` table
                User.createCustomer(newUserId,phonenumber, prefix, (err) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Server error while creating customer",
                            error: err,
                        });
                    }

                    const newUser = {
                        id: newUserId,
                        phonenumber,
                        role_id,
                    };

                    const token = jwt.sign(
                        { id: newUser.id, role_id: newUser.role_id},
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
const loginadmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email,password)

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

const vendorRiderSignup = (req, res) => {
    try {
        const { username, email, password, role_id, phonenumber, prefix } = req.body;

        // Check if email exists in any role table
        const checkUserQuery = `
            SELECT * FROM vendors WHERE email = ?
            UNION 
            SELECT * FROM delivery_partners WHERE email = ?
        `;

        db.query(checkUserQuery, [email, email], async (err, result) => {
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

            // Insert into `users` table (only ID & role_id)
            const insertUserQuery = `INSERT INTO users (role_id) VALUES (?)`;
            db.query(insertUserQuery, [role_id], (err, userResult) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while inserting user',
                        error: err
                    });
                }

                const user_id = userResult.insertId; // Get inserted user's ID

                // Insert into respective role table
                let insertRoleQuery, roleData;
                if (role_id == 3) { // Vendors
                    insertRoleQuery = `INSERT INTO vendors (user_id, username, email, password, phonenumber, prefix) VALUES (?, ?, ?, ?, ?, ?)`;
                    roleData = [user_id, username, email, hashedPassword, phonenumber, prefix];
                } else if (role_id == 4) { // Delivery Partners
                    insertRoleQuery = `INSERT INTO delivery_partners (user_id, username, email, password, phonenumber, prefix) VALUES (?, ?, ?, ?, ?, ?)`;
                    roleData = [user_id, username, email, hashedPassword, phonenumber, prefix];
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid role_id'
                    });
                }

                db.query(insertRoleQuery, roleData, (err) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: `Server error while inserting into role-specific table`,
                            error: err
                        });
                    }

                    return res.status(201).json({
                        success: true,
                        message: 'User created successfully'
                    });
                });
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

const createSuperadminManagers = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, prefix, phonenumber, role_id } = req.body;

        if (!username || !email || !password || !firstName || !lastName || !phonenumber || !role_id) {
            return res.status(400).json({ error: "All fields are required" });
        }

        let checkUserSQL;
        if (role_id === 1) {
            checkUserSQL = `SELECT * FROM superadmin WHERE email = ? OR username = ?`;
        } else if (role_id === 2) {
            checkUserSQL = `SELECT * FROM managers WHERE email = ? OR username = ?`;
        } else {
            return res.status(400).json({ error: "Invalid role_id" });
        }

        // Check if user already exists in the respective table
        const [existingUser] = await db.promise().query(checkUserSQL, [email, username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "User with this email or username already exists" });
        }

        const hashedPassword = bcrypt.hashSync(password, 10); // Hash password before storing

        // Insert user into 'users' table
        const sqlUser = `INSERT INTO users (role_id) VALUES (?)`;
        const [userResult] = await db.promise().query(sqlUser, [role_id]);

        const userId = userResult.insertId;
        let sqlInsert;
        let tableName;

        if (role_id === 1) {
            sqlInsert = `INSERT INTO superadmin (username, user_id, firstname, lastname, prefix, phone, email, password, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            tableName = "superadmin";
        } else {
            sqlInsert = `INSERT INTO managers (username, user_id, firstname, lastname, prefix, phone, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            tableName = "managers";
        }

        // Insert into the correct table based on role
        await db.promise().query(sqlInsert, [username, userId, firstName, lastName, prefix, phonenumber, email, hashedPassword, role_id]);

        res.status(201).json({ message: `${tableName} created successfully`, userId });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




module.exports = { uploadFields, signup, loginadmin, getuserDetails , fetchUser, updateUser,appsignup, getUnverifiedVendors, getUnverifiedDeliveryPartners,verifyUser,vendorRiderSignup,createSuperadminManagers};
