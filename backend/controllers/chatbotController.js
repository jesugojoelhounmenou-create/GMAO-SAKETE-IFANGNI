import prisma from '../config/database.js';

// ============================================================
// BASE DE CONNAISSANCES — Arbre de décision par intentions
// ============================================================
const intents = {
  panne: {
    keywords: ['panne', 'cassé', 'ne fonctionne', 'marche pas', 'hs', 'hors service', 'problème', 'dysfonctionnement', 'défaillance', 'arrêté'],
    action: 'signaler_panne',
    response: (equipment) =>
      equipment
        ? `⚠️ Panne détectée sur **${equipment.nom}**.\n\nPouvez-vous décrire le problème plus précisément ?\n\n📝 Exemples :\n• L'écran reste noir\n• Une alarme est déclenchée\n• La mesure est inexacte\n• Bruit anormal`
        : `Quel équipement est en panne ? Précisez le nom (ex : respirateur, échographe, moniteur...).`
  },

  etat: {
    keywords: ['état', 'statut', 'disponible', 'fonctionne', 'fonctionnel', 'en panne', 'est-ce que', 'vérifier'],
    action: 'verifier_etat',
    response: (equipment) =>
      equipment
        ? `🔍 **${equipment.nom}**\n📊 Statut : ${equipment.statut === 'FONCTIONNEL' ? '✅ FONCTIONNEL' : '❌ EN PANNE'}\n📍 Service : ${equipment.service}\n📅 Dernière MAJ : ${equipment.updatedAt ? new Date(equipment.updatedAt).toLocaleDateString('fr-FR') : 'Non renseignée'}`
        : `Quel équipement souhaitez-vous vérifier ?`
  },

  guide: {
    keywords: ["comment utiliser", "guide", "manuel", "utilisation", "mode d'emploi", "notice", "tutoriel"],
    action: 'afficher_guide',
    response: (equipment) =>
      equipment
        ? `📖 **Guide — ${equipment.nom}**\n\n🔗 Manuel : ${equipment.manuelUrl ? `[Télécharger](${equipment.manuelUrl})` : 'Non disponible'}\n\n❓ Vérifications rapides :\n• L'appareil est-il branché ?\n• Avez-vous redémarré l'équipement ?\n• Contactez le technicien si le problème persiste.`
        : `Pour quel équipement souhaitez-vous un guide ?`
  },

  scanner: {
    keywords: ['scanner', 'qr code', 'flash', 'code barre', 'scan', 'qr'],
    action: 'ouvrir_scanner',
    response: `📱 Activez la caméra pour scanner le QR code sur l'équipement.\n\n📷 Positionnez le code dans le cadre.`
  },

  urgence: {
    keywords: ['urgence', 'critique', 'grave', 'immédiat', 'vital', 'alerte', 'danger'],
    action: 'urgence',
    response: (equipment) =>
      `🚨 **URGENCE SIGNALÉE** 🚨\n\n${equipment?.nom ? `Équipement : ${equipment.nom}\n` : ''}Un technicien va être alerté immédiatement.\n\n⏱️ Intervention prioritaire engagée.\n\nMerci de patienter.`
  },

  aide: {
    keywords: ['aide', 'help', 'bonjour', 'salut', 'bonsoir', 'que faire', 'comment ça marche', 'assistance', 'démarrer'],
    action: 'afficher_aide',
    response: `👋 **Assistant Maintenance GMAO Sakété**\n\nVoici ce que je peux faire :\n\n• **Signaler une panne** : "le respirateur est en panne"\n• **Vérifier l'état** : "état de l'échographe"\n• **Demander un guide** : "comment utiliser le moniteur"\n• **Scanner un QR code** : "scanner"\n• **Urgence** : "urgence moniteur"\n\n💡 Décrivez simplement votre besoin !`
  }
};

// ============================================================
// UTILITAIRES
// ============================================================

/** Cherche un équipement dans la base à partir d'un message */
async function extractEquipment(message, userService) {
  try {
    const allEquipments = await prisma.equipement.findMany({
      where: userService ? { service: userService } : undefined,
      select: { id: true, nom: true, statut: true, codeInventaire: true, service: true, updatedAt: true, manuelUrl: true }
    });

    const messageLower = message.toLowerCase();

    for (const eq of allEquipments) {
      const nomLower = eq.nom.toLowerCase();
      if (
        messageLower.includes(nomLower) ||
        (eq.codeInventaire && messageLower.includes(eq.codeInventaire.toLowerCase())) ||
        nomLower.split(' ').some(word => word.length > 3 && messageLower.includes(word))
      ) {
        return eq;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Détecte l'intention à partir des mots-clés */
function detectIntent(message) {
  const messageLower = message.toLowerCase();
  for (const [intent, data] of Object.entries(intents)) {
    for (const keyword of data.keywords) {
      if (messageLower.includes(keyword)) {
        return { intent, action: data.action, responseTemplate: data.response };
      }
    }
  }
  return { intent: 'aide', action: 'afficher_aide', responseTemplate: intents.aide.response };
}

/** Récupère ou crée une conversation */
async function getOrCreateConversation(conversationId, userId) {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: parseInt(conversationId) }
    });
    if (existing) return existing;
  }
  return prisma.conversation.create({
    data: {
      utilisateurId: userId,
      type: 'SIMPLE',
      dateDebut: new Date()
    }
  });
}

