const Sensor = require('../models/Sensor');

exports.getAllSensors = async (req, res) => {
    try {
        const sensors = await Sensor.find().sort({ createdAt: -1 });
        res.json(sensors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createSensor = async (req, res) => {
    try {
        const { sensorId, abbreviation, name, description } = req.body;
        
        const exists = await Sensor.findOne({ $or: [{ sensorId }, { abbreviation }] });
        if (exists) return res.status(400).json({ message: 'Ce capteur ou cette abréviation existe déjà.' });

        const sensor = await Sensor.create({
            sensorId,
            abbreviation,
            name,
            description
        });
        res.status(201).json(sensor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateSensor = async (req, res) => {
    try {
        const sensor = await Sensor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!sensor) return res.status(404).json({ message: 'Capteur non trouvé' });
        res.json(sensor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteSensor = async (req, res) => {
    try {
        const sensor = await Sensor.findByIdAndDelete(req.params.id);
        if (!sensor) return res.status(404).json({ message: 'Capteur non trouvé' });
        res.json({ message: 'Capteur supprimé' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
