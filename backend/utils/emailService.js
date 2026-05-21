import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
}); 

// Envoyer un email
export const sendEmail = async (to, subject, html, text = null) => {
  try {
    const info = await transporter.sendMail({
      from: `"GMAO Hôpital Sakété" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    });
    
    console.log('Email envoyé:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    throw error;
  }
};

// Email de validation de compte
export const sendValidationEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a2a4f; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f5f5f5; }
        .button { display: inline-block; padding: 10px 20px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🏥 GMAO Hôpital Sakété-Ifangni</h2>
        </div>
        <div class="content">
          <h3>Bienvenue ${user.nom} !</h3>
          <p>Votre compte a été <strong>validé</strong> par le service biomédical.</p>
          <p>Vous pouvez maintenant vous connecter à l'application GMAO pour :</p>
          <ul>
            <li>📱 Scanner les QR codes des équipements</li>
            <li>⚠️ Signaler des pannes via le chatbot</li>
            <li>📊 Consulter l'état des équipements</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/login.html" class="button">Se connecter</a>
          </p>
        </div>
        <div class="footer">
          <p>GMAO - Hôpital de Zone Sakété-Ifangni</p>
          <p>En cas de problème, contactez le service biomédical</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(user.email, '✅ Votre compte GMAO a été validé', html);
};

// Email de notification de panne
export const sendPanneNotification = async (technicien, equipment, signalement) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #ef4444; color: white; padding: 15px; text-align: center; }
        .content { padding: 20px; }
        .priority-high { background: #fee2e2; border-left: 4px solid #ef4444; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 Nouvelle panne signalée</h2>
        </div>
        <div class="content">
          <div class="priority-high">
            <p><strong>Équipement:</strong> ${equipment.nom} (${equipment.codeInventaire})</p>
            <p><strong>Service:</strong> ${equipment.service}</p>
            <p><strong>Priorité:</strong> ${signalement.priorite}</p>
            <p><strong>Description:</strong> ${signalement.description}</p>
          </div>
          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/technicien/intervention-form.html?id=${signalement.id}" class="button">Prendre en charge</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(technicien.email, `🚨 Panne - ${equipment.nom}`, html);
};

// Email de confirmation d'intervention terminée
export const sendInterventionTermineeEmail = async (soignant, equipment, intervention) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #22c55e; color: white; padding: 15px; text-align: center; }
        .content { padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Panne résolue</h2>
        </div>
        <div class="content">
          <p>Bonjour ${soignant.nom},</p>
          <p>La panne sur l'équipement <strong>${equipment.nom}</strong> a été résolue.</p>
          <p>L'équipement est à nouveau fonctionnel.</p>
          <hr>
          <p><strong>Rapport d'intervention:</strong></p>
          <p>${intervention.rapportFinal || 'Intervention terminée avec succès'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(soignant.email, `✅ Panne résolue - ${equipment.nom}`, html);
};
