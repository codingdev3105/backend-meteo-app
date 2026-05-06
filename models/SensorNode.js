const mongoose = require('mongoose');

const sensorNodeSchema = new mongoose.Schema({
    nodeHardwareId: {
        type: String,
        required: true,
        unique: true // L'ID sur le boîtier nœud
    },
    name: {
        type: String,
        required: true
    },
    sensors: [String], // Liste des sensorId (ex: ['MQ2', 'MQ135'])
    description: String,
    imageUrl: String // Pour la vitrine
}, { timestamps: true });

module.exports = mongoose.model('SensorNode', sensorNodeSchema);
