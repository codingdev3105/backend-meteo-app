const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, sensorController.getAllSensors);
router.post('/', protect, admin, sensorController.createSensor);
router.put('/:id', protect, admin, sensorController.updateSensor);
router.delete('/:id', protect, admin, sensorController.deleteSensor);

module.exports = router;
