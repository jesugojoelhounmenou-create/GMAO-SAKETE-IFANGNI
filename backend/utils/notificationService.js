import { sendNotification as sendSocketNotification } from '../config/socket.js';

// Types de notifications
export const NOTIFICATION_TYPES = {
  NOUVELLE_PANNE: 'NOUVELLE_PANNE',
  INTERVENTION_DEBUTEE: 'INTERVENTION_DEBUTEE',
  INTERVENTION_TERMINEE: 'INTERVENTION_TERMINEE',
  ALERTE_STOCK: 'ALERTE_STOCK',
  RAPPORT_DISPONIBLE: 'RAPPORT_DISPONIBLE',
  MAINTENANCE_PREVENTIVE: 'MAINTENANCE_PREVENTIVE'
};

// Envoyer une notification
export const sendNotification = (userId, type, title, body, data = {}) => {
  // Notification socket (temps réel)
  sendSocketNotification(userId, {
    type,
    title,
    body,
    data,
    timestamp: new Date()
  });
  
  // Sauvegarder dans la base (pour historique)
  // À implémenter si besoin
};

// Notifier tous les techniciens
export const notifyAllTechniciens = async (type, title, body, data = {}) => {
  try {
    const techniciens = await prisma.user.findMany({
      where: { role: 'TECHNICIEN', statut: 'ACTIF' }
    });
    
    techniciens.forEach(tech => {
      sendNotification(tech.id, type, title, body, data);
    });
  } catch (error) {
    console.error('Erreur notification techniciens:', error);
  }
};

// Notifier un service spécifique
export const notifyService = async (service, type, title, body, data = {}) => {
  try {
    const users = await prisma.user.findMany({
      where: { service: service, statut: 'ACTIF' }
    });
    
    users.forEach(user => {
      sendNotification(user.id, type, title, body, data);
    });
  } catch (error) {
    console.error('Erreur notification service:', error);
  }
};