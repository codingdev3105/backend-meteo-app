const User = require('../models/User');
const Station = require('../models/Station');
const SensorNode = require('../models/SensorNode');
const Alert = require('../models/Alert');
const Measure = require('../models/Measure');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Fonction pour formater l'uptime
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}j`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(' ') || '1m';
};

const getDirSize = (dirPath) => {
    let size = 0;
    try {
        if (!fs.existsSync(dirPath)) return 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) size += stats.size;
            else if (stats.isDirectory()) size += getDirSize(filePath);
        }
    } catch (e) {
        console.error('Erreur calcul taille dossier:', e);
    }
    return size;
};

// @desc    Obtenir les statistiques (Version avec décompte total capteurs)
exports.getStats = async (req, res) => {
    let stats = {
        totalUsers: 0,
        activeStations: 0,
        nodes: 0,
        totalSensors: 0,
        uptime: '0m',
        services: [],
        recentUsers: [],
        throughput: []
    };

    try {
        const isConnected = mongoose.connection.readyState === 1;
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        stats.uptime = formatUptime(process.uptime());

        if (isConnected) {
            try {
                await mongoose.connection.db.admin().ping();
                
                // 1. Utilisateurs et Stations Hub
                stats.totalUsers = await User.countDocuments({ role: 'user' });
                stats.activeStations = await Station.countDocuments();
                
                // 2. Nœuds Capteurs
                const allNodes = await SensorNode.find();
                stats.nodes = allNodes.length;

                // 3. NOMBRE TOTAL DE CAPTEURS (Hubs + Nœuds)
                const allStations = await Station.find();
                let sensorCount = 0;
                
                // Capteurs sur les Hubs
                allStations.forEach(s => {
                    sensorCount += (s.sensors?.length || 0);
                });

                // Capteurs sur les Nœuds
                allNodes.forEach(n => {
                    sensorCount += (n.sensors?.length || 0);
                });
                
                stats.totalSensors = sensorCount;

                // 4. Derniers utilisateurs
                stats.recentUsers = await User.find({ role: 'user' })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('username email createdAt');

                // 5. Débit de données
                const throughputAgg = await Measure.aggregate([
                    { $match: { createdAt: { $gte: last24h } } },
                    { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
                    { $sort: { "_id": 1 } }
                ]);

                const currentHour = new Date().getHours();
                for (let i = 0; i < 24; i++) {
                    const h = (currentHour - 23 + i + 24) % 24;
                    const found = throughputAgg.find(item => item._id === h);
                    stats.throughput.push({ time: `${h}h`, value: found ? found.count : 0 });
                }
            } catch (dbErr) {
                console.error('DB Stats Error:', dbErr);
            }
        }

        const dbStatus = isConnected ? 'Online' : 'Offline';
        const apiLatency = req.app.get('getAverageLatency')();
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const storageBytes = getDirSize(uploadsDir);
        const storageMB = (storageBytes / (1024 * 1024)).toFixed(2);

        stats.services = [
            { name: 'Database (MongoDB)', status: dbStatus, latency: isConnected ? 'Active' : 'N/A' },
            { name: 'API Service', status: 'Online', latency: `${apiLatency}ms` },
            { name: 'File Storage', status: 'Online', storageSize: `${storageMB} MB` },
        ];

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLogs = async (req, res) => {
    res.json([]);
};
