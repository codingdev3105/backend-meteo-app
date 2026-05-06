const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    sensorId: {
        type: String,
        required: true,
        unique: true // Ex: 'DHT11', 'MQ2'
    },
    abbreviation: {
        type: String,
        unique: true, // Ex: 'T', 'H', 'P'
        sparse: true
    },
    name: {
        type: String,
        required: true
    },
    description: String
}, { timestamps: true });

module.exports = mongoose.model('Sensor', sensorSchema);
