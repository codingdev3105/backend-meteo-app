const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { protect } = require('../middleware/authMiddleware');

router.post('/collect', dataController.collectData);
router.post('/hello', dataController.helloStation);
router.get('/logs', protect, dataController.getSystemLogs);
router.get('/logs/types', protect, dataController.getLogTypes);
router.post('/logs/mark-seen', protect, dataController.markSystemLogsSeen);
router.get('/latest/:hardwareId', dataController.getLatestMeasure);
router.get('/status/:hardwareId', dataController.getLatestStatus);
router.get('/history/:hardwareId', dataController.getHistory);

module.exports = router;
