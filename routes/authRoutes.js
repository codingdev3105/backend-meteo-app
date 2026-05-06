const express = require('express');
const router = express.Router();
const { 
    login, 
    getProfile, 
    getAllUsers, 
    register, 
    updateUser, 
    deleteUser,
    updateMyProfile,
    updateMyPassword
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);

// Routes Profil (Utilisateur connecté)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateMyProfile);
router.put('/password', protect, updateMyPassword);

// Routes Admin
router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id', protect, admin, updateUser);
router.delete('/users/:id', protect, admin, deleteUser);

module.exports = router;
