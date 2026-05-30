import prisma from '../config/database.js';
import { sendNotification } from '../config/socket.js';
import { 
  sendInterventionEmail, 
  sendSignalementConfirmationEmail, 
  sendInterventionTermineeEmail 
} from '../config/email.js';
import { 
  sendInterventionSMS, 
  sendSignalementSMS, 
  sendInterventionTermineeSMS 
} from '../config/sms.js';

export const signalerPanne = async (req, res) => {
  const { equipementId, description, priorite, photo } = req.body;
  const userId = req.user.id;

  try {
    const equipement = await prisma.equipement.findUnique({
      where: { id: parseInt(equipementId) },
    });

    if (!equipement) {
      return res.status(404).json({ message: 'Equipement non trouve' });
    }

    const soignant = await prisma.user.findUnique({
      where: { id: userId },
    });

    await prisma.equipement.update({
      where: { id: equipement.id },
      data: { 
        statut: 'EN_PANNE',
        dateDernierePanne: new Date(),
        nombrePannes: { increment: 1 },
      },
    });

    const signalement = await prisma.signalement.create({
      data: {
        equipementId: equipement.id,
        signaleParId: userId,
        description,
        priorite: priorite || 'MOYENNE',
        photo: photo || null,
      },
      include: {
        equipement: true,
        signalePar: { select: { nom: true, service: true } },
      },
    });

    const intervention = await prisma.intervention.create({
      data: {
        signalementId: signalement.id,
        equipementId: equipement.id,
        technicienId: null,
        type: 'URGEANT',
        statut: 'EN_ATTENTE',
        diagnostic: description,
      },
    });

    await prisma.alerte.create({
      data: {
        type: 'PANNE_URGENTE',
        niveau: priorite === 'CRITIQUE' ? 'CRITIQUE' : 'ATTENTION',
        message: `Nouvelle panne signalee: ${equipement.nom} - ${description.substring(0, 100)}`,
        equipementId: equipement.id,
        interventionId: intervention.id,
      },
    });

    try {
      await sendSignalementConfirmationEmail(soignant, equipement);
      if (soignant.telephone) {
        await sendSignalementSMS(soignant, equipement);
      }
    } catch (notifError) {
      console.log('Notification soignant echouee:', notifError.message);
    }

    const techniciens = await prisma.user.findMany({
      where: { role: 'TECHNICIEN', statut: 'ACTIF' },
    });
    
    for (const tech of techniciens) {
      try {
        await sendInterventionEmail(tech, intervention);
      } catch(e) { console.log('Email tech echoue:', e.message); }
      
      try {
        if (tech.telephone) {
          await sendInterventionSMS(tech, intervention);
        }
      } catch(e) { console.log('SMS tech echoue:', e.message); }
      
      sendNotification(tech.id, {
        type: 'NOUVELLE_PANNE',
        title: 'Nouvelle panne signalee',
        body: `${equipement.nom} - ${equipement.service}`,
        data: { signalementId: signalement.id, equipementId: equipement.id },
      });
    }

    res.status(201).json({
      message: 'Panne signalee avec succes',
      signalement,
      intervention,
    });
  } catch (error) {
    console.error('Erreur signalement:', error);
    res.status(500).json({ message: 'Erreur lors du signalement' });
  }
};

