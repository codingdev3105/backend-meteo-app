const nodemailer = require('nodemailer');
const User = require('../models/User');

exports.sendContactEmail = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs.' });
  }

  try {
    // Récupérer l'e-mail de l'administrateur depuis la base de données
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.warn("⚠️ Aucun administrateur trouvé en base. Utilisation du fallback .env");
    }

    const recipientEmail = adminUser ? adminUser.email : process.env.ADMIN_EMAIL;

    // Configuration du transporteur (SMTP explicite pour Gmail)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true pour le port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Options de l'email
    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL_USER}>`, // L'expéditeur authentifié
      to: recipientEmail,
      replyTo: email, // L'email du client pour pouvoir lui répondre directement
      subject: `Nouveau message de la plateforme MétéoPro - de ${name}`,
      text: `Vous avez reçu un nouveau message :\n\nNom: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #059669;">Nouveau message de contact</h2>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> ${email}</p>
          <hr />
          <p><strong>Message :</strong></p>
          <p style="background: #f9fafb; padding: 15px; border-radius: 5px;">${message}</p>
        </div>
      `,
    };

    // Envoi de l'email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Votre message a été envoyé avec succès !' });
  } catch (error) {
    console.error('Erreur Nodemailer:', error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'envoi du message.", error: error.message });
  }
};
