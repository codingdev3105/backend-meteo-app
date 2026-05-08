require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
const Station = require('./models/Station');
const Alert = require('./models/Alert');

// --- Logique de Latence API ---
let responseTimes = [];
const getAverageLatency = () => {
    if (responseTimes.length === 0) return 0;
    const sum = responseTimes.reduce((a, b) => a + b, 0);
    return (sum / responseTimes.length).toFixed(1);
};

const app = express();

// Middleware de calcul de latence
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6);
        responseTimes.push(timeInMs);
        if (responseTimes.length > 20) responseTimes.shift(); // Garder les 20 derniers
    });
    next();
});

// Middleware standard
app.use(cors());
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`📡 [${req.method}] ${req.url} - Réception de données...`);
    }
    next();
});
app.use(express.json());

// Exposer la latence pour les contrôleurs
app.set('getAverageLatency', getAverageLatency);

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
app.use('/api/cron', require('./routes/cronRoutes'));

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
        dbName: mongoose.connection.name,
        latency: `${getAverageLatency()}ms`
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
                password: 'admin123',
                role: 'admin',
                phoneNumber: '0665622919'
            });
            console.log('✅ Compte Admin créé par défaut (admin / admin123)');
        }
        console.log('✅ Admin existe')
    } catch (error) {
        console.error('❌ Erreur initialisation Admin:', error.message);
    }
};

const initDB = async () => {
    await seedAdmin();
};

// 1. Connexion MongoDB immédiate (Mongoose gère la file d'attente des requêtes)
connectDB().then(() => {
    seedAdmin();
});

// 2. Exportation pour Vercel
module.exports = app;

// 3. Démarrage local (uniquement si exécuté directement)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Serveur démarré en mode LOCAL sur le port ${PORT}`);
        
        // Background monitoring (uniquement en local)
        const { checkStationStatus } = require('./controllers/dataController');
        setInterval(checkStationStatus, 60000); 
        console.log('⏳ Background Worker local actif.');
    });
}