export const getUrgences = async (req, res) => {
  try {
    const urgences = await prisma.intervention.findMany({
      where: {
        statut: 'EN_ATTENTE',
        type: { in: ['URGEANT', 'CORRECTIF'] },
      },
      include: {
        equipement: true,
        signalement: {
          include: {
            signalePar: { select: { nom: true, service: true } },
          },
        },
      },
      orderBy: [
        { signalement: { priorite: 'desc' } },
        { dateDebut: 'asc' },
      ],
    });

    const result = urgences.map(u => ({
      ...u,
      priorite: u.signalement?.priorite || 'MOYENNE',
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur recuperation urgences:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des urgences' });
  }
};

export const prendreEnCharge = async (req, res) => {
  const { id } = req.params;
  const technicienId = req.user.id;

  try {
    const intervention = await prisma.intervention.update({
      where: { id: parseInt(id) },
      data: {
        technicienId,
        statut: 'EN_COURS',
        dateDebut: new Date(),
      },
      include: {
        equipement: true,
        signalement: true,
      },
    });

    await prisma.equipement.update({
      where: { id: intervention.equipementId },
      data: { statut: 'EN_MAINTENANCE' },
    });

    if (intervention.signalement?.signaleParId) {
      sendNotification(intervention.signalement.signaleParId, {
        type: 'INTERVENTION_DEBUTE',
        title: 'Intervention en cours',
        body: `Un technicien s'occupe de la panne sur ${intervention.equipement.nom}`,
      });
    }

    res.json({ message: 'Intervention prise en charge', intervention });
  } catch (error) {
    console.error('Erreur prise en charge:', error);
    res.status(500).json({ message: 'Erreur lors de la prise en charge' });
  }
};

export const terminerIntervention = async (req, res) => {
  const { id } = req.params;
  const { rapportFinal, piecesUtilisees, dureeMinutes } = req.body;

  try {
    const intervention = await prisma.intervention.update({
      where: { id: parseInt(id) },
      data: {
        statut: 'TERMINE',
        dateFin: new Date(),
        dureeMinutes: dureeMinutes || undefined,
        rapportFinal: rapportFinal || null,
        piecesUtilisees: piecesUtilisees || null,
      },
      include: {
        equipement: true,
        signalement: {
          include: {
            signalePar: true,
          },
        },
      },
    });

    await prisma.equipement.update({
      where: { id: intervention.equipementId },
      data: { statut: 'FONCTIONNEL' },
    });

    if (intervention.signalement) {
      await prisma.signalement.update({
        where: { id: intervention.signalement.id },
        data: { traite: true, dateTraitement: new Date() },
      });
    }

    await prisma.alerte.updateMany({
      where: { interventionId: intervention.id, resolue: false },
      data: { resolue: true, dateResolution: new Date() },
    });

    if (intervention.signalement?.signalePar) {
      const soignant = intervention.signalement.signalePar;
      try {
        await sendInterventionTermineeEmail(soignant, intervention);
        if (soignant.telephone) {
          await sendInterventionTermineeSMS(soignant, intervention.equipement);
        }
      } catch (notifError) {
        console.log('Notification terminaison echouee:', notifError.message);
      }
      
      sendNotification(soignant.id, {
        type: 'INTERVENTION_TERMINEE',
        title: 'Panne resolue',
        body: `${intervention.equipement.nom} est a nouveau fonctionnel`,
      });
    }

    res.json({ message: 'Intervention terminee', intervention });
  } catch (error) {
    console.error('Erreur cloture:', error);
    res.status(500).json({ message: 'Erreur lors de la cloture' });
  }
};

export const getHistoriqueEquipement = async (req, res) => {
  const { equipementId } = req.params;

  try {
    const interventions = await prisma.intervention.findMany({
      where: { equipementId: parseInt(equipementId) },
      include: {
        technicien: { select: { nom: true } },
        signalement: { include: { signalePar: { select: { nom: true, service: true } } } },
      },
      orderBy: { dateDebut: 'desc' },
    });

    res.json(interventions);
  } catch (error) {
    console.error('Erreur historique:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation de l historique' });
  }
};

export const creerIntervention = async (req, res) => {
  console.log('Creation intervention par technicien:', req.body);
  
  const { equipementId, description, priorite } = req.body;
  const technicienId = req.user.id;

  try {
    const equipement = await prisma.equipement.findUnique({
      where: { id: parseInt(equipementId) }
    });

    if (!equipement) {
      return res.status(404).json({ message: 'Equipement non trouve' });
    }

    await prisma.equipement.update({
      where: { id: equipement.id },
      data: { statut: 'EN_MAINTENANCE' }
    });

    const intervention = await prisma.intervention.create({
      data: {
        equipementId: equipement.id,
        technicienId: technicienId,
        type: 'CORRECTIF',
        statut: 'EN_COURS',
        diagnostic: description,
        dateDebut: new Date()
      }
    });

    await prisma.alerte.create({
      data: {
        type: 'MAINTENANCE_DUE',
        niveau: 'INFO',
        message: `Intervention creee sur ${equipement.nom}`,
        equipementId: equipement.id,
        interventionId: intervention.id
      }
    });

    res.status(201).json({
      message: 'Intervention creee avec succes',
      intervention
    });
  } catch (error) {
    console.error('Erreur creation intervention:', error);
    res.status(500).json({ message: 'Erreur serveur: ' + error.message });
  }
};

export const getMesSignalements = async (req, res) => {
  const userId = req.user.id;

  try {
    const signalements = await prisma.signalement.findMany({
      where: { signaleParId: userId },
      include: {
        equipement: true,
        intervention: {
          include: {
            technicien: { select: { nom: true, prenom: true } }
          }
        }
      },
      orderBy: { dateSignalement: 'desc' }
    });

    res.json(signalements);
  } catch (error) {
    console.error('Erreur recuperation signalements:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des signalements' });
  }
};