// ============================================================
// CONTROLLER PRINCIPAL — Envoi d'un message au chatbot
// ============================================================
export const chatbotMessage = async (req, res) => {
  const { message, equipmentId, conversationId } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ reply: '❌ Message vide.', action: 'error' });
  }

  const userId = req.user?.id;
  const userService = req.user?.service || null;

  try {
    // 1. Conversation
    const conversation = await getOrCreateConversation(conversationId, userId);

    // 2. Sauvegarder le message utilisateur
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'USER',
        contenu: message,
        dateEnvoi: new Date()
      }
    });

    // 3. Détecter l'intention
    const { action, responseTemplate } = detectIntent(message);

    // 4. Identifier l'équipement (depuis le message ou depuis equipmentId passé)
    let equipment = null;
    if (equipmentId) {
      equipment = await prisma.equipement.findUnique({ where: { id: parseInt(equipmentId) } });
    }
    if (!equipment) {
      equipment = await extractEquipment(message, userService);
    }

    // 5. Construire la réponse
    let reply = '';
    let actionToTake = action;
    let data = {};

    switch (action) {
      case 'signaler_panne':
        reply = typeof responseTemplate === 'function' ? responseTemplate(equipment) : responseTemplate;
        if (equipment) {
          actionToTake = 'ask_panne_details';
          data = { equipmentId: equipment.id, equipmentNom: equipment.nom };
        }
        break;

      case 'verifier_etat':
        reply = typeof responseTemplate === 'function' ? responseTemplate(equipment) : responseTemplate;
        if (equipment) data = { equipmentId: equipment.id };
        break;

      case 'afficher_guide':
        reply = typeof responseTemplate === 'function' ? responseTemplate(equipment) : responseTemplate;
        if (equipment) data = { equipmentId: equipment.id };
        break;

      case 'urgence':
        reply = typeof responseTemplate === 'function' ? responseTemplate(equipment) : responseTemplate;
        if (equipment) {
          try {
            await prisma.alerte.create({
              data: {
                type: 'PANNE_URGENTE',
                niveau: 'CRITIQUE',
                message: `Urgence signalée via chatbot : ${equipment.nom}`,
                equipementId: equipment.id
              }
            });
          } catch {
            // alerte non bloquante
          }
          actionToTake = 'urgence_created';
          data = { equipmentId: equipment.id };
        }
        break;

      case 'ouvrir_scanner':
        reply = typeof responseTemplate === 'string' ? responseTemplate : responseTemplate();
        actionToTake = 'open_scanner';
        break;

      default:
        reply = typeof responseTemplate === 'string' ? responseTemplate : responseTemplate();
    }

    // 6. Sauvegarder la réponse du bot
    const botMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'BOT',
        contenu: reply,
        typeMessage: actionToTake,
        // donnees stocké en JSON string pour éviter les erreurs Prisma
        donnees: Object.keys(data).length > 0 ? JSON.stringify(data) : null,
        dateEnvoi: new Date()
      }
    });

    return res.json({
      reply,
      action: actionToTake,
      data,
      conversationId: conversation.id,
      messageId: botMessage.id
    });

  } catch (error) {
    console.error('Erreur chatbot:', error);
    return res.status(500).json({
      reply: '❌ Une erreur s\'est produite. Veuillez réessayer ou contacter le service maintenance.',
      action: 'error'
    });
  }
};

// ============================================================
// CONTROLLER — Créer un signalement depuis le chatbot
// ============================================================
export const chatbotCreateSignalement = async (req, res) => {
  const { equipmentId, description, conversationId } = req.body;
  const userId = req.user?.id;

  if (!equipmentId || !description) {
    return res.status(400).json({ success: false, message: '❌ Équipement et description requis.' });
  }

  try {
    const equipId = parseInt(equipmentId);

    // Vérifier que l'équipement existe
    const equipement = await prisma.equipement.findUnique({ where: { id: equipId } });
    if (!equipement) {
      return res.status(404).json({ success: false, message: '❌ Équipement introuvable.' });
    }

    // Créer le signalement
    const signalement = await prisma.signalement.create({
      data: {
        equipementId: equipId,
        signaleParId: userId,
        description,
        priorite: 'MOYENNE'
      },
      include: { equipement: true }
    });

    // Créer l'intervention associée
    const intervention = await prisma.intervention.create({
      data: {
        signalementId: signalement.id,
        equipementId: equipId,
        type: 'CORRECTIF',
        statut: 'EN_ATTENTE',
        diagnostic: description
      }
    });

    // Mettre à jour la conversation si fournie
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { type: 'SIGNALEMENT', equipementId: equipId }
      }).catch(() => {}); // non bloquant
    }

    // Créer une alerte
    await prisma.alerte.create({
      data: {
        type: 'NOUVELLE_PANNE',
        niveau: 'ATTENTION',
        message: `Nouvelle panne signalée via chatbot : ${equipement.nom}`,
        equipementId: equipId,
        interventionId: intervention.id
      }
    }).catch(() => {}); // non bloquant

    return res.json({
      success: true,
      message: `✅ Panne signalée avec succès ! Un technicien va prendre en charge l'intervention sur **${equipement.nom}**.`,
      signalementId: signalement.id,
      interventionId: intervention.id
    });

  } catch (error) {
    console.error('Erreur signalement chatbot:', error);
    return res.status(500).json({
      success: false,
      message: '❌ Erreur lors du signalement. Contactez le service maintenance directement.'
    });
  }
};
