const mongoose = require('mongoose');

const measureSchema = new mongoose.Schema({
    stationId: {
        type: String,
        required: true // Toujours requis pour savoir quelle station parle
    },
    stationData: mongoose.Schema.Types.Mixed,
    sensorNodesData: [
        {
            nodeId: String,
            sensors: mongoose.Schema.Types.Mixed // Objet dynamique { soil: 10, ... }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Measure', measureSchema);
