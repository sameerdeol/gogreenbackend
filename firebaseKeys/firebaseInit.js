const admin = require('firebase-admin');
const riderKey = require('./go-green.json');

let appInitialized = false;

function getFirebaseApp() {
  if (!appInitialized) {
    admin.initializeApp({
      credential: admin.credential.cert(riderKey),
    });
    appInitialized = true;
  }
  return admin; // You can return `admin` instead of `admin.app()` for full API access
}

module.exports = { getFirebaseApp };
