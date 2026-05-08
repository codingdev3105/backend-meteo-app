const express = require('express');
const router = express.Router();
const { checkStationStatus } = require('../controllers/dataController');

// @route   GET /api/cron/check-status
// @desc    Tâche périodique pour vérifier l'état des stations
// @access  Public (Protégé par Vercel Cron Secret si configuré)
router.get('/check-status', async (req, res) => {
    try {
        // Optionnel : Vérifier le secret envoyé par Vercel
        // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return res.status(401).end('Unauthorized');
        // }

        console.log('⏰ Exécution de la tâche Cron : checkStationStatus...');
        await checkStationStatus();
        
        res.json({ success: true, message: 'Vérification de l\'état des stations terminée.' });
    } catch (error) {
        console.error('❌ Erreur Cron:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
