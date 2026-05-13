const Measure = require('../models/Measure');
const Station = require('../models/Station');
const Alert = require('../models/Alert');
const AlertLog = require('../models/AlertLog');
const SystemLog = require('../models/SystemLog');

// @desc    Signal de démarrage de la station (Hello)
exports.helloStation = async (req, res) => {
    try {
        const { stationId } = req.body;
        const station = await Station.findOne({ hardwareId: stationId });
        
        await SystemLog.create({
            type: 'SUCCESS',
            event: 'STATION_CONNECTED',
            stationId,
            userId: station ? station.owner : null, // On lie le log à l'utilisateur
            message: `Connexion établie : La station ${station ? station.name : stationId} est maintenant en ligne.`
        });

        if (station) {
            station.lastOnline = new Date();
            station.status = 'active';
            await station.save();
        }

        res.json({ success: true, message: "Événement de connexion enregistré" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Vérification automatique de l'état (Background Job)
// Cette fonction sera appelée par le serveur régulièrement
exports.checkStationStatus = async () => {
    try {
        const timeout = 3 * 60 * 1000; // 3 minutes
        const now = new Date();
        const offlineThreshold = new Date(now - timeout);

        // Trouver les stations qui étaient 'active' mais n'ont plus donné de signe de vie
        const stationsToOffline = await Station.find({
            status: 'active',
            lastOnline: { $lt: offlineThreshold }
        });

        for (const station of stationsToOffline) {
            station.status = 'inactive';
            await station.save();

            await SystemLog.create({
                type: 'CRITICAL',
                event: 'STATION_OFFLINE',
                stationId: station.hardwareId,
                message: `ALERTE : La station ${station.name} est déconnectée (pas de données depuis > 3 min).`
            });
            console.log(`⚠️ Station ${station.hardwareId} déclarée OFFLINE`);
        }
    } catch (error) {
        console.error("Erreur Background Status Check:", error);
    }
};

// @desc    Obtenir les logs système pour l'utilisateur (ses stations)
exports.getSystemLogs = async (req, res) => {
    try {
        const { type, date } = req.query;

        // 1. Trouver les stations de l'utilisateur
        const userStations = await Station.find({ owner: req.user._id });
        const stationIds = userStations.map(s => s.hardwareId);

        // 2. Construire le filtre
        let filter = {
            $or: [
                { stationId: { $in: stationIds } },
                { userId: req.user._id }
            ]
        };

        if (type && type !== 'ALL') {
            filter.type = type;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: start, $lte: end };
        }

        // 3. Récupérer les logs
        const logs = await SystemLog.find(filter).sort({ createdAt: -1 }).limit(100);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir la liste des types uniques présents dans les logs
exports.getLogTypes = async (req, res) => {
    try {
        const userStations = await Station.find({ owner: req.user._id });
        const stationIds = userStations.map(s => s.hardwareId);

        const types = await SystemLog.distinct('type', {
            $or: [
                { stationId: { $in: stationIds } },
                { userId: req.user._id }
            ]
        });

        res.json(types);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fonction interne pour vérifier les alertes
const checkAlerts = async (stationId, data, sourceLabel) => {
    try {
        const alerts = await Alert.find({ stationId, isActive: true });
        const catalogue = await Sensor.find();

        // Bibliothèque de secours si le catalogue DB est vide ou incomplet
        const fallbackMap = {
            'Température': 't',
            'Humidité': 'h',
            'Pression': 'p',
            'Gaz': 'g',
            'Luminosité': 'lum',
            'Humidité Sol': 'sol',
            'temperature': 't',
            'humidity': 'h'
        };

        for (const alert of alerts) {
            // 1. Tenter de trouver le capteur dans le catalogue (par nom, ID ou même abréviation)
            const sensorDef = catalogue.find(s => 
                s.name?.toLowerCase() === alert.sensorType?.toLowerCase() || 
                s.sensorId?.toLowerCase() === alert.sensorType?.toLowerCase() ||
                s.abbreviation?.toLowerCase() === alert.sensorType?.toLowerCase()
            );

            let technicalKey = alert.sensorType;
            if (sensorDef && sensorDef.abbreviation) {
                technicalKey = sensorDef.abbreviation;
            } else if (fallbackMap[alert.sensorType]) {
                technicalKey = fallbackMap[alert.sensorType];
            }

            // Recherche de la clé dans les données reçues (insensible à la casse, ex: 't' vs 'T')
            const dataKey = Object.keys(data).find(k => k.toLowerCase() === technicalKey.toLowerCase());
            const sensorValue = dataKey !== undefined ? data[dataKey] : undefined;

            if (sensorValue !== undefined) {
                let isTriggered = false;
                const val = parseFloat(sensorValue);
                const threshold = parseFloat(alert.thresholdValue);

                if (alert.operator === '>' && val > threshold) isTriggered = true;
                if (alert.operator === '<' && val < threshold) isTriggered = true;

                if (isTriggered) {
                    const alertTitle = alert.name || alert.sensorType;
                    // Créer le log d'alerte simplifié
                    await AlertLog.create({
                        userId: alert.userId,
                        alertId: alert._id,
                        stationId,
                        sensorType: alert.sensorType,
                        triggeredValue: val,
                        thresholdValue: threshold,
                        message: `Alerte sur ${sourceLabel} : ${alertTitle}`
                    });

                    alert.lastTriggered = new Date();
                    await alert.save();
                }
            }
        }
    } catch (err) {
        console.error("❌ Erreur Moteur Alertes:", err);
    }
};

const Sensor = require('../models/Sensor');
const SensorNode = require('../models/SensorNode');

// @desc    Collecter les données envoyées par la station (STM32)
exports.collectData = async (req, res) => {
    try {
        const { stationId, stationData, sensorNodesData } = req.body;

        const newMeasure = await Measure.create({
            stationId,
            stationData,
            sensorNodesData
        });
        console.log(newMeasure);
        // --- MOTEUR D'ALERTES & AUTO-ENREGISTREMENT ---
        const station = await Station.findOne({ hardwareId: stationId });
        
        if (station) {
            station.lastOnline = new Date();
            station.status = 'active';

            // 1. Gérer les capteurs du Hub (stationData)
            if (stationData) {
                for (const abbr of Object.keys(stationData)) {
                    const cleanAbbr = abbr.trim();
                    let s = await Sensor.findOne({ abbreviation: { $regex: new RegExp(`^${cleanAbbr}$`, 'i') } });
                    
                    if (!s) {
                        // Création automatique si le capteur est nouveau pour la base
                        const defaults = { 't': 'Température', 'h': 'Humidité', 'p': 'Pression', 'g': 'Gaz', 'lum': 'Luminosité', 'sol': 'Humidité Sol' };
                        s = await Sensor.create({
                            sensorId: cleanAbbr.toUpperCase(),
                            abbreviation: cleanAbbr,
                            name: defaults[cleanAbbr.toLowerCase()] || `Capteur ${cleanAbbr.toUpperCase()}`
                        });
                    }

                    if (!station.sensors.includes(s.sensorId)) {
                        station.sensors.push(s.sensorId);
                    }
                }
                await checkAlerts(stationId, stationData, "Hub Central");
            }

            // 2. Gérer les Nœuds et leurs capteurs
            if (sensorNodesData && sensorNodesData.length > 0) {
                for (const node of sensorNodesData) {
                    const cleanNodeId = node.nodeId.trim();
                    if (!station.sensorNodes.includes(cleanNodeId)) {
                        station.sensorNodes.push(cleanNodeId);
                    }

                    let nodeDef = await SensorNode.findOne({ nodeHardwareId: cleanNodeId });
                    if (!nodeDef) {
                        nodeDef = await SensorNode.create({
                            nodeHardwareId: cleanNodeId,
                            name: `Nœud ${cleanNodeId}`,
                            sensors: []
                        });
                    }

                    const receivedSensorAbbrs = Object.keys(node.sensors || {});
                    for (const abbr of receivedSensorAbbrs) {
                        const cleanAbbr = abbr.trim();
                        let sensorType = await Sensor.findOne({ abbreviation: { $regex: new RegExp(`^${cleanAbbr}$`, 'i') } });
                        
                        if (!sensorType) {
                            // Création automatique si le capteur est nouveau
                            const defaults = { 't': 'Température', 'h': 'Humidité', 'p': 'Pression', 'g': 'Gaz', 'lum': 'Luminosité', 'sol': 'Humidité Sol' };
                            sensorType = await Sensor.create({
                                sensorId: cleanAbbr.toUpperCase(),
                                abbreviation: cleanAbbr,
                                name: defaults[cleanAbbr.toLowerCase()] || `Capteur ${cleanAbbr.toUpperCase()}`
                            });
                        }

                        if (!nodeDef.sensors.includes(sensorType.sensorId)) {
                            nodeDef.sensors.push(sensorType.sensorId);
                            await nodeDef.save();
                        }
                        if (!station.sensors.includes(sensorType.sensorId)) {
                            station.sensors.push(sensorType.sensorId);
                        }
                    }
                    await checkAlerts(stationId, node.sensors, `Nœud ${cleanNodeId}`);
                }
            }

            // Nettoyage final des doublons au cas où (sécurité)
            station.sensors = [...new Set(station.sensors)];
            station.sensorNodes = [...new Set(station.sensorNodes)];

            await station.save();
        }

        res.status(201).json({ success: true, measureId: newMeasure._id });
    } catch (error) {
        console.error("❌ ERREUR dans collectData:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir l'état complet fusionné avec traduction (Dictionnaire)
exports.getLatestStatus = async (req, res) => {
    try {
        const hardwareId = req.params.hardwareId;
        
        const station = await Station.findOne({ hardwareId });
        if (!station) return res.status(404).json({ message: "Station non trouvée" });

        const measures = await Measure.find({ stationId: hardwareId })
            .sort({ createdAt: -1 })
            .limit(20);

        if (measures.length === 0) return res.json({ station: {}, nodes: {}, sensorLibrary: {} });

        // Charger le dictionnaire des capteurs
        const catalogue = await Sensor.find();
        const dict = {};
        
        // Bibliothèque de métadonnées enrichie
        const metadata = {
            't': { unit: '°C', icon: 'Thermometer', color: '#10b981' },
            'h': { unit: '%', icon: 'Droplets', color: '#3b82f6' },
            'p': { unit: 'hPa', icon: 'Gauge', color: '#8b5cf6' },
            'g': { unit: 'ppm', icon: 'Activity', color: '#f59e0b' },
            'lum': { unit: 'Lux', icon: 'Sun', color: '#eab308' },
            'sol': { unit: '%', icon: 'Droplets', color: '#065f46' },
            'bat': { unit: 'V', icon: 'Battery', color: '#ef4444' }
        };

        catalogue.forEach(s => {
            const lowAbbr = s.abbreviation.toLowerCase();
            dict[lowAbbr] = { 
                name: s.name, 
                id: s.sensorId, 
                originalAbbr: s.abbreviation,
                ...(metadata[lowAbbr] || { unit: '', icon: 'Gauge', color: '#64748b' })
            };
        });

        let status = { 
            station: {}, 
            nodes: {},
            lastUpdates: {
                hub: null,
                nodes: {}
            },
            sensorLibrary: dict,
            lastUpdate: measures[0].createdAt 
        };

        // On parcourt de la plus ancienne à la plus récente pour fusionner les états
        [...measures].reverse().forEach(m => {
            if (m.stationData && Object.keys(m.stationData).length > 0) {
                Object.entries(m.stationData).forEach(([abbr, val]) => {
                    status.station[abbr.toLowerCase()] = val;
                });
                status.lastUpdates.hub = m.createdAt;
            }
            if (m.sensorNodesData && m.sensorNodesData.length > 0) {
                m.sensorNodesData.forEach(node => {
                    if (!status.nodes[node.nodeId]) status.nodes[node.nodeId] = {};
                    Object.entries(node.sensors || {}).forEach(([abbr, val]) => {
                        status.nodes[node.nodeId][abbr.toLowerCase()] = val;
                    });
                    status.lastUpdates.nodes[node.nodeId] = m.createdAt;
                });
            }
        });

        res.json(status);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir la dernière mesure brute (Gardé pour compatibilité)
exports.getLatestMeasure = async (req, res) => {
    try {
        const measure = await Measure.find({ stationId: req.params.hardwareId })
            .sort({ createdAt: -1 })
            .limit(1);
        res.json(measure);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir l'historique des mesures filtré
exports.getHistory = async (req, res) => {
    try {
        const { hardwareId } = req.params;
        const { days = 1 } = req.query; 
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const history = await Measure.find({ 
            stationId: hardwareId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir les logs système filtrés pour l'utilisateur
exports.getSystemLogs = async (req, res) => {
    try {
        const userStations = await Station.find({ owner: req.user._id });
        const stationIds = userStations.map(s => s.hardwareId);

        const logs = await SystemLog.find({
            $or: [
                { stationId: { $in: stationIds } },
                { userId: req.user._id }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(100);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir les types de logs disponibles
exports.getLogTypes = async (req, res) => {
    res.json(['INFO', 'WARNING', 'CRITICAL', 'SUCCESS']);
};

// @desc    Marquer tous les logs système comme vus
exports.markSystemLogsSeen = async (req, res) => {
    try {
        const userStations = await Station.find({ owner: req.user._id });
        const stationIds = userStations.map(s => s.hardwareId);

        await SystemLog.updateMany(
            { 
                $or: [
                    { stationId: { $in: stationIds } },
                    { userId: req.user._id }
                ],
                isSeen: false 
            },
            { $set: { isSeen: true } }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
