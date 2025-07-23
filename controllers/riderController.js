const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { generateUniqueUsername } = require('../middleware/username');
const generateCustomId = require('../utils/generateCustomId');
const path = require('path');
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');
require('dotenv').config();

const riderSignup = async (req, res) => {
    try {
        req.body.role_id = 4;
        const {
            firstname,
            lastname,
            email,
            password,
            role_id,
            phonenumber,
            prefix,
            googleauthToken,
        } = req.body;

        let finalEmail = email;
        let finalFirstname = firstname;
        let finalLastname = lastname;
        let finalPassword = password;
        let hashedPassword = null;
        let custom_id = null;

        function tryGenerateUniqueId(attemptsLeft, callback) {
            if (attemptsLeft === 0) return callback(new Error('Failed to generate unique ID'), null);
            const generatedId = generateCustomId(role_id);
            User.checkCustomIdExists(generatedId, (err, exists) => {
                if (err) return callback(err);
                if (exists) {
                    tryGenerateUniqueId(attemptsLeft - 1, callback);
                } else {
                    callback(null, generatedId);
                }
            });
        }

        tryGenerateUniqueId(5, async (err, uniqueId) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to generate unique ID', error: err.message });
            }
            custom_id = uniqueId;
            if (googleauthToken) {
                try {
                    const decoded = await require('../middleware/googleAuthToken')(googleauthToken);
                    finalEmail = decoded.email;
                    finalFirstname = decoded.name?.split(" ")[0] || "User";
                    finalLastname = decoded.name?.split(" ")[1] || "";
                    finalPassword = decoded.user_id || "defaultUserID";
                    hashedPassword = await bcrypt.hash(finalPassword, 10);
                } catch (err) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid Google token",
                    });
                }
            } else {
                if (!password || password.trim() === "") {
                    return res.status(400).json({
                        success: false,
                        message: "Password is required",
                    });
                }
                hashedPassword = await bcrypt.hash(password, 10);
            }
            const { username } = generateUniqueUsername(finalFirstname, phonenumber);
            User.findByEmail(finalEmail, (err, existingUser) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Error checking user existence",
                        error: err.message,
                    });
                }
                if (existingUser) {
                    const token = jwt.sign({
                        user_id: existingUser.id,
                        username: existingUser.username,
                        email: existingUser.email,
                        role_id: existingUser.role_id,
                        firstname: existingUser.firstname,
                        lastname: existingUser.lastname,
                        is_verified: existingUser.is_verified,
                    }, process.env.JWT_SECRET);
                    if (existingUser.role_id !== 4) {
                        return res.status(409).json({
                            success: false,
                            message: `You already have an account as a ${existingUser.role_id === 3 ? "vendor" : "rider"}. Cannot register as a different role.`,
                            token,
                            is_verified: existingUser.is_verified,
                            verification_Done: existingUser.verification_applied,
                        });
                    }
                    return res.status(200).json({
                        success: true,
                        message: existingUser.is_verified
                            ? "User already exists and is verified"
                            : "User already exists but not verified. Complete profile.",
                        token,
                        is_verified: existingUser.is_verified,
                        verification_Done: existingUser.verification_applied,
                    });
                }
                const userData = {
                    username,
                    firstname: finalFirstname,
                    lastname: finalLastname,
                    password: hashedPassword,
                    prefix,
                    phonenumber,
                    email: finalEmail,
                    role_id: 4,
                    custom_id,
                    is_verified: 0,
                };
                User.insertUser(userData, (err, userResult) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Error creating user",
                            error: err.message,
                        });
                    }
                    const token = jwt.sign({
                        user_id: userResult.insertId,
                        username,
                        email: finalEmail,
                        role_id: 4,
                        firstname: finalFirstname,
                        lastname: finalLastname,
                        is_verified: 0,
                    }, process.env.JWT_SECRET);
                    return res.status(201).json({
                        success: true,
                        message: "User created successfully",
                        token,
                        is_verified: 0,
                        verification_Done: false,
                        custom_id,
                    });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

