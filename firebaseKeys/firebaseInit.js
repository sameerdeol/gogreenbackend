const admin = require('firebase-admin');
const riderKey = require('./go-green.json');

// Initialize the Firebase app
admin.initializeApp({
  credential: admin.credential.cert(riderKey)
});

// Return the default app
function getFirebaseApp() {
  return admin.app(); // No need for named apps if you're using only one
}

module.exports = { getFirebaseApp };
