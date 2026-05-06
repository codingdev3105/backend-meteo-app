const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        default: 'Alerte sans nom'
    },
    description: {
        type: String
    },
    stationId: {
        type: String, // hardwareId
        required: true
    },
    sensorType: {
        type: String, // 'temp', 'hum', 'soil', etc.
        required: true
    },
    operator: {
        type: String,
        enum: ['>', '<'],
        default: '>'
    },
    thresholdValue: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastTriggered: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