const riderLogin = async (req, res) => {
    try {
        req.body.role_id = 4;
        const { email, password, googleauthToken, role_id } = req.body;
        if (!role_id) {
            return res.status(401).json({ success: false, message: "role_id is mandatory." });
        }
        let finalemail = email;
        let finalpassword = password;
        if (googleauthToken) {
            try {
                const decoded = await require('../middleware/googleAuthToken')(googleauthToken);
                finalemail = decoded.email;
                finalpassword = decoded.user_id;
            } catch (err) {
                return res.status(401).json({ success: false, message: "Invalid Google token" });
            }
        }
        if (!finalemail || !finalpassword) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }
        User.findByEmailForVendorRider(finalemail, 4, async (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Internal server error", error: err });
            }
            if (!results || !results.success) {
                return res.status(404).json({ success: false, message: results?.message || "User not found" });
            }
            const user = results.user;
            const isValid = await bcrypt.compare(String(finalpassword), String(user.password));
            if (!isValid) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            const token = jwt.sign(
                {
                    user_id: user.id,
                    role_id: user.role_id,
                    username: user.username,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email,
                    phonenumber: user.phonenumber
                },
                process.env.JWT_SECRET
            );
            return res.json({
                success: true,
                message: "Login successful",
                token,
                is_verified: user.is_verified,
                verification_applied: user.verification_applied
            });
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Authentication error", error });
    }
};

