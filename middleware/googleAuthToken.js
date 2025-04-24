// utils/verifyGoogleToken.js (or wherever appropriate)

const { getFirebaseApp } = require('../firebaseKeys/firebaseInit');

const verifyGoogleIdToken = async (idToken) => {
  try {
    const firebaseApp = getFirebaseApp();
    const decodedToken = await firebaseApp.auth().verifyIdToken(idToken);

    if (process.env.NODE_ENV === 'development') {
      console.log('Decoded Token:', decodedToken);
      console.log('User Email:', decodedToken.email);
      console.log('User UID:', decodedToken.uid);
    }

    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error.message);
    throw error;
  }
};

module.exports = verifyGoogleIdToken;
