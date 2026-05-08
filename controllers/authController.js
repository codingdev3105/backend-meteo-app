const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Générer le Token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const mongoose = require('mongoose');

// @desc    Authentifier utilisateur & obtenir token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    const { username, password } = req.body;

    // Vérifier si la base de données est connectée
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: 'Service de base de données indisponible. Vérifiez votre connexion.' });
    }

    try {
        console.log(`🔑 Tentative de connexion pour: ${username}`);
        const user = await User.findOne({ username }).select('+password');
        
        if (!user) {
            console.log(`❌ Utilisateur non trouvé: ${username}`);
            return res.status(401).json({ message: 'Nom d\'utilisateur incorrect' });
        }

        const isMatch = await user.matchPassword(password);
        console.log(`📊 Comparaison mot de passe: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

        if (isMatch) {
            user.lastAccess = Date.now();
            await user.save();

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Identifiants invalides' });
        }
    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir le profil utilisateur
// @route   GET /api/auth/profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtenir tous les utilisateurs (Admin uniquement)
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    S'inscrire / Créer un utilisateur
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    const { username, email, password, role, phoneNumber } = req.body;
    
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: 'Service de base de données indisponible. Veuillez réessayer plus tard.' });
    }

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'Utilisateur ou email déjà existant' });
        }
        const user = await User.create({ username, email, password, role, phoneNumber });
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('❌ Register Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mettre à jour un utilisateur
// @route   PUT /api/auth/users/:id
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.role = req.body.role || user.role;
            user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
            if (req.body.password) {
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/auth/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'Utilisateur supprimé' });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mettre à jour MON profil (Utilisateur connecté)
// @route   PUT /api/auth/profile
exports.updateMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mettre à jour MON mot de passe
// @route   PUT /api/auth/password
exports.updateMyPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Mot de passe mis à jour avec succès' });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
