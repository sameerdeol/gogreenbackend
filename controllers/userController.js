const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db'); // Import the existing connection

require('dotenv').config();

// signup api only by superadmins
const signup = async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;
        const loggedInUserRole = req.user ? req.user.role_id : 5; // The role of the logged-in user, from the token, or null if not logged in

        // **If the user is a Customer**, they can sign up without authentication
        if (role_id === 5) {  // Customer role
            const hashedPassword = await bcrypt.hash(password, 10);
        
            // Insert into the 'users' table
            const insertUserQuery = 'INSERT INTO `users` (username, email, password, role_id) VALUES (?, ?, ?, ?)';
            db.query(insertUserQuery, [username, email, hashedPassword, role_id], (err, result) => {
                if (err) return res.status(500).send(err);
        
                const userId = result.insertId;  // Get the userId from the insert result
        
                // Insert into the 'customers' table with the user_id
                const insertCustomerQuery = 'INSERT INTO customers (user_id) VALUES (?)';
                db.query(insertCustomerQuery, [userId], (err) => {
                    if (err) return res.status(500).send(err);
        
                    res.status(201).send('Customer created successfully');
                });
            });
            return;  // Exit early after customer creation
        }

        // For other roles, the logged-in user needs to be authenticated and their role should be checked
        if (!loggedInUserRole) {
            return res.status(401).send('Authentication required');
        }

        // Restrict user creation based on roles
        if (loggedInUserRole === 1) {  // SuperAdmin
            if (![1, 2, 3, 4, 5].includes(role_id)) {
                return res.status(400).send('SuperAdmin can only create users with valid roles.');
            }
        } else if (loggedInUserRole === 2) {  // Manager
            if (![3, 4, 5].includes(role_id)) {
                return res.status(400).send('Manager can only create Vendors, Delivery Partners, or Customers.');
            }
        } else if (loggedInUserRole === 3) {  // Vendor
            if (![4, 5].includes(role_id)) {
                return res.status(400).send('Vendor can only create Delivery Partners or Customers.');
            }
        } else if (loggedInUserRole === 4) {  // Delivery Partner
            if (role_id === 5) {  // Delivery Partner cannot create Customers
                return res.status(400).send('Delivery Partner cannot create Customers.');
            } else {
                return res.status(400).send('Delivery Partner cannot create other users.');
            }
        } else if (loggedInUserRole === 5) {  // Customer
            return res.status(400).send('Customer cannot create other users.');
        } else {
            return res.status(403).send('You do not have permission to create this role');
        }
        
        // Check if the email already exists in the users table
        const checkQuery = 'SELECT * FROM users WHERE email = ?';
        db.query(checkQuery, [email], (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.length > 0) {
                return res.status(400).send('User already exists');
            }

            // Hash the password
            const hashedPassword = bcrypt.hashSync(password, 10);

            // Insert into `users` table
            const insertUserQuery = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
            db.query(insertUserQuery, [username, email, hashedPassword, role_id], (err, result) => {
                if (err) return res.status(500).send(err);

                const userId = result.insertId;
                
                // Now insert into the corresponding table based on role_id
                switch (role_id) {
                    case 1: // SuperAdmin
                        const insertSuperAdminQuery = 'INSERT INTO superadmins (user_id) VALUES (?)';
                        db.query(insertSuperAdminQuery, [userId], (err) => {
                            if (err) return res.status(500).send(err);
                            res.status(201).send('SuperAdmin created successfully');
                        });
                        break;

                    case 2: // Manager
                        const insertManagerQuery = 'INSERT INTO managers (user_id) VALUES (?)';
                        db.query(insertManagerQuery, [userId], (err) => {
                            if (err) return res.status(500).send(err);
                            res.status(201).send('Manager created successfully');
                        });
                        break;

                    case 3: // Vendor
                        const insertVendorQuery = 'INSERT INTO vendors (user_id) VALUES (?)';
                        db.query(insertVendorQuery, [userId], (err) => {
                            if (err) return res.status(500).send(err);
                            res.status(201).send('Vendor created successfully');
                        });
                        break;
                    
                    case 4: // Delivery Partner
                        const insertDeliveryPartnerQuery = 'INSERT INTO delivery_partners (user_id) VALUES (?)';
                        db.query(insertDeliveryPartnerQuery, [userId], (err) => {
                            if (err) return res.status(500).send(err);
                            res.status(201).send('Delivery Partner created successfully');
                        });
                        break;
                    default:
                        return res.status(400).send('Invalid role_id');
                }
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// login user api
const loginUser = (req, res) => {
    const { email, password } = req.body;

    User.findByEmail(email, async (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('User not found');

        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).send('Invalid credentials');

        const token = jwt.sign(
            { id: user.id, role_id: user.role_id, role: user.role_name },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
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

// Create manager by superadmins
const createManager = async (req, res) => {
    const { username, email, password } = req.body;

    // Validate the input
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if the email is already in use
        const [existingUser] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new manager into the database with role_id = 5
        await pool
            .promise()
            .query('INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)', [
                username,
                email,
                hashedPassword,
                5, // role_id for Manager
            ]);

        res.status(201).json({ message: 'Manager created successfully' });
    } catch (error) {
        console.error('Error creating manager:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { signup, loginUser, getDashboard,createManager  };
