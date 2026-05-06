const User = require('../models/User');
const Station = require('../models/Station');
const AlertLog = require('../models/AlertLog');
const Alert = require('../models/Alert');

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalStations = await Station.countDocuments();
        const activeAlertConfigs = await Alert.countDocuments({ isActive: true });
        
        // Calculer le nombre total de noeuds capteurs
        const stations = await Station.find();
        const totalNodes = stations.reduce((acc, s) => acc + (s.sensorNodes?.length || 0), 0);
        
        // On récupère aussi les 5 derniers utilisateurs inscrits
        const recentUsers = await User.find({ role: 'user' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username email createdAt');

        res.json({
            users: totalUsers,
            stations: totalStations,
            nodes: totalNodes,
            activeConfigs: activeAlertConfigs,
            recentUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
