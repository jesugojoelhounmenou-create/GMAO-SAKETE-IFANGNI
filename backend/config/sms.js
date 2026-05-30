// backend/config/sms.js - Configuration SMS avec Twilio pour GMAO Sakété

import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const requiredTwilioVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
const missingTwilioVars = requiredTwilioVars.filter(varName => !process.env[varName]);

const isTwilioConfigured = () => {
    return !!(process.env.TWILIO_ACCOUNT_SID && 
              process.env.TWILIO_AUTH_TOKEN && 
              process.env.TWILIO_PHONE_NUMBER);
};

if (!isTwilioConfigured() && process.env.NODE_ENV === 'production') {
    console.warn('Twilio non configure - les SMS seront en mode simulation');
    console.warn('   Variables manquantes:', missingTwilioVars.join(', '));
}

// ============================================
// INITIALISATION DU CLIENT TWILIO
// ============================================

let twilioClient = null;

const getTwilioClient = () => {
    if (!twilioClient && isTwilioConfigured()) {
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }
    return twilioClient;
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
        cleaned = `+229${cleaned.substring(1)}`;
    }
    else if (cleaned.startsWith('229')) {
        cleaned = `+${cleaned}`;
    }
    else if (!cleaned.startsWith('+')) {
        cleaned = `+229${cleaned}`;
    }
    
    return cleaned;
};

const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    const formatted = formatPhoneNumber(phone);
    const regex = /^\+229[0-9]{8}$/;
    return regex.test(formatted);
};

const truncateMessage = (message, maxLength = 160) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
};

// ============================================
// ENVOI DE SMS
// ============================================

export async function sendSMS(to, message, options = {}) {
    const formattedNumber = formatPhoneNumber(to);
    
    if (!isValidPhoneNumber(formattedNumber)) {
        console.warn('Numero de telephone invalide:', to);
        return false;
    }
    
    if (!isTwilioConfigured()) {
        console.log('[SIMULATION] SMS envoye a', formattedNumber);
        console.log('   Message:', truncateMessage(message));
        return true;
    }
    
    try {
        const client = getTwilioClient();
        const result = await client.messages.create({
            body: truncateMessage(message),
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedNumber,
            ...options
        });
        
        console.log('SMS envoye a', formattedNumber, '(SID:', result.sid, ')');
        return true;
    } catch (error) {
        console.error('Erreur envoi SMS:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error(error);
        }
        return false;
    }
}

export async function sendBulkSMS(recipients, message) {
    const results = {
        total: recipients.length,
        success: [],
        failed: []
    };
    
    for (const recipient of recipients) {
        const success = await sendSMS(recipient, message);
        if (success) {
            results.success.push(recipient);
        } else {
            results.failed.push(recipient);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('SMS groupe:', results.success.length, '/', results.total, 'succes');
    return results;
}

export async function testTwilioConnection() {
    if (!isTwilioConfigured()) {
        return { success: false, error: 'Twilio non configure' };
    }
    
    try {
        const client = getTwilioClient();
        await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('Connexion Twilio etablie');
        return { success: true };
    } catch (error) {
        console.error('Erreur connexion Twilio:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// TEMPLATES DE SMS
// ============================================

export async function sendValidationSMS(user) {
    const message = 'GMAO Sakete: Votre compte a ete valide. Connectez-vous sur https://gmao-sakete.netlify.app/login.html';
    
    if (user.telephone) {
        return sendSMS(user.telephone, message);
    }
    
    console.log('Aucun telephone pour', user.nom);
    return false;
}

export async function sendInterventionSMS(technicien, intervention) {
    if (!technicien.telephone) {
        console.log('Aucun telephone pour le technicien', technicien.nom);
        return false;
    }
    
    const equipement = intervention.equipement || {};
    const priorite = intervention.signalement?.priorite || 'HAUTE';
    let prioriteTexte = '';
    if (priorite === 'CRITIQUE') prioriteTexte = 'CRITIQUE';
    else if (priorite === 'HAUTE') prioriteTexte = 'HAUTE';
    else prioriteTexte = 'NORMALE';
    
    const message = `GMAO: Intervention ${prioriteTexte} sur ${equipement.nom} (${equipement.service}). Connectez-vous pour prendre en charge.`;
    
    return sendSMS(technicien.telephone, message);
}

export async function sendSignalementSMS(soignant, equipement) {
    if (!soignant.telephone) {
        console.log('Aucun telephone pour le soignant', soignant.nom);
        return false;
    }
    
    const message = `GMAO: Signalement enregistre pour ${equipement.nom}. Un technicien va intervenir.`;
    
    return sendSMS(soignant.telephone, message);
}

export async function sendInterventionTermineeSMS(soignant, equipement) {
    if (!soignant.telephone) {
        console.log('Aucun telephone pour le soignant', soignant.nom);
        return false;
    }
    
    const message = `GMAO: Panne resolue sur ${equipement.nom}. L'equipement est a nouveau fonctionnel.`;
    
    return sendSMS(soignant.telephone, message);
}

export default {
    sendSMS,
    sendBulkSMS,
    sendValidationSMS,
    sendInterventionSMS,
    sendSignalementSMS,
    sendInterventionTermineeSMS,
    testTwilioConnection,
    isTwilioConfigured,
    formatPhoneNumber,
    isValidPhoneNumber
};
