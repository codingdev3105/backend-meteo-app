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
            type: 'STATION',
            event: 'STATION_CONNECTED',
            stationId,
            message: `La station ${station ? station.name : stationId} vient de démarrer et s'est connectée au serveur.`
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
        // Charger le catalogue pour faire la correspondance Nom -> Abréviation
        const catalogue = await Sensor.find();

        for (const alert of alerts) {
            // Trouver l'abréviation technique correspondant au nom stocké dans l'alerte
            const sensorDef = catalogue.find(s => s.name === alert.sensorType);
            const technicalKey = sensorDef ? sensorDef.abbreviation : alert.sensorType;
            
            const sensorValue = data[technicalKey];
            if (sensorValue !== undefined) {
                let isTriggered = false;
                if (alert.operator === '>' && sensorValue > alert.thresholdValue) isTriggered = true;
                if (alert.operator === '<' && sensorValue < alert.thresholdValue) isTriggered = true;

                if (isTriggered) {
                    // Créer un log d'alerte avec le lien alertId
                    await AlertLog.create({
                        userId: alert.userId,
                        alertId: alert._id, // Lien vers le seuil
                        stationId,
                        sensorType: alert.sensorType,
                        triggeredValue: sensorValue,
                        thresholdValue: alert.thresholdValue,
                        message: `Alerte sur ${sourceLabel} : ${alert.sensorType} (${sensorValue}) ${alert.operator} seuil (${alert.thresholdValue})`
                    });
                    
                    // Mettre à jour la date de dernier déclenchement
                    alert.lastTriggered = new Date();
                    await alert.save();
                }
            }
        }
    } catch (err) {
        console.error("Erreur Moteur Alertes:", err);
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

        // --- MOTEUR D'ALERTES & AUTO-ENREGISTREMENT ---
        const station = await Station.findOne({ hardwareId: stationId });
        
        if (station) {
            station.lastOnline = new Date();
            station.status = 'active';

            // 1. Gérer les capteurs du Hub (stationData)
            if (stationData) {
                for (const abbr of Object.keys(stationData)) {
                    const cleanAbbr = abbr.trim();
                    const s = await Sensor.findOne({ abbreviation: { $regex: new RegExp(`^${cleanAbbr}$`, 'i') } });
                    if (s) {
                        // Utilisation de addToSet (manuel ici pour garder l'instance station)
                        if (!station.sensors.includes(s.sensorId)) {
                            station.sensors.push(s.sensorId);
                        }
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
                        const sensorType = await Sensor.findOne({ abbreviation: { $regex: new RegExp(`^${cleanAbbr}$`, 'i') } });
                        if (sensorType) {
                            if (!nodeDef.sensors.includes(sensorType.sensorId)) {
                                nodeDef.sensors.push(sensorType.sensorId);
                                await nodeDef.save();
                            }
                            if (!station.sensors.includes(sensorType.sensorId)) {
                                station.sensors.push(sensorType.sensorId);
                            }
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
        catalogue.forEach(s => {
            // On stocke en minuscule dans le dictionnaire de traduction pour le matching flexible
            dict[s.abbreviation.toLowerCase()] = { name: s.name, id: s.sensorId, originalAbbr: s.abbreviation };
        });

        let status = { 
            station: {}, 
            nodes: {},
            sensorLibrary: dict,
            lastUpdate: measures[0].createdAt 
        };

        [...measures].reverse().forEach(m => {
            if (m.stationData) {
                Object.entries(m.stationData).forEach(([abbr, val]) => {
                    const lowAbbr = abbr.toLowerCase();
                    const info = dict[lowAbbr];
                    status.station[lowAbbr] = {
                        value: val,
                        name: info ? info.name : abbr
                    };
                });
            }
            if (m.sensorNodesData) {
                m.sensorNodesData.forEach(node => {
                    if (!status.nodes[node.nodeId]) status.nodes[node.nodeId] = {};
                    Object.entries(node.sensors || {}).forEach(([abbr, val]) => {
                        const lowAbbr = abbr.toLowerCase();
                        const info = dict[lowAbbr];
                        status.nodes[node.nodeId][lowAbbr] = {
                            value: val,
                            name: info ? info.name : abbr
                        };
                    });
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
