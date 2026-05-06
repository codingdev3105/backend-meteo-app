const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    mediaUrl: { type: String }, // URL de l'image ou vidéo
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' }
});

const documentationSchema = new mongoose.Schema({
    category: { 
        type: String, 
        required: true,
        enum: ['STATION_GUIDE', 'PLATFORM_GUIDE', 'FAQ']
    },
    title: { type: String, required: true },
    steps: [stepSchema],
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Documentation', documentationSchema);
