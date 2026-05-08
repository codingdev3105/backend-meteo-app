const Sensor = require('../models/Sensor');

// @desc    Obtenir tous les capteurs
// @route   GET /api/sensors
exports.getAllSensors = async (req, res) => {
    try {
        const sensors = await Sensor.find({});
        res.json(sensors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Créer un capteur
// @route   POST /api/sensors
exports.createSensor = async (req, res) => {
    try {
        const { sensorId, abbreviation, name, description } = req.body;
        
        const sensorExists = await Sensor.findOne({ sensorId });
        if (sensorExists) {
            return res.status(400).json({ message: 'Ce capteur existe déjà' });
        }

        const sensor = await Sensor.create({
            sensorId,
            abbreviation,
            name,
            description
        });

        res.status(201).json(sensor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mettre à jour un capteur
// @route   PUT /api/sensors/:id
exports.updateSensor = async (req, res) => {
    try {
        const sensor = await Sensor.findById(req.params.id);
        if (sensor) {
            sensor.sensorId = req.body.sensorId || sensor.sensorId;
            sensor.abbreviation = req.body.abbreviation || sensor.abbreviation;
            sensor.name = req.body.name || sensor.name;
            sensor.description = req.body.description || sensor.description;

            const updatedSensor = await sensor.save();
            res.json(updatedSensor);
        } else {
            res.status(404).json({ message: 'Capteur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supprimer un capteur
// @route   DELETE /api/sensors/:id
exports.deleteSensor = async (req, res) => {
    try {
        const sensor = await Sensor.findById(req.params.id);
        if (sensor) {
            await sensor.deleteOne();
            res.json({ message: 'Capteur supprimé' });
        } else {
            res.status(404).json({ message: 'Capteur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
