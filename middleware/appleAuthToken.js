const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys"
});

// ✅ Add all your bundle IDs here
const ALLOWED_BUNDLE_IDS = [
  "go.green.rider",
  "go.green.vendor",
  "go.green.customer"
];

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

async function verifyAppleToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: "https://appleid.apple.com"
        // 👈 we remove "audience" check here, we’ll do it manually below
      },
      (err, decoded) => {
        if (err) return reject(err);

        // ✅ Manually check audience against allowed bundle IDs
        if (!ALLOWED_BUNDLE_IDS.includes(decoded.aud)) {
          return reject(new Error(`Invalid audience: ${decoded.aud}`));
        }

        resolve(decoded);
      }
    );
  });
}

module.exports = { verifyAppleToken };
