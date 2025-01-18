const bcrypt = require('bcrypt');

async function hashPassword(password) {
  try {
    const saltRounds = 10;  // Number of rounds for salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Hashed Password:', hashedPassword);
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}

// Replace with any password string you want to hash
const password = 'superadmin12';
hashPassword(password);