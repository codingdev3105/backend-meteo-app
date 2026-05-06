const express = require('express');
const router = express.Router();
const { 
    createAlert, 
    getMyAlerts, 
    deleteAlert, 
    getAlertLogs, 
    getUnseenAlertsGrouped,
    markAsSeen,
    markAllAlertsSeen,
    toggleAlertStatus
} = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createAlert);
router.get('/', getMyAlerts);
router.delete('/:id', deleteAlert);
router.get('/unseen', getUnseenAlertsGrouped);
router.post('/mark-seen', markAsSeen);
router.post('/mark-all-seen', markAllAlertsSeen);
router.patch('/:id/toggle', toggleAlertStatus);
router.get('/logs', getAlertLogs);

module.exports = router;
