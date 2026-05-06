const Documentation = require('../models/Documentation');
const path = require('path');
const fs = require('fs');

// @desc    Récupérer toute la documentation (Public)
exports.getDocs = async (req, res) => {
    try {
        const docs = await Documentation.find().sort({ order: 1 });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ajouter ou mettre à jour une section (Admin)
exports.saveDocSection = async (req, res) => {
    try {
        const { _id, category, title, steps, order } = req.body;
        
        if (_id) {
            // Récupérer l'ancienne version pour comparer les fichiers
            const oldSection = await Documentation.findById(_id);
            if (oldSection) {
                // Pour chaque étape, vérifier si le média a changé
                oldSection.steps.forEach(oldStep => {
                    if (oldStep.mediaUrl) {
                        // Chercher si ce média existe encore dans les nouvelles étapes
                        const isStillUsed = steps.find(s => s.mediaUrl === oldStep.mediaUrl);
                        if (!isStillUsed) {
                            // Le fichier n'est plus utilisé, on le supprime du disque
                            const filePath = path.join(__dirname, '..', oldStep.mediaUrl);
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        }
                    }
                });
            }

            const section = await Documentation.findByIdAndUpdate(_id, {
                category, title, steps, order
            }, { new: true });
            return res.json(section);
        } else {
            const section = await Documentation.create({
                category, title, steps, order
            });
            return res.json(section);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Télécharger un média (Admin)
exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier téléchargé' });
        }
        
        // On renvoie l'URL relative pour stockage en DB
        const url = `/uploads/docs/${req.file.filename}`;
        res.json({ url });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supprimer une section (Admin)
exports.deleteDocSection = async (req, res) => {
    try {
        const section = await Documentation.findById(req.params.id);
        if (section) {
            // Supprimer tous les fichiers associés à cette section
            section.steps.forEach(step => {
                if (step.mediaUrl) {
                    const filePath = path.join(__dirname, '..', step.mediaUrl);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            });
            await Documentation.findByIdAndDelete(req.params.id);
        }
        res.json({ message: 'Section et fichiers supprimés' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
