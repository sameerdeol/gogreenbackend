const express = require('express');
const { allowRoles } = require('../middleware/roleMiddleware');
const { signup, loginUser, getDashboard,createManager  } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', authenticateToken, signup); 
router.post('/login', loginUser);
router.get('/dashboard', authenticateToken, getDashboard);
router.post('/create-manager', authenticateToken, allowRoles([1]), createManager);

module.exports = router;
