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

// Générer un matricule unique
export function generateMatricule(nom, prenom) {
    const prefix = 'HZSI';
    const date = new Date();
    const annee = date.getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const nomCode = nom.substring(0, 3).toUpperCase();
    const prenomCode = prenom ? prenom.substring(0, 2).toUpperCase() : 'XX';
    return `${prefix}-${annee}-${nomCode}${prenomCode}-${random}`;
}

// Email de bienvenue après inscription
export async function sendWelcomeEmail(user, plainPassword) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1a2a4f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
                .credentials { background: white; padding: 15px; border-radius: 10px; margin: 15px 0; }
                .btn { display: inline-block; padding: 10px 20px; background: #1a2a4f; color: white; text-decoration: none; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🏥 GMAO Hôpital Sakété-Ifangni</h2>
                </div>
                <div class="content">
                    <h3>Bienvenue ${user.nom} ${user.prenom || ''} !</h3>
                    <p>Votre compte a été créé avec succès sur la plateforme GMAO.</p>
                    
                    <div class="credentials">
                        <h4>📋 Vos identifiants de connexion :</h4>
                        <p><strong>👤 Identifiant :</strong> ${user.email}</p>
                        <p><strong>🔑 Mot de passe :</strong> ${plainPassword}</p>
                        <p><strong>🆔 Matricule :</strong> ${user.matricule}</p>
                    </div>
                    
                    <p>⚠️ <strong>Important :</strong> Votre compte est en attente de validation par le technicien biomédical.</p>
                    <p>Vous recevrez un email de confirmation dès son activation.</p>
                    
                    <p style="margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html" class="btn">🔐 Se connecter</a>
                    </p>
                </div>
                <div class="footer">
                    <p>GMAO - Hôpital de Zone Sakété-Ifangni</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"GMAO Sakété" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: '✅ Bienvenue sur GMAO - Vos identifiants de connexion',
            html,
        });
        console.log('Email de bienvenue envoyé:', info.messageId);
        return true;
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
}

// Email de validation du compte (après validation par technicien)
export async function sendValidationEmail(user) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
                .btn { display: inline-block; padding: 10px 20px; background: #1a2a4f; color: white; text-decoration: none; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Votre compte GMAO a été activé !</h2>
                </div>
                <div class="content">
                    <p>Bonjour ${user.nom},</p>
                    <p>Votre compte a été <strong>validé</strong> par le technicien biomédical.</p>
                    <p>Vous pouvez dès maintenant :</p>
                    <ul>
                        <li>📱 Scanner les QR codes des équipements</li>
                        <li>⚠️ Signaler des pannes via le chatbot</li>
                        <li>📊 Consulter l'état des équipements</li>
                    </ul>
                    <p style="margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html" class="btn">🔐 Se connecter</a>
                    </p>
                </div>
                <div class="footer">
                    <p>GMAO - Hôpital de Zone Sakété-Ifangni</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await transporter.sendMail({
            from: `"GMAO Sakété" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: '✅ Compte GMAO activé - Bienvenue !',
            html,
        });
        console.log('Email de validation envoyé à:', user.email);
        return true;
    } catch (error) {
        console.error('Erreur envoi email validation:', error);
        return false;
    }
}

export default transporter;