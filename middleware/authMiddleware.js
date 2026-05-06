const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Récupérer le token du header "Bearer TOKEN"
            token = req.headers.authorization.split(' ')[1];

            // Décoder le token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Ajouter l'utilisateur à la requête (sans le mot de passe)
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            console.error('❌ Auth Middleware Error:', error);
            res.status(401).json({ message: 'Non autorisé, token invalide' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Non autorisé, pas de token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Non autorisé comme administrateur' });
    }
};

module.exports = { protect, admin };
