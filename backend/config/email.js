// backend/config/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const isEmailConfigured = () => {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

if (!isEmailConfigured() && process.env.NODE_ENV === 'production') {
    console.warn('Email non configure - les emails seront en mode simulation');
    console.warn('   Variables manquantes: EMAIL_USER, EMAIL_PASS');
}

// ============================================
// CONFIGURATION DU TRANSPORTEUR
// ============================================

const getTransporter = () => {
    if (!isEmailConfigured()) {
        return null;
    }

    const config = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 5,
        rateDelta: 1000,
        rateLimit: 5
    };

    if (config.host === 'smtp.gmail.com') {
        config.auth = {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        };
    }

    return nodemailer.createTransport(config);
};

let transporter = null;

export const sendEmail = async (to, subject, html, text = null) => {
    if (!isEmailConfigured()) {
        console.log('[SIMULATION] Email envoye a', to);
        console.log('   Sujet:', subject);
        console.log('   Contenu:', text || html.replace(/<[^>]*>/g, '').substring(0, 200));
        return { messageId: `sim-${Date.now()}`, accepted: [to] };
    }

    if (!transporter) {
        transporter = getTransporter();
        try {
            await transporter.verify();
            console.log('Serveur email connecte');
        } catch (error) {
            console.error('Erreur connexion email:', error.message);
            throw error;
        }
    }

    try {
        const info = await transporter.sendMail({
            from: `"GMAO Hopital Sakete" <${process.env.EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: text || html.replace(/<[^>]*>/g, ''),
            html: html,
        });

        console.log(`Email envoye a ${to} (${info.messageId})`);
        return info;
    } catch (error) {
        console.error('Erreur envoi email:', error.message);
        throw error;
    }
};

const getBaseTemplate = (title, content, buttonText = null, buttonUrl = null, color = '#0066FF') => {
    const buttonHtml = buttonText && buttonUrl ? `
        <div style="text-align: center; margin: 25px 0;">
            <a href="${buttonUrl}" style="background: ${color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold;">${buttonText}</a>
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f1f5f9; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, ${color}, ${color === '#0066FF' ? '#0052CC' : '#166534'}); color: white; padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0; }
                .content { background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; }
                .button { display: inline-block; padding: 12px 30px; background: ${color}; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 12px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>GMAO Hopital Sakete-Ifangni</h2>
                </div>
                <div class="content">
                    <h3>${title}</h3>
                    ${content}
                    ${buttonHtml}
                </div>
                <div class="footer">
                    <p>GMAO - Gestion de Maintenance Assistee par Ordinateur</p>
                    <p>Hopital de Zone Sakete-Ifangni • Benin</p>
                    <p style="margin-top: 10px;">
                        <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}" style="color: #0066FF; text-decoration: none;">Acceder a la plateforme</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
};

export const sendValidationEmail = async (user) => {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Votre compte a ete <strong style="color: #22c55e;">valide</strong> par le service biomedical.</p>
        
        <div class="info-box">
            <p><strong>Vos identifiants :</strong></p>
            <p>Identifiant : ${user.email}</p>
            <p>Matricule : ${user.matricule}</p>
        </div>
        
        <p>Vous pouvez maintenant vous connecter a l'application GMAO.</p>
    `;

    const html = getBaseTemplate(
        'Votre compte GMAO a ete valide',
        content,
        'Se connecter',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`,
        '#22c55e'
    );

    return sendEmail(user.email, 'Votre compte GMAO a ete valide', html);
};

export const sendWelcomeEmail = async (user, plainPassword) => {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Votre compte a ete cree avec succes sur la plateforme GMAO.</p>
        
        <div class="info-box">
            <p><strong>Vos identifiants de connexion :</strong></p>
            <p><strong>Identifiant :</strong> ${user.email}</p>
            <p><strong>Mot de passe :</strong> ${plainPassword}</p>
            <p><strong>Matricule :</strong> ${user.matricule}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 12px; margin: 15px 0;">
            <p><strong>Important :</strong> Votre compte est en attente de validation par le technicien biomedical.</p>
            <p>Vous recevrez un email de confirmation des son activation.</p>
        </div>
    `;

    const html = getBaseTemplate(
        'Bienvenue sur GMAO Sakete',
        content,
        'Se connecter',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`,
        '#0066FF'
    );

    return sendEmail(user.email, 'Bienvenue sur GMAO Sakete', html);
};

export const testEmailConnection = async () => {
    if (!isEmailConfigured()) {
        return { success: false, error: 'Email non configure' };
    }

    try {
        const testTransporter = getTransporter();
        await testTransporter.verify();
        console.log('Connexion email etablie');
        return { success: true };
    } catch (error) {
        console.error('Erreur connexion email:', error.message);
        return { success: false, error: error.message };
    }
};

export default {
    sendEmail,
    sendValidationEmail,
    sendWelcomeEmail,
    testEmailConnection,
    isEmailConfigured
};
