const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { generateUniqueUsername } = require('../middleware/username');
const generateCustomId = require('../utils/generateCustomId');
const path = require('path');
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');
require('dotenv').config();

const vendorSignup = async (req, res) => {
    try {
        req.body.role_id = 3;
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
                    if (existingUser.role_id !== 3) {
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
                    role_id: 3,
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
                        role_id: 3,
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

const vendorLogin = async (req, res) => {
    try {
        req.body.role_id = 3;
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

        User.findByEmailForVendorRider(finalemail, 3, async (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Internal server error", error: err });
            }

            if (!results || !results.success) {
                return res.status(404).json({ success: false, message: results?.message || "User not found" });
            }

            const user = results.user;

            // ❌ Block only if deactivated by admin
            if (user.status === 0 && user.deactivated_by === 'admin') {
                return res.status(403).json({ success: false, message: "You have been deactivated by admin." });
            }

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


const vendorVerification = async (req, res) => {
    try {
        req.body.role_id = 3;
        const { role_id, storename, storeaddress, sincode, countrystatus, user_id, license_number, business_reg_number, vendor_type_id, vendor_start_time, vendor_close_time } = req.body;

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

        // Wrap callback in Promise
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
            storename,
            storeaddress,
            sincode,
            countrystatus,
            identity_proof: await fileUpload('identity_proof'),
            license_number,
            worker_profilePic: await fileUpload('worker_profilePic'),
            store_image: await fileUpload('store_image'),
            business_reg_number,
            vendor_type_id: Array.isArray(vendor_type_id) ? vendor_type_id.join(',') : vendor_type_id,
            vendor_start_time,
            vendor_close_time
        };

        // Wrap insertUserVerification in a Promise too
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
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};


const updateVendorProfile = async (req, res) => {
    req.body.role_id = 3;
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
};

const vendorProfile = (req, res) => {
    req.body.role_id = 3;
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

const vendorStatus = (req, res) => {
    const { user_id, status, role_id, vendor_start_time, vendor_close_time } = req.body;

    if (!user_id || typeof status === 'undefined' || !role_id) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    let deactivated_by = null;

    if (parseInt(status) === 0) {
        if ([1, 2].includes(parseInt(role_id))) {
            deactivated_by = 'admin';
        } else if (parseInt(role_id) === 3) {
            deactivated_by = 'self';
        } else {
            return res.status(403).json({ success: false, message: 'Invalid role for status update.' });
        }
    }

    const updateFields = {
        user_id,
        status,
        deactivated_by
    };

    if (vendor_start_time) updateFields.vendor_start_time = vendor_start_time;
    if (vendor_close_time) updateFields.vendor_close_time = vendor_close_time;

    User.userStatus(updateFields, (err, user) => {
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





const allVendors = (req, res) => {
    const { user_id, vendor_type_id } = req.body;

    let filterIds = [];

    if (Array.isArray(vendor_type_id)) {
        // Already an array (correct format)
        filterIds = vendor_type_id.map(id => parseInt(id)).filter(id => !isNaN(id));
    } else if (typeof vendor_type_id === 'string') {
        // Comma-separated string
        filterIds = vendor_type_id
            .split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id));
    }

    User.allVendors(user_id, filterIds, (err, users) => {
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
                message: 'No vendors found'
            });
        }

        const vendors = users.map(user => ({
            ...user,
            featured_images: user.featured_images
                ? user.featured_images.split(',')
                : []
        }));

        return res.status(200).json({
            success: true,
            message: 'Vendors retrieved successfully',
            data: vendors
        });
    });
};


const allVendorsforAdmin = (req, res) => {
    const filter = req.query.filter; // 'active' or undefined

    User.getallVendorsForAdmin(null, (err, users) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err
            });
        }

        if (filter === 'active') {
            // Filter verified vendors (status = 1 or is_verified = 1 depending on your data)
            const allVendors = users.filter(vendor => vendor.status === 1);

            // Return only specific fields
            const filteredData = allVendors.map(vendor => ({
                store_image: vendor.store_image,
                store_name: vendor.store_name,
                vendor_id: vendor.vendor_id
            }));

            return res.status(200).json({
                success: true,
                message: 'Active vendors retrieved successfully',
                data: filteredData
            });
        }

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No vendors found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Vendors retrieved successfully',
            data: users
        });
    });
};


const allVendorsforAdminbyVendorID = (req, res) => {
    const { vendor_id } = req.params;
    if (!vendor_id || isNaN(vendor_id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing vendor_id'
        });
    }
    User.getallVendorsForAdmin(vendor_id, (err, users) => {
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
                message: 'Vendor not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Vendor retrieved successfully',
            data: users[0]
        });
    });
};

