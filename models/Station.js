const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
    hardwareId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Le nom de la station est requis']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: String,
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'inactive'
    },
    lastOnline: Date,
    // Liste des ID de nœuds détectés automatiquement par cette station
    sensorNodes: [String], 
    sensors: [String], // Liste des capteurs (IDs catalogue) découverts
    metadata: {
        type: Map,
        of: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Station', stationSchema);
