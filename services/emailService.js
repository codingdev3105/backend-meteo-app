const nodemailer = require('nodemailer');

// Configuration du transporteur Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Utilisez un "Mot de passe d'application" Gmail
    }
});

/**
 * Envoie un email générique
 * @param {string} to - Destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} html - Contenu au format HTML
 */
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"MétéoPro Systems" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email envoyé: ' + info.response);
        return info;
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        throw error;
    }
};

/**
 * Template pour les messages de contact
 */
const sendContactEmail = async (contactData) => {
    const { name, email, subject, message } = contactData;
    
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0ea5e9;">Nouveau message de contact - MétéoPro</h2>
            <p><strong>Nom :</strong> ${name}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Sujet :</strong> ${subject}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p><strong>Message :</strong></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                ${message.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;

    return sendEmail(process.env.EMAIL_USER, `Contact: ${subject}`, html);
};

module.exports = {
    sendEmail,
    sendContactEmail
};
