const mongoose = require('mongoose');

const AlertLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    alertId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alert'
    },
    stationId: {
        type: String,
        required: true
    },
    sensorType: {
        type: String,
        required: true
    },
    triggeredValue: {
        type: Number,
        required: true
    },
    thresholdValue: {
        type: Number,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isSeen: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'resolved'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('AlertLog', AlertLogSchema);
