import prisma from '../config/database.js';

// Base de connaissances simple du chatbot
const intents = {
  // Signalement de panne
  panne: {
    keywords: ['panne', 'cassé', 'ne fonctionne', 'marche pas', 'hs', 'hors service', 'problème', 'dysfonctionnement'],
    action: 'signaler_panne',
    response: (equipment) => `⚠️ Je vais vous aider à signaler une panne sur ${equipment?.nom || 'cet équipément'}. Pouvez-vous décrire le problème plus précisément ?\n\n📝 Exemples:\n- L'écran reste noir\n- Il y a une alarme\n- La mesure est inexacte`
  },
  // État d'un équipement
  etat: {
    keywords: ['état', 'statut', 'disponible', 'fonctionne', 'fonctionnel', 'en panne', 'est-ce que'],
    action: 'verifier_etat',
    response: (equipment) => equipment ? `🔍 **${equipment.nom}**\n📊 Statut: ${equipment.statut === 'FONCTIONNEL' ? '✅ FONCTIONNEL' : '❌ EN PANNE'}\n📍 Service: ${equipment.service}\n📅 Dernière maintenance: ${equipment.updatedAt ? new Date(equipment.updatedAt).toLocaleDateString() : 'Non effectuée'}` : "Quel équipement souhaitez-vous vérifier ?"
  },
  // Guide d'utilisation
  guide: {
    keywords: ['comment utiliser', 'guide', 'manuel', 'utilisation', 'mode d\'emploi', 'notice'],
    action: 'afficher_guide',
    response: (equipment) => equipment ? `📖 **Guide d'utilisation - ${equipment.nom}**\n\n🔗 [Télécharger le manuel](${equipment.manuelUrl || '/documents/manuel-generique.pdf'})\n\n❓ Questions fréquentes:\n• Vérifiez que l'appareil est branché\n• Redémarrez l'équipement\n• Contactez le technicien si le problème persiste` : "Pour quel équipement souhaitez-vous un guide ?"
  },
  // Scanner QR
  scanner: {
    keywords: ['scanner', 'qr code', 'flash', 'code barre', 'scan'],
    action: 'ouvrir_scanner',
    response: "📱 Activez la caméra pour scanner le QR code sur l'équipement.\n\n📷 Positionnez le code dans le cadre."
  },
  // Aide
  aide: {
    keywords: ['aide', 'help', 'bonjour', 'salut', 'que faire', 'comment ça marche', 'assistance'],
    action: 'afficher_aide',
    response: "👋 **Assistant Maintenance**\n\nVoici ce que je peux faire pour vous :\n\n• **Signaler une panne** : \"le respirateur est en panne\"\n• **Vérifier l'état** : \"état de l'échographe\"\n• **Demander un guide** : \"comment utiliser le moniteur\"\n• **Scanner un QR code** : \"scanner\"\n\n💡 *Décrivez simplement votre besoin, je vous guide !*"
  },
  // Urgence
  urgence: {
    keywords: ['urgence', 'critique', 'grave', 'immédiat', 'vital', 'alerte'],
    action: 'urgence',
    response: (equipment) => `🚨 **URGENCE SIGNALÉE** 🚨\n\n${equipment?.nom ? `Équipement: ${equipment.nom}\n` : ''}Un technicien va être alerté immédiatement.\n\n⏱️ Intervention prioritaire engagée.\n\nMerci de patienter.`
  }
};

// Extraire un équipement du message
async function extractEquipment(message, userService) {
  // Chercher par nom dans la base
  const allEquipments = await prisma.equipement.findMany({
    where: { service: userService || undefined },
    select: { id: true, nom: true, statut: true, codeInventaire: true, service: true }
  });
  
  const messageLower = message.toLowerCase();
  
  // Chercher une correspondance
  let found = null;
  for (const eq of allEquipments) {
    const nomLower = eq.nom.toLowerCase();
    if (messageLower.includes(nomLower) || 
        messageLower.includes(eq.codeInventaire?.toLowerCase()) ||
        nomLower.split(' ').some(word => messageLower.includes(word) && word.length > 3)) {
      found = eq;
      break;
    }
  }
  
  return found;
}

// Déterminer l'intention du message
function detectIntent(message) {
  const messageLower = message.toLowerCase();
  
  for (const [intent, data] of Object.entries(intents)) {
    for (const keyword of data.keywords) {
      if (messageLower.includes(keyword)) {
        return { intent, action: data.action, responseTemplate: data.response };
      }
    }
  }
  
  // Par défaut: aide
  return { intent: 'aide', action: 'afficher_aide', responseTemplate: intents.aide.response };
}

