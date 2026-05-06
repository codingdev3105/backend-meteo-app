require('dotenv').config();
const mongoose = require('mongoose');
const Documentation = require('./models/Documentation');
const connectDB = require('./config/db');

const seedData = [
    // --- 1. GUIDE DE LA STATION ---
    {
        category: 'STATION_GUIDE',
        title: 'Guide d\'installation et Matériel',
        order: 1,
        steps: [
            {
                title: '1. Installation de la Station',
                content: 'Placez le Hub Central dans une zone couverte par le Wi-Fi. Fixez les nœuds capteurs à l\'extérieur à l\'aide des supports fournis. Veillez à ce que les antennes soient orientées verticalement pour une portée maximale.',
                mediaType: 'video', // Le user veut explication + images + video
                mediaUrl: '/uploads/docs/installation-guide.mp4'
            },
            {
                title: '2. Alimentation par Batterie',
                content: 'Votre système est conçu pour une autonomie totale sur batterie (pas d\'alimentation solaire nécessaire). La batterie Li-ion intégrée gère intelligemment la consommation grâce au mode Deep Sleep du STM32.',
                mediaType: 'video', // Le user veut explication + images + video
                mediaUrl: '/uploads/docs/battery-guide.mp4'
            },
            {
                title: '3. Maintenance des Capteurs',
                content: 'Maintenance Zéro : Les capteurs météorologiques sont auto-nettoyants et ne nécessitent aucune intervention technique régulière. Les boîtiers sont scellés pour résister aux conditions extrêmes.',
                mediaType: 'none'
            }
        ]
    },

    // --- 2. GUIDE DE LA PLATEFORME ---
    {
        category: 'PLATFORM_GUIDE',
        title: 'Utilisation de la Plateforme Cloud',
        order: 2,
        steps: [
            {
                title: '1. Création du Compte',
                content: 'Rendez-vous sur la page d\'inscription. Remplissez votre nom, email et mot de passe. Vous recevrez un accès immédiat à votre espace personnel.',
                mediaType: 'image',
                mediaUrl: '/uploads/docs/register-capture.jpg'
            },
            {
                title: '2. Lier la Station à la Plateforme',
                content: 'Dans votre panel, utilisez l\'ID matériel unique de votre Hub pour enregistrer votre station sur le réseau Cloud.',
                mediaType: 'image',
                mediaUrl: '/uploads/docs/link-station.jpg'
            },
            {
                title: '3. Configuration du Compte',
                content: 'Personnalisez votre profil, changez votre mot de passe et gérez vos informations de contact depuis l\'onglet Paramètres.',
                mediaType: 'image',
                mediaUrl: '/uploads/docs/config-account.jpg'
            },
            {
                title: '4. Configuration des Seuils',
                content: 'Définissez des règles de surveillance (Seuils). Choisissez le capteur et la valeur critique pour recevoir des alertes en temps réel.',
                mediaType: 'image',
                mediaUrl: '/uploads/docs/config-thresholds.jpg'
            },
            {
                title: '5. Surveillance en Temps Réel (Dashboard)',
                content: 'Le Dashboard affiche la topologie de votre réseau IoT. Chaque nœud est représenté avec ses dernières mesures et son état de connexion.',
                mediaType: 'image',
                mediaUrl: '/uploads/docs/dashboard-explanation.jpg'
            },
            {
                title: '6. Historique & Journaux',
                content: 'Consultez l\'historique complet de vos données météo sous forme de graphiques et accédez au journal des événements système pour un audit complet.',
                mediaType: 'image',
                mediaUrl: '/uploads/docs/history-logs.jpg'
            }
        ]
    },

    // --- 3. FAQ ---
    {
        category: 'FAQ',
        title: 'Questions Fréquentes',
        order: 3,
        steps: [
            {
                title: 'Comment recharger la batterie ?',
                content: 'Connectez simplement le Hub à un chargeur USB standard via le port USB-C. Une recharge complète prend environ 4 heures.',
                mediaType: 'none'
            },
            {
                title: 'Le système fonctionne-t-il sous la pluie ?',
                content: 'Oui, tout le matériel est certifié IP65, garantissant une protection totale contre la pluie et la poussière.',
                mediaType: 'none'
            },
            {
                title: 'Puis-je ajouter plusieurs stations ?',
                content: 'Oui, un seul compte peut gérer un nombre illimité de hubs centraux répartis sur différents sites.',
                mediaType: 'none'
            }
        ]
    }
];

const seedDocs = async () => {
    try {
        await connectDB();
        await Documentation.deleteMany(); 
        await Documentation.insertMany(seedData);
        console.log('✅ Documentation re-générée avec succès selon la nouvelle structure !');
        process.exit();
    } catch (error) {
        console.error('❌ Erreur de seeding :', error);
        process.exit(1);
    }
};

seedDocs();
