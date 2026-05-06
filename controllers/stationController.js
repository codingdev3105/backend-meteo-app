const Station = require('../models/Station');
const SensorNode = require('../models/SensorNode');

// @desc    Créer une nouvelle station
exports.createStation = async (req, res) => {
    try {
        const { name, hardwareId, location } = req.body;
        
        // On vérifie si l'ID matériel existe déjà
        const existing = await Station.findOne({ hardwareId });
        if (existing) {
            return res.status(400).json({ message: 'Cet ID matériel est déjà enregistré.' });
        }

        const station = await Station.create({
            name,
            hardwareId,
            location,
            owner: req.user._id // L'ID vient du Token (via protect)
        });

        res.status(201).json(station);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir toutes les stations de l'utilisateur connecté
exports.getUserStations = async (req, res) => {
    try {
        const stations = await Station.find({ owner: req.user._id });
        res.json(stations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir TOUTES les stations (Admin)
exports.getAllStations = async (req, res) => {
    try {
        const stations = await Station.find().populate('owner', 'username email lastAccess phoneNumber createdAt');
        res.json(stations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir une station spécifique par hardwareId
exports.getStationByHardwareId = async (req, res) => {
    try {
        const station = await Station.findOne({ hardwareId: req.params.hardwareId });
        if (station) {
            res.json(station);
        } else {
            res.status(404).json({ message: 'Station non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mettre à jour une station
exports.updateStation = async (req, res) => {
    try {
        const station = await Station.findById(req.params.id);
        if (station) {
            station.name = req.body.name || station.name;
            station.location = req.body.location || station.location;
            station.status = req.body.status || station.status;
            
            const updatedStation = await station.save();
            res.json(updatedStation);
        } else {
            res.status(404).json({ message: 'Station non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supprimer une station
exports.deleteStation = async (req, res) => {
    try {
        const station = await Station.findById(req.params.id);
        if (station) {
            await station.deleteOne();
            res.json({ message: 'Station supprimée' });
        } else {
            res.status(404).json({ message: 'Station non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir les détails d'un nœud capteur (pour la modale admin)
exports.getNodeDetails = async (req, res) => {
    try {
        const node = await SensorNode.findOne({ nodeHardwareId: req.params.nodeId });
        if (node) {
            res.json(node);
        } else {
            res.status(404).json({ message: 'Nœud non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
