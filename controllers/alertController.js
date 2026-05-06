const Alert = require('../models/Alert');
const AlertLog = require('../models/AlertLog');

// @desc    Créer une nouvelle configuration d'alerte
exports.createAlert = async (req, res) => {
    try {
        const { name, description, stationId, sensorType, operator, thresholdValue } = req.body;
        const alert = await Alert.create({
            userId: req.user._id,
            name,
            description,
            stationId,
            sensorType,
            operator,
            thresholdValue
        });
        res.status(201).json(alert);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Récupérer toutes les configurations d'alertes de l'utilisateur
exports.getMyAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({ userId: req.user._id });
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supprimer une configuration d'alerte
exports.deleteAlert = async (req, res) => {
    try {
        const alert = await Alert.findOne({ _id: req.params.id, userId: req.user._id });
        if (alert) {
            await alert.deleteOne();
            res.json({ message: 'Alerte supprimée' });
        } else {
            res.status(404).json({ message: 'Alerte non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Récupérer les alertes non vues GROUPÉES pour le Dashboard
exports.getUnseenAlertsGrouped = async (req, res) => {
    try {
        // On récupère tous les logs non vus de l'utilisateur, peuplés avec les infos du seuil
        const logs = await AlertLog.find({ 
            userId: req.user._id, 
            isSeen: false 
        }).populate('alertId').sort({ createdAt: -1 });

        // On groupe par alertId pour n'afficher qu'une ligne par type de dépassement dans le dashboard
        const grouped = {};
        logs.forEach(log => {
            const id = log.alertId ? log.alertId._id.toString() : 'unknown';
            if (!grouped[id]) {
                grouped[id] = {
                    alertInfo: log.alertId,
                    latestLog: log,
                    count: 1,
                    allLogs: [log]
                };
            } else {
                grouped[id].count++;
                grouped[id].allLogs.push(log);
            }
        });

        res.json(Object.values(grouped));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Marquer un groupe d'alertes comme "VU"
exports.markAsSeen = async (req, res) => {
    try {
        const { alertId } = req.body;
        await AlertLog.updateMany(
            { userId: req.user._id, alertId: alertId, isSeen: false },
            { $set: { isSeen: true } }
        );
        res.json({ message: 'Alertes marquées comme vues' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Marquer TOUTES les alertes comme "VU"
exports.markAllAlertsSeen = async (req, res) => {
    try {
        await AlertLog.updateMany(
            { userId: req.user._id, isSeen: false },
            { $set: { isSeen: true } }
        );
        res.json({ message: 'Toutes les alertes sont marquées comme vues' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Récupérer tout le journal (Historique complet)
exports.getAlertLogs = async (req, res) => {
    try {
        const logs = await AlertLog.find({ userId: req.user._id })
            .populate('alertId')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Activer ou désactiver une alerte
exports.toggleAlertStatus = async (req, res) => {
    try {
        const alert = await Alert.findOne({ _id: req.params.id, userId: req.user._id });
        if (alert) {
            alert.isActive = !alert.isActive;
            await alert.save();
            res.json(alert);
        } else {
            res.status(404).json({ message: 'Alerte non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
