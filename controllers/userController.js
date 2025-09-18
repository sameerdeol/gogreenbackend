const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {User} = require('../models/User');
const {generateUniqueUsername} = require('../middleware/username');
const path = require('path');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const UserFcmToken = require('../models/fcmTokenModel');
const sendNotificationToUser = require('../utils/sendNotificationToUser');
const verifyGoogleIdToken = require('../middleware/googleAuthToken');
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');
const nodemailer = require('nodemailer');
const generateCustomId = require('../utils/generateCustomId');
const { generateOtp } = require('../utils/otpGenerator'); // adjust path if needed


require('dotenv').config();

const appsignup = async (req, res) => {
    try {
        const { phonenumber, otp, prefix, role_id } = req.body;

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
            prefix,
            phonenumber,
            role_id,
            is_verified: 1
        };

        // Check if user already exists
        User.findCustomerByPhone(phonenumber, role_id, (err, result) => {
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
                    is_new_user: false, // 🚀 Existing user
                    is_user_address_available: !!user.is_user_address_available // Convert to boolean
                });
            }

            // If user doesn't exist, insert
            User.insertUser(userData, (err, newUserResult) => {
                if (err) {
                    console.error("Error inserting user:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Server error while creating user",
                        error: err,
                    });
                }

                const newUserId = newUserResult.insertId;
                const token = jwt.sign(
                    { id: newUserId, role_id, phonenumber },
                    process.env.JWT_SECRET
                );

                return res.status(201).json({
                    success: true,
                    message: "User created and logged in successfully",
                    user: { id: newUserId, phonenumber, role_id },
                    token,
                    is_new_user: true, // 🚀 New user
                    is_user_address_available: false // New user → no addresses yet
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

        User.findByEmail(email, async (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Internal server error', error: err });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // ✅ Validate password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            if (user.role_id != 1) {
                return res.status(401).json({ message: 'you are not superadmin unauthorized' });
            }

            // ✅ Generate JWT token with expiration
            const token = jwt.sign(
                { id: user.id, role_id: user.role_id, role: user.role_name, username: user.username },
                process.env.JWT_SECRET
            );

            return res.json({ message: 'Login successful', token,admin_id: user.id});
        });
    } catch (err) {
        return res.status(500).json({ message: 'Something went wrong', error: err });
    }
};

const updateUser = async (req, res) => {
    const { dob, email, firstname, gender, lastname, phonenumber, role_id, user_id } = req.body;

    // Build userData object from request body
    const userData = { dob, email, firstname, gender, lastname, phonenumber };

    // Fetch user profile to get old image
    User.userProfile(user_id, role_id, async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If new profile_pic is uploaded, delete old one from S3 and upload new one
        if (req.files && req.files['profile_pic'] && req.files['profile_pic'].length > 0) {
            try {
                const file = req.files['profile_pic'][0];

                // Upload new image to S3
                const profile_pic = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
                userData.profile_pic = profile_pic;

                // Delete old image from S3 if it exists
                if (user.profile_pic) {
                    await deleteS3Image(user.profile_pic);
                }
            } catch (uploadError) {
                return res.status(500).json({ error: 'Profile picture upload failed' });
            }
        }

        // Update user in DB
        User.updateWorkerData(user_id, role_id, userData, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database update failed' });
            }
            res.status(200).json({ status: true, message: 'User updated successfully' });
        });
    });
};

const getUnverifiedUsers = (req, res) => {
    User.getUnverifiedUsers((err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }

        res.json({
            success: true,
            vendors: result.vendors,
            delivery_partners: result.delivery_partners
        });
    });
};

// const verifyUser = (req, res) => {
//     const userId = req.body.id;

//     User.verifyUser(userId, (err, result) => {
//         if (err) {
//             return res.status(500).json({ success: false, message: 'Database error', error: err });
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ success: false, message: 'User not found or already verified' });
//         }
//         res.json({ success: true, message: 'User verified successfully' });
//     });
// };


const verifyUser = (req, res) => {
    const { userId, verification_status } = req.body;

    // Check if the status is within the valid range
    if (![0, 1, 2, 3].includes(verification_status)) {
        return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    User.verifyUser(userId, verification_status, async (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found or status unchanged' });
        }

        let notificationTitle = '';
        let notificationBody = '';

        switch (verification_status) {
            case 0:
                notificationTitle = 'Verification Pending';
                notificationBody = 'Your account verification is pending. We’ll notify you once reviewed.';
                break;
            case 1:
                notificationTitle = 'Account Approved';
                notificationBody = 'Congratulations! Your account has been approved.';
                break;
            case 2:
                notificationTitle = 'Account Rejected';
                notificationBody = 'We’re sorry, but your account verification was rejected.';
                break;
            case 3:
                notificationTitle = 'Under Review';
                notificationBody = 'Your account is currently under review. We’ll update you soon.';
                break;
        }

        try {
            const notificationResult = await sendNotificationToUser({
                userId,
                title: notificationTitle,
                body: notificationBody,
                saveToDB: false
            });

            if (!notificationResult.success) {
                return res.status(500).json({
                    success: true,
                    message: 'Status updated, but failed to send notification',
                    notificationError: notificationResult.error
                });
            }

            res.json({ success: true, message: 'Status updated and notification sent.' });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Unexpected error during notification',
                error
            });
        }
    });
};



// Vendor and rider logic has been moved to vendorController.js and riderController.js


// UPDATE PASSWORD with previous password
const updatePassword = (req, res) => {
    const { previous_password, new_password, user_id } = req.body;

    User.findById(user_id, (err, user) => {
        if (err || !user) return res.status(404).json({ success: false, message: 'User not found' });

        bcrypt.compare(previous_password, user.password, (err, isMatch) => {
            if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect previous password' });

            User.updatePassword(user_id, new_password, (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Error updating password' });
                res.json({ success: true, message: 'Password updated successfully' });
            });
        });
    });
};

