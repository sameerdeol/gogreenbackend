## Rider Registration Flow (Hinglish Guide)

Ye document rider ke register/journey ke steps ko simple Hinglish me explain karta hai. Neeche diye gaye endpoints `routes/riderRoutes.js` me defined hain.

### 1) OTP Flow (Signup se pehle ya during signup)
- **Send OTP**: `POST /send-riderOtp`
  - Body me mobile/email dena hota hai (as per `userController.sendOTP`).
  - Server OTP generate karke rider ko bhejta hai.
- **Verify OTP**: `POST /verifyotp`
  - Body me OTP + identifier (mobile/email) bhejte ho.
  - Agar correct hua to verification complete; next step allowed.

### 2) Rider Signup
- **Signup**: `POST /rider-signup`
  - Basic account create hota hai (name, phone/email, password, etc.).
  - Successful signup ke baad rider login kar sakta hai.

### 3) Rider Login
- **Login**: `POST /rider-login`
  - Credentials se login hota hai.
  - Response me token milta hai. Aage ke saare protected steps me `Authorization: Bearer <token>` bhejna zaroori hai.

### 4) KYC / Verification Details (Protected + File Upload supported)
- **Rider Verification**: `POST /rider-verification`
  - Headers: `Authorization` token required.
  - Upload fields supported (via multer). Yahan KYC docs, ID proofs, etc. submit hote hain.

### 5) Personal Details (Protected + File Upload supported)
- **Personal Details**: `POST /rider-personaldetails`
  - Headers: `Authorization` token required.
  - Upload fields supported (profile image, address docs, etc.).

### 6) Vehicle Details (Protected + File Upload supported)
- **Add Vehicle Details**: `POST /rider-vehicledetails`
  - Headers: `Authorization` token required.
  - Vehicle info (type, number, RC images, etc.) submit hote hain.
- **Update Vehicle Details**: `PUT /update-riderVehicledetails`
  - Same token + upload support. Existing vehicle info ko update karne ke liye.

### 7) Rider Profile (Protected)
- **Get/Profile Submit**: `POST /rider-profile`
  - Headers: `Authorization` token required.
  - Rider ki consolidated profile fetch/submit/update (controller behavior pe depend). 
- **Update Profile**: `PUT /update-riderProfile`
  - Token + upload supported. Name, photo, etc. update.

### 8) Password Management
- **Change Password (Logged-in)**: `PUT /chnage-riderPwd`
  - Logged-in rider ke liye current/new password based change.
- **Reset Password (Forgot flow)**: `POST /reset-riderPwd`
  - OTP verify ke baad naya password set karna.
- Note: Ek aur route hai `POST /update-riderPassword` jo controller me profile update call karta hai; yeh naming mismatch ho sakta hai. Actual behavior controller pe depend karta hai.

### 9) Bank Details (Protected)
- **Add/Update Bank**: `POST /rider-bankdetails`
  - Token required. Payouts ke liye bank info add/update.

### 10) Status, Location and Analytics (Protected)
- **Rider Status**: `POST /rider-status`
  - Online/Offline ya availability status update.
- **Update Location**: `PUT /updateRider-location`
  - Live location updates ke liye.
- **Analytics**: `POST /rider-analytics`, `POST /riderdashboard-analytics`
  - Rider performance/deliveries stats.

### Typical Step-by-Step Journey
1. Send OTP (`/send-riderOtp`)
2. Verify OTP (`/verifyotp`)
3. Signup (`/rider-signup`)
4. Login and get token (`/rider-login`)
5. Submit verification docs (`/rider-verification`)
6. Add personal details (`/rider-personaldetails`)
7. Add vehicle details (`/rider-vehicledetails`)
8. Update profile if needed (`/update-riderProfile`)
9. Add bank details (`/rider-bankdetails`)
10. Set status/location as required (`/rider-status`, `/updateRider-location`)

Notes:
- Protected routes me hamesha `Authorization: Bearer <token>` header bhejna.
- File uploads ke liye correct multipart/form-data use karo; fields `multerConfig` me defined hain.
- Exact request body fields aur validations `controllers` me milenge: `controllers/riderController.js`, `controllers/userController.js`.

## Rider Controller aur Model ka Brief (Hinglish)

### Controller: `controllers/riderController.js`
- **riderSignup**: New rider account banata hai. Google/Apple social token support hai. Password hash hota hai, unique `custom_id` generate hota hai, aur JWT token return hota hai.
- **riderLogin**: Email/password se login ya Google/Apple token se. Password match (bcrypt) karta hai. JWT token return karta hai.
- **riderVerification**: KYC/vehicle related docs upload (S3) karke `delivery_partners` me save karta hai. Pehle check karta hai `verification_applied`/`is_verified` state.
- **riderPersonalDetails**: Address, DOB, other phone + optional `profile_pic`/`identity_proof` ko `delivery_partners` me insert/update karta hai aur `users.verification_applied = TRUE` set karta hai.
- **updateRiderProfile**: Basic profile fields (`firstname`, `lastname`, `email`, `phonenumber`, `sin_code`, `license_number`, `dob`, `profile_pic`) update karta hai across `users` + `delivery_partners` (role_id 4) using model ki transactional update.
- **riderProfile**: Aggregated rider profile deta hai (users + delivery_partners join) + aaj ke orders ka summary (completed/rejected counts) return karta hai.
- **vehicleDetails**: Rider ke vehicle info fetch karta hai.
- **updateVehicleDetails**: Registration doc S3 pe update karta hai, purani image delete karta hai, aur vehicle fields update karta hai.
- **riderStatus**: `users.status` aur `delivery_partners.rider_start_time/close_time` update karta hai. Deactivation `admin` vs `self` logic role pe based.
- **updateRiderLocation**: Live `rider_lat/lng` update karta hai aur `emitRiderLocationToCustomer(...)` se real-time customer ko push karta hai.
- **riderAnalytics / riderDashboardAnalytics**: Orders/earnings/customers ke stats deta hai (period-wise or day-wise aggregation).
- **riderBankDetails**: Bank info fetch karta hai `users_bank_details` se.

### Model: `models/User.js` (Rider-relevant methods)
- **insertUser**: `users` me insert karta hai; agar `other_phone_number/dob/address` mile to `delivery_partners` me bhi insert.
- **findByEmail / findByEmailForVendorRider**: Email se user fetch; rider ke liye role check.
- **checkCustomIdExists**: `custom_id` uniqueness check for signup.
- **updateWorkerData**: Transactionally `users` aur role-based table (`delivery_partners`) update.
- **insertUserVerification**: Role 4 ke liye `delivery_partners` me KYC/vehicle fields insert.
- **updateRiderPersonalDetails**: Agar row exist nahi to insert; warna update. Saath me `users.verification_applied = TRUE`.
- **userProfile**: Role 4 ke liye joined profile + aaj ke orders (completed/rejected) counts.
- **vehicleDetails / updateVehicleDetails**: Vehicle info read/update.
- **Status**: `users.status` update karta hai; rider ke shift times `delivery_partners` me set karta hai.
- **updateRiderLocation**: `delivery_partners` table me live coordinates update.
- **userBankDetails**: Bank details read.
- Aur analytics helpers: `getRiderAnalytics`, `getDashboardAnalytics` jo stats aggregate karte hain.


