import prisma from '../config/database.js';

// ============================================================
// BASE DE CONNAISSANCES SOIGNANT — Arbre de decision simplifie
// Pas de diagnostic technique — uniquement signalement
// ============================================================

const intentsSoignant = {
  panne: {
    keywords: ['panne', 'casse', 'ne fonctionne', 'marche pas', 'hs', 'hors service',
               'probleme', 'dysfonctionnement', 'defaillant', 'arrete', 'bloque'],
    response: (eq) => eq
      ? `Probleme detecte sur ${eq.nom} (${eq.service}).\n\nPouvez-vous decrire ce que vous observez ?\n\nExemples :\n- Une alarme sonore\n- Un message d'erreur a l'ecran\n- L'appareil ne demarre plus\n- Un bruit inhabituel`
      : `Sur quel equipement avez-vous un probleme ?\n\nPrecisez le nom (respirateur, moniteur, defibrillateur...)`
  },

  urgence: {
    keywords: ['urgence', 'critique', 'grave', 'immediat', 'vital', 'danger', 'urgent'],
    response: (eq) =>
      `SIGNALEMENT URGENT\n\n` +
      (eq ? `Equipement : ${eq.nom}\n` : '') +
      `Le service de maintenance va etre alerte immediatement.\n\nIntervention prioritaire.`
  },

  etat: {
    keywords: ['etat', 'statut', 'disponible', 'fonctionne', 'fonctionnel', 'est-ce que'],
    response: (eq) => eq
      ? `${eq.nom}\n` +
        `Statut : ${eq.statut === 'FONCTIONNEL' ? 'Fonctionnel' : 'En panne'}\n` +
        `Service : ${eq.service}\n\n` +
        (eq.statut !== 'FONCTIONNEL'
          ? `Cet equipement est signale comme defaillant. Souhaitez-vous faire un nouveau signalement ?`
          : `Si vous constatez un probleme, decrivez-le et je transmettrai au service maintenance.`)
      : `Quel equipement souhaitez-vous verifier ?`
  },

  scanner: {
    keywords: ['scanner', 'qr', 'code', 'flash', 'scan'],
    response: () =>
      `Scannez le QR code de l'equipement pour l'identifier automatiquement.\n\nAppuyez sur Scanner QR en haut de l'ecran.`
  },

  aide: {
    keywords: ['aide', 'help', 'bonjour', 'salut', 'bonsoir', 'que faire', 'comment', 'assistance'],
    response: () =>
      `Bonjour !\n\nJe suis l'assistant signalement de pannes.\n\n` +
      `Voici ce que je peux faire :\n` +
      `- Signaler une panne : "le respirateur est en panne"\n` +
      `- Verifier un equipement : "etat du moniteur"\n` +
      `- Signalement urgent : "urgence defibrillateur"\n` +
      `- Scanner QR : "scanner"\n\n` +
      `Decrivez simplement le probleme, je m'occupe du reste.`
  }
};

function detectIntentSoignant(message) {
  const msg = message.toLowerCase();
  for (const [intent, data] of Object.entries(intentsSoignant)) {
    if (data.keywords.some(k => msg.includes(k))) {
      return { intent, response: data.response };
    }
  }
  return { intent: 'aide', response: intentsSoignant.aide.response };
}

async function findEquipementSoignant(message, userService) {
  try {
    const equipements = await prisma.equipement.findMany({
      where: userService ? { service: userService } : undefined,
      select: {
        id: true, nom: true, marque: true, statut: true,
        codeInventaire: true, service: true, updatedAt: true
      }
    });

    const msg = message.toLowerCase();
    for (const eq of equipements) {
      const nomLower = eq.nom.toLowerCase();
      if (
        msg.includes(nomLower) ||
        (eq.codeInventaire && msg.includes(eq.codeInventaire.toLowerCase())) ||
        nomLower.split(' ').some(w => w.length > 3 && msg.includes(w))
      ) {
        return eq;
      }
    }
    return null;
  } catch { return null; }
}

async function getOrCreateConversationSoignant(conversationId, userId, equipementId = null) {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: parseInt(conversationId) }
    });
    if (existing) return existing;
  }
  return prisma.conversation.create({
    data: {
      utilisateurId: userId,
      type: 'SIGNALEMENT',
      equipementId: equipementId || null,
      dateDebut: new Date()
    }
  });
}