// SEND OTP for forgot password
const sendOTP = (req, res) => {
    const { email } = req.body;
    const otp =  generateOtp(4);;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    User.findByEmail(email, (err, user) => {
        if (err || !user) return res.status(404).json({ success: false, message: 'User not found' });
    console.log(user)
        User.storeOTP(email, otp, expiresAt, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Error storing OTP' });

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,  // e.g., 'smtp.webmail.com'
                port: process.env.SMTP_PORT,  // e.g., 587 or 465
                secure: process.env.SMTP_PORT === '465',  // true for SSL, false for TLS
                auth: {
                    user: process.env.EMAIL_USER,  // Your Webmail email address
                    pass: process.env.EMAIL_PASS,  // Your Webmail email password or app-specific password
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset OTP',
                text: `Your OTP for password reset is: ${otp}`,
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) return res.status(500).json({ success: false, message: 'Error sending email' });
                res.json({ success: true, message: 'OTP sent to email' });
            });
        });
    });
};

// VERIFY OTP before allowing reset
const verifyOtp = (req, res) => {
    const { email, otp } = req.body;

    User.verifyOTP(email, otp, (err, record) => {
        if (err || !record) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        res.json({ success: true, message: 'OTP verified successfully' });
    });
};


// RESET password using OTP
const resetPassword = (req, res) => {
    const { email, otp, new_password } = req.body;

    // Verify OTP first
    User.verifyOTP(email, otp, (err, otpRecord) => {
        if (err || !otpRecord) {
            return res.status(400).json({ success: false, message: 'already used,invalid or expired OTP' });
        }

        // OTP is valid, mark it as used
        User.markOTPAsUsed(email, otp, (err) => {
            if (err) {
                console.error('Error marking OTP as used:', err);
                return res.status(500).json({ success: false, message: 'Error marking OTP as used' });
            }

            // Continue with the rest of the password reset process
            User.findByEmail(email, (err, user) => {
                if (err || !user) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }

                // Update the user's password
                User.updatePassword(user.id, new_password, (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error resetting password' });
                    }

                    // Send confirmation email
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST,
                        port: process.env.SMTP_PORT,
                        secure: process.env.SMTP_PORT === '465',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS,
                        },
                    });

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: 'Password Reset Confirmation',
                        text: `Hi ${user.firstname || 'User'},\n\nYour password has been reset successfully. If this wasn't you, please contact support immediately.`,
                    };

                    transporter.sendMail(mailOptions, (error) => {
                        if (error) {
                            console.error('❌ Error sending confirmation email:', error);
                            return res.status(500).json({
                                success: true,
                                message: 'Password reset, but failed to send confirmation email.',
                            });
                        }

                        res.json({ success: true, message: 'Password reset successfully and confirmation email sent.' });
                    });
                });
            });
        });
    });
};

const changePassword = (req, res) => {
    const { old_password, new_password, user_id } = req.body;

    if (!user_id || !old_password || !new_password) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Step 1: Fetch user by ID
    User.findById(user_id, async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Step 2: Compare old password
        const isMatch = await bcrypt.compare(String(old_password), String(user.password));

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Old password is incorrect.' });
        }

        // Step 4: Update the password in the database
        User.updatePassword(user_id, new_password, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating password.' });
            }

            // Step 5: Send confirmation email
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Password Changed Successfully',
                text: `Hi ${user.firstname || 'User'},\n\nYour password has been successfully changed. If you didn't request this change, please contact support immediately.`,
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error('Error sending confirmation email:', error);
                    return res.status(500).json({
                        success: true,
                        message: 'Password changed, but failed to send confirmation email.',
                    });
                }

                res.json({ success: true, message: 'Password changed successfully and confirmation email sent.' });
            });
        });
    });
};

const workersProfile = (req, res) => {
    const { role_id, user_id } = req.body;

    // Check if the role_id is restricted
    if ([1, 2].includes(parseInt(role_id))) {
        return res.status(403).json({ success: false, message: 'You are not allowed to update the password.' });
    }

    // Step 1: Find the user by ID
    User.userProfile(user_id, role_id, (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
    
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
    
        return res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            data: user
        });
    });
};


const userBankDetails = async (req, res) => {
    try {
        const {
            user_id,
            role_id,
            account_holder_name,
            transit_number,
            institution_number,
            account_number,
            bank_name
        } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'user_id is required' });
        }

        const fileUpload = async (fieldName) => {
            if (req.files && req.files[fieldName]) {
                const file = req.files[fieldName][0];
                return await uploadToS3(file.buffer, file.originalname, fieldName, file.mimetype);
            }
            return undefined;
        };

        const userData = {
            role_id,
            account_holder_name,
            transit_number,
            institution_number,
            account_number,
            bank_name,
            void_cheque: await fileUpload('void_cheque')
        };
        const filteredData = Object.fromEntries(
            Object.entries(userData).filter(([_, value]) => value !== undefined && value !== null)
        );

        User.addBankDetails(user_id, filteredData, (err, result) => {
            if (err) {
                console.error('DB Error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error saving bank details',
                    error: err.message || err
                });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No user found with the provided user_id'
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Bank details stored successfully'
            });
        });

    } catch (error) {
        console.error('Unexpected Server Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    }
};

// Vendor and rider logic has been moved to vendorController.js and riderController.js


module.exports = { loginadmin, updateUser, appsignup, getUnverifiedUsers, verifyUser, updatePassword, resetPassword, sendOTP, verifyOtp, changePassword, workersProfile, userBankDetails};
