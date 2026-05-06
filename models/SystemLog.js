const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['INFO', 'WARNING', 'CRITICAL', 'STATION', 'AUTH'],
        default: 'INFO'
    },
    event: {
        type: String,
        required: true
    },
    stationId: {
        type: String,
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    message: {
        type: String,
        required: true
    },
    isSeen: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SystemLog', SystemLogSchema);