const riderVerification = async (req, res) => {
    try {
        req.body.role_id = 4;
        const {
            role_id,
            user_id,
            license_number,
            license_expiry_date,
            vehicle_owner_name,
            vehicle_registration_number,
            vehicle_type,
            registraion_expiry_date
        } = req.body;

        if ([1, 2].includes(parseInt(role_id))) {
            return res.status(403).json({ success: false, message: 'You are not allowed to create an account with this role.' });
        }

        const fileUpload = async (fieldName) => {
            if (req.files && req.files[fieldName]) {
                const file = req.files[fieldName][0];
                return await uploadToS3(file.buffer, file.originalname, fieldName, file.mimetype);
            }
            return undefined;
        };

        // Convert callback to Promise
        const userStatus = await new Promise((resolve, reject) => {
            User.checkVerificationStatus(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!userStatus) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (userStatus.verification_applied) {
            return res.status(400).json({ success: false, message: 'Verification already submitted.' });
        }
        if (userStatus.is_verified) {
            return res.status(400).json({ success: false, message: 'You are already verified.' });
        }

        const userData = {
            user_id,
            license_number,
            license_expiry_date,
            worker_profilePic: await fileUpload('worker_profilePic'),
            rider_license_image: await fileUpload('rider_license_image'),
            vehicle_owner_name,
            vehicle_registration_number,
            vehicle_type,
            registraion_expiry_date,
            registration_doc: await fileUpload('registration_doc'),
            identity_proof: await fileUpload('identity_proof')
        };

        await new Promise((resolve, reject) => {
            User.insertUserVerification(role_id, userData, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(201).json({ success: true, message: 'Verification details stored successfully' });

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};

const riderPersonalDetails = async (req, res) => {
    try {
        const role_id = 4; // Delivery Partner

        const {
            user_id,
            address,
            dob,
            other_phone_number
        } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const fileUpload = async (fieldName) => {
            if (req.files && req.files[fieldName]) {
                const file = req.files[fieldName][0];
                return await uploadToS3(file.buffer, file.originalname, fieldName, file.mimetype);
            }
            return undefined;
        };

        const userStatus = await new Promise((resolve, reject) => {
            User.checkVerificationStatus(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!userStatus) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userData = {
            user_id,
            address,
            dob,
            other_phone_number,
            profile_pic: await fileUpload('profile_pic'),
            identity_proof: await fileUpload('identity_proof'),
        };

        await new Promise((resolve, reject) => {
            User.updateRiderPersonalDetails(role_id, userData, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(201).json({ success: true, message: 'Verification details stored successfully' });

    } catch (error) {
        console.error("Error in riderPersonalDetails:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};


const updateRiderProfile = async (req, res) => {
    req.body.role_id = 4;
    const { role_id, firstname, lastname, store_name, store_address, email, sin_code, phonenumber, user_id, prefix, license_number, gender, dob, vendor_lat, vendor_lng } = req.body;
    let profile_pic = null;
    let vendor_thumb = null;
    if (req.files && req.files['worker_profilePic'] && req.files['worker_profilePic'].length > 0) {
        const file = req.files['worker_profilePic'][0];
        profile_pic = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
    }
    if (req.files && req.files['vendor_thumbnail'] && req.files['vendor_thumbnail'].length > 0) {
        const file = req.files['vendor_thumbnail'][0];
        vendor_thumb = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
    }
    if ([1, 2].includes(parseInt(role_id))) {
        return res.status(403).json({ success: false, message: 'You are not allowed to update the password.' });
    }
    User.userProfile(user_id,role_id, async (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (profile_pic && user.profile_pic) {
            await deleteS3Image(user.profile_pic);
        }
        if (vendor_thumb && user.vendor_thumb) {
            await deleteS3Image(user.vendor_thumb);
        }
        User.findByEmailOrPhone(email, phonenumber, (err, existingUser) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Server error", error: err });
            }
            if (existingUser && existingUser.id !== user_id) {
                return res.status(400).json({
                    success: false,
                    message: existingUser.email === email
                        ? "This email is already in use by another user."
                        : "This phone number is already in use by another user."
                });
            }
            const userData = { firstname, prefix, phonenumber, email, store_name, store_address, sin_code, license_number, lastname, gender, dob, vendor_lat, vendor_lng };
            if (profile_pic) userData.profile_pic = profile_pic;
            if (vendor_thumb) userData.vendor_thumb = vendor_thumb;
            User.updateWorkerData(user_id, role_id, userData, (err, results) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({
                            success: false,
                            message: err.sqlMessage.includes('email')
                                ? "This email is already registered with another user."
                                : "This phone number is already registered with another user."
                        });
                    }
                    return res.status(500).json({ success: false, message: 'Database query failed', error: err });
                }
                res.status(200).json({ success: true, message: 'User updated successfully' });
            });
        });
    });
};

const riderProfile = (req, res) => {
    req.body.role_id = 4;
    const { role_id, user_id } = req.body;
    if ([1, 2].includes(parseInt(role_id))) {
        return res.status(403).json({ success: false, message: 'You are not allowed to update the password.' });
    }
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

const vehicleDetails = (req, res) => {
    req.body.role_id = 4;
    const { role_id, user_id } = req.body;

    if (parseInt(role_id) !== 4) {
        return res.status(403).json({ success: false, message: 'Not valid role id' });
    }

    User.vehicleDetails(user_id, role_id, (err, vehicle) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }

        if (!vehicle || vehicle.length === 0) {
            return res.status(404).json({ success: false, message: 'vehicle not found' });
        }

        return res.status(200).json({
            success: true,
            message: "vehicle details retrieved successfully",
            data: vehicle
        });
    });
};


const riderStatus = (req, res) => {
    req.body.role_id = 4;
    const { user_id, status, role_id } = req.body;
    if ([1, 2].includes(parseInt(role_id))) {
        return res.status(403).json({ success: false, message: 'You are not allowed to update the status.' });
    }
    User.userStatus(user_id, status, (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            message: "User status updated successfully",
        });
    });
};

const updateRiderLocation = (req, res) => {
    const { user_id, rider_lat, rider_lng } = req.body;
    User.updateRiderLocation(user_id, rider_lat, rider_lng, (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'rider not found' });
        }
        return res.status(200).json({
            success: true,
            message: "rider location updated successfully",
        });
    });
};

const allRidersforAdmin = (req, res) => {
    User.getallRidersForAdmin(null,(err, users) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err
            });
        }
        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Rider found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Riders retrieved successfully',
            data: users
        });
    });
};

const allRidersforAdminbyRiderID = (req, res) => {
    const { rider_id } = req.params;
    if (!rider_id || isNaN(rider_id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing vendor_id'
        });
    }
    User.getallRidersForAdmin(rider_id, (err, users) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err
            });
        }
        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rider not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Rider retrieved successfully',
            data: users[0]
        });
    });
};

module.exports = {
    riderSignup,
    riderLogin,
    riderVerification,
    updateRiderProfile,
    riderProfile,
    riderStatus,
    updateRiderLocation,
    allRidersforAdmin,
    allRidersforAdminbyRiderID,
    riderPersonalDetails,
    vehicleDetails
}; 