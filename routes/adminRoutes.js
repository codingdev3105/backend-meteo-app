const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const sensorController = require('../controllers/sensorController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, adminController.getStats);
router.get('/logs', protect, admin, adminController.getLogs);

// Gestion Utilisateurs
router.get('/users', protect, admin, authController.getAllUsers);
router.put('/users/:id', protect, admin, authController.updateUser);
router.delete('/users/:id', protect, admin, authController.deleteUser);

// Gestion Bibliothèque Capteurs
router.get('/sensors', protect, admin, sensorController.getAllSensors);
router.post('/sensors', protect, admin, sensorController.createSensor);
router.put('/sensors/:id', protect, admin, sensorController.updateSensor);
router.delete('/sensors/:id', protect, admin, sensorController.deleteSensor);

module.exports = router;
