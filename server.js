require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');

// Connexion à MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`📡 [${req.method}] ${req.url} - Réception de données...`);
    }
    next();
});
app.use(express.json());

// Rendre le dossier uploads public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stations', require('./routes/stationRoutes'));
app.use('/api/data', require('./routes/dataRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/sensors', require('./routes/sensorRoutes'));
app.use('/api/docs', require('./routes/adminDocsRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Route de base
app.get('/', (req, res) => {
    res.send('MétéoPro Systems Platform API is running...');
});

// Route pour vérifier l'état de la connexion (Health Check)
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const status = mongoose.connection.readyState === 1 ? 'Connecté' : 'Déconnecté';
    res.json({
        server: 'Online',
        database: status,
        dbName: mongoose.connection.name
    });
});

// --- Initialisation du compte Admin par défaut ---
const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            console.log('⚡ Initialisation du compte administrateur...');
            await User.create({
                username: 'admin',
                email: 'admin@meteopro.com',
                password: 'admin123', // Minimum 6 caractères
                role: 'admin',
                phoneNumber: '0665622919'
            });
            console.log('✅ Compte Admin créé par défaut (admin / admin123)');
        }
    } catch (error) {
        console.error('❌ Erreur initialisation Admin:', error.message);
    }
};
seedAdmin();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré en mode ${process.env.NODE_ENV} sur le port ${PORT}`);

    // --- Lancement des tâches de fond ---
    const { checkStationStatus } = require('./controllers/dataController');
    setInterval(checkStationStatus, 60000); // Vérification toutes les minutes
    console.log('⏳ Background Worker: Monitoring de l\'état des stations actif.');
});

module.exports = app;
