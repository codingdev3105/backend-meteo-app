const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDocs, saveDocSection, uploadMedia, deleteDocSection } = require('../controllers/adminDocsController');
const { protect, admin } = require('../middleware/authMiddleware');

// Configuration Multer pour les images et vidéos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/docs';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Force l'encodage en UTF-8 pour préserver le nom exact
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, originalName);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|mp4|mov|avi/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Images et vidéos uniquement!'));
    }
});

// Routes publiques
router.get('/', getDocs);

// Routes Admin protégées
router.post('/save', protect, admin, saveDocSection);
router.post('/upload', protect, admin, upload.single('media'), uploadMedia);
router.delete('/:id', protect, admin, deleteDocSection);

module.exports = router;
