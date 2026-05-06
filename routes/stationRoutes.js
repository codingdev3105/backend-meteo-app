const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { protect, admin } = require('../middleware/authMiddleware');

// Toutes les routes de stations sont protégées
router.use(protect);

router.get('/all', admin, stationController.getAllStations);
router.post('/register', stationController.createStation);
router.get('/', stationController.getUserStations);
router.get('/:hardwareId', stationController.getStationByHardwareId);
router.put('/:id', stationController.updateStation);
router.get('/node/:nodeId', stationController.getNodeDetails);
router.delete('/:id', stationController.deleteStation);

module.exports = router;
