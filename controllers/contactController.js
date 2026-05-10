const emailService = require('../services/emailService');
const User = require('../models/User');

exports.sendContactEmail = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs.' });
  }

  try {
    // On utilise le service centralisé
    await emailService.sendContactEmail({
      name,
      email,
      subject: subject || 'Message sans sujet',
      message
    });

    res.status(200).json({ message: 'Votre message a été envoyé avec succès !' });
  } catch (error) {
    console.error('Erreur Contact Controller:', error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'envoi.", error: error.message });
  }
};
