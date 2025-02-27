const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db'); // Import the existing connection

require('dotenv').config();

// signup api only by superadmins
// const signup = async (req, res) => {
//     try {
//         const { username, email, password, role_id, firstname, lastname, phonenumber } = req.body;
//         const loggedInUserRole = req.user ? req.user.role_id : 5; // The role of the logged-in user, from the token, or null if not logged in
        
//         // If role_id is not provided, default to 5 (Customer)
//         const finalRoleId = role_id || 5;  // Use a new variable to avoid redeclaring `role_id`
    
//         // **If the user is a Customer**, they can sign up without authentication
//         if (finalRoleId === 5) {  // Customer role
//             const hashedPassword = await bcrypt.hash(password, 10);
        
//             // Check if a user with the same email and role_id already exists
//             const checkUserQuery = 'SELECT * FROM users WHERE email = ? AND role_id = ?';
//             db.query(checkUserQuery, [email, finalRoleId], (err, result) => {
//                 if (err) {
//                     return res.status(500).json({
//                         success: false,
//                         message: 'Server error while checking existing user',
//                         error: err
//                     });
//                 }
        
//                 // If a user with the same email and role_id exists, return an error message
//                 if (result.length > 0) {
//                     return res.status(400).json({
//                         success: false,
//                         message: 'A user with this email and role already exists'
//                     });
//                 }
        
//                 // Proceed with inserting the user into the 'users' table
//                 const insertUserQuery = 'INSERT INTO `users` (username, email, password, role_id) VALUES (?, ?, ?, ?)';
//                 db.query(insertUserQuery, [username, email, hashedPassword, finalRoleId], (err, result) => {
//                     if (err) {
//                         return res.status(500).json({
//                             success: false,
//                             message: 'Server error while inserting user',
//                             error: err
//                         });
//                     }
        
//                     const userId = result.insertId;
        
//                     // Insert into the 'customers' table with the user_id and additional details
//                     const insertCustomerQuery = 'INSERT INTO customers (username, email, user_id, firstname, lastname, phonenumber, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
//                     db.query(insertCustomerQuery, [username, email, userId, firstname, lastname, phonenumber, hashedPassword], (err) => {
//                         if (err) {
//                             return res.status(500).json({
//                                 success: false,
//                                 message: 'Error inserting customer details',
//                                 error: err
//                             });
//                         }
        
//                         res.status(201).json({
//                             success: true,
//                             message: 'Customer created successfully'
//                         });
//                     });
//                 });
//             });
//             return;  // Exit early after customer creation process begins
//         }

//         // For other roles, the logged-in user needs to be authenticated and their role should be checked
//         if (!loggedInUserRole) {
//             return res.status(401).send('Authentication required');
//         }

//         // Restrict user creation based on roles
//         if (loggedInUserRole === 1) {  // SuperAdmin
//             if (![1, 2, 3, 4, 5].includes(role_id)) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'SuperAdmin can only create users with valid roles.'
//                 });
//             }
//         } else if (loggedInUserRole === 2) {  // Manager
//             if (![3, 4, 5].includes(role_id)) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'Manager can only create vendors and delievery partners.'
//                 });
//             }
//         } else if (loggedInUserRole === 3) {  // Vendor
//             if (![4, 5].includes(role_id)) {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'Vendor can only create delievery partners.'
//                 });
//             }
//         } else if (loggedInUserRole === 4) {  // Delivery Partner
//             if (role_id === 5) {  // Delivery Partner cannot create Customers
//                 return res.status(403).json({
//                     success: false,
//                     message: 'delivery partner can not create any users.'
//                 });
//             } else {
//                 return res.status(403).json({
//                     success: false,
//                     message: 'invalid role_id'
//                 });
//             }
//         } else {
//             return res.status(403).send('You do not have permission to create this role');
//         }
//         const hashedPassword = await bcrypt.hash(password, 10);       
//         // Check if the email already exists in the users table
//         const checkUserQuery = 'SELECT * FROM users WHERE email = ? AND role_id = ?';
//         db.query(checkUserQuery, [email, role_id], (err, result) => {
//             if (err) {
//                 return res.status(500).json({
//                     success: false,
//                     message: 'Error while checking for existing user',
//                     error: err
//                 });
//             }
        
//             // If a user with the same email and role_id already exists, send an error message
//             if (result.length > 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'A user with this email and role already exists'
//                 });
//             }
//             // Proceed to insert the new user into the 'users' table
//             const insertUserQuery = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
//             db.query(insertUserQuery, [username, email, hashedPassword, role_id], (err, result) => {
//                 if (err) {
//                     // Check if the error is a duplicate entry error for other columns (like email, but with a different role)
//                     if (err.code === 'ER_DUP_ENTRY') {
//                         return res.status(400).json({
//                             success: false,
//                             message: 'A user with this email already exists, but with a different role'
//                         });
//                     }
//                     return res.status(500).json({
//                         success: false,
//                         message: 'Server error, please try again later',
//                         error: err
//                     });
//                 }
            
//                 const userId = result.insertId;
                
//                 // Now insert into the corresponding table based on role_id and include firstname, lastname, phonenumber
//                 switch (role_id) {
//                     case 1: // SuperAdmin
//                         const insertSuperAdminQuery = 'INSERT INTO superadmins (username, email, user_id, firstname, lastname, phonenumber) VALUES (?, ?, ?, ?, ?, ?)';
//                         db.query(insertSuperAdminQuery, username, email, [userId, firstname, lastname, phonenumber], (err) => {
//                             if (err) return res.status(500).send(err);
//                             res.status(201).send('SuperAdmin created successfully');
//                         });
//                         break;

//                     case 2: // Manager
//                         const insertManagerQuery = 'INSERT INTO managers (username, email, user_id, firstname, lastname, phonenumber,password) VALUES (?, ?, ?, ?, ?, ?, ?)';
//                         db.query(insertManagerQuery, [username, email, userId, firstname, lastname, phonenumber,hashedPassword], (err) => {
//                             if (err) return res.status(500).send(err);
//                             res.status(201).send('Manager created successfully');
//                         });
//                         break;

//                     case 3: // Vendor
//                         const insertVendorQuery = 'INSERT INTO vendors (username, email, user_id, firstname, lastname, phonenumber,password) VALUES (?, ?, ?, ?, ?, ?, ?)';
//                         db.query(insertVendorQuery, [username, email, userId, firstname, lastname, phonenumber,hashedPassword], (err) => {
//                             if (err) return res.status(500).send(err);
//                             res.status(201).send('Vendor created successfully');
//                         });
//                         break;
                    
//                     case 4: // Delivery Partner
//                         const insertDeliveryPartnerQuery = 'INSERT INTO delivery_partners (username, email, user_id, firstname, lastname, phonenumber,password) VALUES (?, ?, ?, ?, ?, ?, ?)';
//                         db.query(insertDeliveryPartnerQuery, [username, email, userId, firstname, lastname, phonenumber,hashedPassword], (err) => {
//                             if (err) return res.status(500).send(err);
//                             res.status(201).send('Delivery Partner created successfully');
//                         });
//                         break;
//                     default:
//                         return res.status(400).send('Invalid role_id');
//                 }
//             });
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// };

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

        // Check if the user already exists with the same email
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
module.exports = { signup, loginUser, getDashboard, getuserDetails , fetchUser, updateUser};