export const chatbotSignalement = async (req, res) => {
  const { message, equipmentId, conversationId } = req.body;
  const userId      = req.user?.id;
  const userService = req.user?.service || null;

  if (!message?.trim()) {
    return res.status(400).json({ reply: 'Message vide.', action: 'error' });
  }

  try {
    let equipement = null;
    if (equipmentId) {
      equipement = await prisma.equipement.findUnique({
        where: { id: parseInt(equipmentId) },
        select: {
          id: true, nom: true, marque: true, statut: true,
          codeInventaire: true, service: true, updatedAt: true
        }
      });
    }
    if (!equipement) {
      equipement = await findEquipementSoignant(message, userService);
    }

    const conversation = await getOrCreateConversationSoignant(
      conversationId, userId, equipement?.id
    );

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'USER',
        contenu: message,
        dateEnvoi: new Date()
      }
    });

    const { intent, response } = detectIntentSoignant(message);
    let reply  = '';
    let action = 'info';
    let data   = {};

    switch (intent) {
      case 'panne':
        reply = response(equipement);
        if (equipement) {
          action = 'ask_panne_details';
          data = { equipmentId: equipement.id, equipmentNom: equipement.nom };
        } else {
          action = 'ask_equipment';
        }
        break;

      case 'urgence':
        reply = response(equipement);
        action = 'urgence';
        if (equipement) {
          await prisma.alerte.create({
            data: {
              type: 'PANNE_URGENTE',
              niveau: 'CRITIQUE',
              message: `Urgence signalee via chatbot soignant : ${equipement.nom}`,
              equipementId: equipement.id
            }
          }).catch(() => {});
          action = 'urgence_created';
          data = { equipmentId: equipement.id, equipmentNom: equipement.nom };
        }
        break;

      case 'etat':
        reply = response(equipement);
        if (equipement) {
          action = equipement.statut !== 'FONCTIONNEL' ? 'ask_panne_details' : 'info';
          data = { equipmentId: equipement.id };
        }
        break;

      case 'scanner':
        reply = response();
        action = 'open_scanner';
        break;

      default:
        reply = response();
        action = 'aide';
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'BOT',
        contenu: reply,
        typeMessage: action,
        donnees: Object.keys(data).length > 0 ? JSON.stringify(data) : null,
        dateEnvoi: new Date()
      }
    });

    return res.json({ reply, action, data, conversationId: conversation.id });

  } catch (error) {
    console.error('chatbotSignalement error:', error);
    return res.status(500).json({
      reply: 'Erreur serveur. Reessayez ou contactez le service maintenance.',
      action: 'error'
    });
  }
};

export const chatbotCreerSignalement = async (req, res) => {
  const { equipmentId, description, priorite = 'MOYENNE', conversationId } = req.body;
  const userId = req.user?.id;

  if (!equipmentId || !description?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Equipement et description requis.'
    });
  }

  try {
    const equipId = parseInt(equipmentId);

    const equipement = await prisma.equipement.findUnique({ where: { id: equipId } });
    if (!equipement) {
      return res.status(404).json({ success: false, message: 'Equipement introuvable.' });
    }

    const signalement = await prisma.signalement.create({
      data: {
        equipementId: equipId,
        signaleParId: userId,
        description: description.trim(),
        priorite,
        conversationId: conversationId ? parseInt(conversationId) : null
      }
    });

    const technicien = await prisma.user.findFirst({
      where: { role: 'TECHNICIEN', statut: 'ACTIF' },
      select: { id: true }
    });

    if (!technicien) {
      await prisma.alerte.create({
        data: {
          type: 'NOUVELLE_PANNE',
          niveau: priorite === 'CRITIQUE' ? 'CRITIQUE' : 'ATTENTION',
          message: `Nouvelle panne signalee : ${equipement.nom} — Aucun technicien disponible`,
          equipementId: equipId
        }
      }).catch(() => {});

      return res.json({
        success: true,
        message: `Signalement enregistre sur ${equipement.nom}.\nAucun technicien disponible actuellement — le responsable a ete alerte.`,
        signalementId: signalement.id,
        interventionId: null
      });
    }

    const intervention = await prisma.intervention.create({
      data: {
        signalementId: signalement.id,
        equipementId: equipId,
        technicienId: technicien.id,
        type: 'CORRECTIF',
        statut: 'EN_ATTENTE',
        diagnostic: description.trim()
      }
    });

    await prisma.equipement.update({
      where: { id: equipId },
      data: {
        statut: 'EN_PANNE',
        dateDernierePanne: new Date(),
        nombrePannes: { increment: 1 }
      }
    }).catch(() => {});

    await prisma.alerte.create({
      data: {
        type: 'NOUVELLE_PANNE',
        niveau: priorite === 'CRITIQUE' ? 'CRITIQUE' : 'ATTENTION',
        message: `Panne signalee par soignant : ${equipement.nom} (${priorite})`,
        equipementId: equipId,
        interventionId: intervention.id
      }
    }).catch(() => {});

    if (conversationId) {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { type: 'SIGNALEMENT', equipementId: equipId }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Panne signalee avec succes sur ${equipement.nom}.\nUn technicien va prendre en charge l'intervention.`,
      signalementId: signalement.id,
      interventionId: intervention.id
    });

  } catch (error) {
    console.error('chatbotCreerSignalement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du signalement. Contactez le service maintenance directement.'
    });
  }
};