const storeBusinessDetails = async (req, res) => {
    try {
        const {
            user_id,
            bussiness_license_number,
            gst_number
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
            bussiness_license_number,
            gst_number,
            profile_pic: await fileUpload('profile_pic'),
            bussiness_license_number_pic: await fileUpload('bussiness_license_number_pic'),
            gst_number_pic: await fileUpload('gst_number_pic')
        };

        const filteredData = Object.fromEntries(
            Object.entries(userData).filter(([_, value]) => value !== undefined && value !== null)
        );

        User.updateStoreDetails(user_id, filteredData, (err, result) => {
            if (err) {
                console.error('DB Error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error saving store details',
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
                message: 'Store details stored successfully'
            });
        });

    } catch (error) {
        console.error('Unexpected Server Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    }
};

const storeAdditionalDetails = async (req, res) => {
    try {
        const { user_id } = req.body;

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
            vendor_insurance_certificate: await fileUpload('vendor_insurance_certificate'),
            health_inspection_certificate: await fileUpload('health_inspection_certificate'),
            food_certificate: await fileUpload('food_certificate')
        };

        const filteredData = Object.fromEntries(
            Object.entries(userData).filter(([_, value]) => value !== undefined && value !== null)
        );

        User.updateStoreDetails(user_id, filteredData, (err, result) => {
            if (err) {
                console.error('DB Error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error saving store details',
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
                message: 'Store details stored successfully'
            });
        });

    } catch (error) {
        console.error('Unexpected Server Error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
};



const createVendorType = async (req, res) => {
  try {
    let vendor_type_image = null;

    // Upload to S3 if image is provided
    if (req.files && req.files['vendor_type_image']) {
      const file = req.files['vendor_type_image'][0];
      vendor_type_image = await uploadToS3(
        file.buffer,
        file.originalname,
        file.fieldname,
        file.mimetype
      );
    }

    // Inject uploaded image URL into body
    req.body.vendor_type_image = vendor_type_image;
    User.createvendortype(req.body, (err, result) => {
      if (err) {
        return res.status(500).json({ status: false, error: 'Failed to create vendor type' });
      }
      res.status(201).json({
        status: true,
        message: 'Vendor type created',
        id: result.insertId
      });
    });

  } catch (error) {
    console.error('Error in createVendorType:', error);
    res.status(500).json({ status: false, error: 'Server error' });
  }
};


const getAllVendorTypes = (req, res) => {
  const filter = req.query.filter; // 'active' or undefined

  User.getAllvendortype((err, results) => {
    if (err) {
      return res.status(500).json({ status: false, error: 'Failed to fetch vendor types' });
    }

    if (filter === 'active') {
      const activeVendorTypes = results.filter(type => type.status === 1);
      return res.status(200).json({ status: true, data: activeVendorTypes });
    }

    // Default: return all
    res.status(200).json({ status: true, data: results });
  });
};


const updateVendorType = async (req, res) => {
    const { id } = req.params;
    const { vendor_type, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Vendor type ID is required.' });
    }

    User.getVendorTypeById(id, async (err, vendorType) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching vendor type', error: err });
        }

        const vendorTypeObject = Array.isArray(vendorType) ? vendorType[0] : vendorType;

        if (!vendorTypeObject) {
            return res.status(404).json({ success: false, message: 'Vendor type not found' });
        }

        const updateFields = {
            vendor_type: vendor_type !== undefined ? vendor_type : vendorTypeObject.vendor_type,
            status: status !== undefined ? status : vendorTypeObject.status,
            vendor_type_image: vendorTypeObject.vendor_type_image,
        };

        if (req.files && req.files['vendor_type_image']) {
            const file = req.files['vendor_type_image'][0];
            const newImageUrl = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
            updateFields.vendor_type_image = newImageUrl;

            if (vendorTypeObject.vendor_type_image) {
                await deleteS3Image(vendorTypeObject.vendor_type_image);
            }
        }

        User.updatevendortype(id, updateFields, (err, updatedVendorType) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating vendor type', error: err });
            }

            User.getVendorTypeById(id, (err, finalData) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error fetching updated data', error: err });
                }

                const finalVendorType = Array.isArray(finalData) ? finalData[0] : finalData;

                res.status(200).json({
                    success: true,
                    message: 'Vendor type updated successfully',
                    data: finalVendorType
                });
            });
        });
    });
};



const deleteVendorType = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ status: false, message: 'Vendor type ID is required.' });
    }

    // 1. Get vendor type from DB to retrieve image key
    User.getVendorTypeById(id, async (err, vendorType) => {
        if (err) {
            console.error("Error fetching vendor type:", err);
            return res.status(500).json({ status: false, message: 'Error fetching vendor type', error: err });
        }

        if (!vendorType || vendorType.length === 0) {
            return res.status(404).json({ status: false, message: 'Vendor type not found.' });
        }

        // 2. Delete image from S3
        const imageKey = vendorType[0].vendor_type_image;
        if (imageKey) {
            try {
                await deleteS3Image(imageKey);
            } catch (s3Error) {
                console.error("Failed to delete image from S3:", s3Error);
                // Optionally return or just log the error and continue
            }
        }

        // 3. Delete vendor type from DB
        User.deletevendortype(id, (err, result) => {
            if (err) {
                console.error("Error deleting vendor type:", err);
                return res.status(500).json({ status: false, message: 'Error deleting vendor type', error: err });
            }
            res.status(200).json({ status: true, message: 'Vendor type deleted successfully.' });
        });
    });
};



module.exports = {
    vendorSignup,
    vendorLogin,
    vendorVerification,
    updateVendorProfile,
    vendorProfile,
    vendorStatus,
    allVendors,
    allVendorsforAdmin,
    allVendorsforAdminbyVendorID,
    storeBusinessDetails,
    storeAdditionalDetails,
    createVendorType,
    getAllVendorTypes,
    updateVendorType,
    deleteVendorType
}; 