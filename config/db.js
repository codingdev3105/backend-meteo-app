const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME
        });
        console.log(`✅ MongoDB Connecté : ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Erreur de connexion MongoDB : ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