// Envoyer un message au chatbot
export const chatbotMessage = async (req, res) => {
  const { message, equipmentId, conversationId } = req.body;
  const userId = req.user.id;
  const userService = req.user.service;

  try {
    // Récupérer ou créer la conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: parseInt(conversationId) },
        include: { messages: true }
      });
    }
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          utilisateurId: userId,
          type: 'SIMPLE',
          dateDebut: new Date(),
        }
      });
    }

    // Sauvegarder le message utilisateur
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'USER',
        contenu: message,
        dateEnvoi: new Date(),
      }
    });

    // Détecter l'intention
    const { intent, action, responseTemplate } = detectIntent(message);
    
    // Extraire l'équipement si pertinent
    const equipment = await extractEquipment(message, userService);
    
    let reply = '';
    let actionToTake = action;
    let data = {};

    // Générer la réponse selon l'action
    switch (action) {
      case 'signaler_panne':
        if (equipment) {
          reply = responseTemplate(equipment);
          actionToTake = 'ask_panne_details';
          data = { equipmentId: equipment.id };
        } else {
          reply = "Quel équipement est en panne ? Veuillez préciser le nom (ex: respirateur, échographe, moniteur...).";
        }
        break;
        
      case 'verifier_etat':
        if (equipment) {
          reply = responseTemplate(equipment);
        } else {
          reply = "Quel équipement souhaitez-vous vérifier ?";
        }
        break;
        
      case 'afficher_guide':
        if (equipment) {
          reply = responseTemplate(equipment);
        } else {
          reply = "Pour quel équipement souhaitez-vous un guide ?";
        }
        break;
        
      case 'urgence':
        reply = responseTemplate(equipment);
        if (equipment) {
          // Créer une alerte urgente
          await prisma.alerte.create({
            data: {
              type: 'PANNE_URGENTE',
              niveau: 'CRITIQUE',
              message: `Urgence signalée via chatbot: ${equipment.nom}`,
              equipementId: equipment.id,
            }
          });
          actionToTake = 'urgence_created';
          data = { equipmentId: equipment.id };
        }
        break;
        
      case 'ouvrir_scanner':
        reply = responseTemplate;
        actionToTake = 'open_scanner';
        break;
        
      default:
        reply = responseTemplate;
    }

    // Sauvegarder la réponse du bot
    const botMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'BOT',
        contenu: reply,
        typeMessage: actionToTake,
        donnees: data,
        dateEnvoi: new Date(),
      }
    });

    res.json({
      reply,
      action: actionToTake,
      data,
      conversationId: conversation.id,
      messageId: botMessage.id
    });
    
  } catch (error) {
    console.error('Erreur chatbot:', error);
    res.status(500).json({ 
      reply: "❌ Désolé, une erreur s'est produite. Veuillez réessayer ou contacter le technicien directement.",
      action: 'error'
    });
  }
};

// Créer un signalement depuis le chatbot
export const chatbotCreateSignalement = async (req, res) => {
  const { equipmentId, description, conversationId } = req.body;
  const userId = req.user.id;

  try {
    // Créer le signalement
    const signalement = await prisma.signalement.create({
      data: {
        equipementId: parseInt(equipmentId),
        signaleParId: userId,
        description: description,
        priorite: 'MOYENNE',
      },
      include: {
        equipement: true,
      }
    });

    // Créer l'intervention associée
    const intervention = await prisma.intervention.create({
      data: {
        signalementId: signalement.id,
        equipementId: signalement.equipementId,
        type: 'CORRECTIF',
        statut: 'EN_ATTENTE',
        diagnostic: description,
      }
    });

    // Mettre à jour la conversation
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { 
          type: 'SIGNALEMENT',
          equipementId: signalement.equipementId,
        }
      });
    }

    // Créer une alerte
    await prisma.alerte.create({
      data: {
        type: 'PANNE_URGENTE',
        niveau: 'ATTENTION',
        message: `Nouvelle panne signalée: ${signalement.equipement.nom}`,
        equipementId: signalement.equipementId,
        interventionId: intervention.id,
      }
    });

    res.json({
      success: true,
      message: `✅ Panne signalée avec succès ! Un technicien va prendre en charge l'intervention sur ${signalement.equipement.nom}.`,
      signalementId: signalement.id,
      interventionId: intervention.id
    });
    
  } catch (error) {
    console.error('Erreur création signalement chatbot:', error);
    res.status(500).json({ 
      success: false,
      message: "❌ Erreur lors du signalement. Veuillez contacter le service maintenance directement."
    });
  }
};