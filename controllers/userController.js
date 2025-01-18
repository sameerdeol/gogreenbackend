const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db'); // Import the existing connection

require('dotenv').config();

// signup api only by superadmins
const signup = async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Get the role_id of the currently logged-in user (SuperAdmin, Manager, etc.)
        const decodedToken = jwt.verify(req.token, process.env.JWT_SECRET);
        const loggedInUserRole = decodedToken.role_id;

        // Role-based validation
        if (loggedInUserRole === 1) {
            // SuperAdmin can create Managers
            if (role_id === 2) {
                await User.create(username, email, hashedPassword, role_id, (err) => {
                    if (err) return res.status(500).send(err);
                    res.status(201).send('Manager created successfully');
                });
            } else {
                return res.status(403).send('SuperAdmin can only create Managers');
            }
        } else if (loggedInUserRole === 2) {
            // Manager can create Vendors and Delivery Partners
            if (role_id === 3 || role_id === 4) {
                await User.create(username, email, hashedPassword, role_id, (err) => {
                    if (err) return res.status(500).send(err);
                    res.status(201).send('Vendor/Delivery Partner created successfully');
                });
            } else {
                return res.status(403).send('Managers can only create Vendors or Delivery Partners');
            }
        } else if (loggedInUserRole === 5) {
            // Customer can only sign up without restriction
            if (role_id !== 5) {
                return res.status(403).send('Customers can only create their own account');
            } else {
                await User.create(username, email, hashedPassword, role_id, (err) => {
                    if (err) return res.status(500).send(err);
                    res.status(201).send('Customer registered successfully');
                });
            }
        } else {
            return res.status(403).send('Unauthorized role');
        }
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
        const [existingUser] = await pool.promise().query('SELECT * FROM staff_users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new manager into the database with role_id = 5
        await pool
            .promise()
            .query('INSERT INTO staff_users (username, email, password, role_id) VALUES (?, ?, ?, ?)', [
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
