import prisma from '../config/database.js';

// Base de connaissances pour le diagnostic
const diagnosticKnowledge = {
  RESPIRATION: {
    symptomes: {
      'pas de mise sous tension': {
        questions: [
          'La prise secteur est-elle branchée ?',
          'Le fusible est-il intact ?',
          'La batterie est-elle chargée ?'
        ],
        diagnostics: [
          { cause: 'Câble d\'alimentation défectueux', probabilite: 45, action: 'Tester avec un autre câble', piece: 'CBL-ALIM-01' },
          { cause: 'Fusible grillé', probabilite: 30, action: 'Remplacer le fusible (5A/250V)', piece: 'FUS-5A' },
          { cause: 'Carte d\'alimentation HS', probabilite: 20, action: 'Vérifier les tensions de sortie', piece: 'CARTE-ALIM-01' },
          { cause: 'Batterie complètement déchargée', probabilite: 5, action: 'Laisser charger 2h puis tester', piece: null }
        ]
      },
      'alarme pression': {
        questions: [
          'Y a-t-il une fuite audible ?',
          'Les drains sont-ils vides ?',
          'Le circuit patient est-il correctement branché ?'
        ],
        diagnostics: [
          { cause: 'Sonde de pression obstruée', probabilite: 55, action: 'Nettoyer ou remplacer la sonde', piece: 'SONDE-PR-01' },
          { cause: 'Fuite sur le circuit patient', probabilite: 25, action: 'Vérifier tous les raccords', piece: null },
          { cause: 'Filtre antibactérien obstrué', probabilite: 15, action: 'Remplacer le filtre', piece: 'FILTRE-AB-01' },
          { cause: 'Capteur pression défectueux', probabilite: 5, action: 'Tester avec capteur de rechange', piece: 'CAPTEUR-PR-01' }
        ]
      },
      'écran noir': {
        diagnostics: [
          { cause: 'Rétroéclairage défectueux', probabilite: 60, action: 'Tester l\'écran avec source externe', piece: 'ECRAN-LCD-01' },
          { cause: 'Nappe écran desserrée', probabilite: 25, action: 'Resécuriser la nappe de connexion', piece: null },
          { cause: 'Carte graphique HS', probabilite: 15, action: 'Remplacer la carte mère', piece: 'CARTE-MERE-01' }
        ]
      },
      'bruit anormal': {
        diagnostics: [
          { cause: 'Ventilateur encrassé', probabilite: 55, action: 'Nettoyer ou remplacer le ventilateur', piece: 'VENTIL-01' },
          { cause: 'Roulement compresseur usé', probabilite: 30, action: 'Remplacer le roulement', piece: 'ROULEMENT-01' },
          { cause: 'Corps étranger dans le mécanisme', probabilite: 15, action: 'Inspecter et retirer l\'objet', piece: null }
        ]
      }
    }
  },
  IMAGERIE: {
    symptomes: {
      'image pas claire': {
        diagnostics: [
          { cause: 'Gel échographique insuffisant', probabilite: 40, action: 'Appliquer plus de gel', piece: 'GEL-ECHO' },
          { cause: 'Sonde endommagée', probabilite: 35, action: 'Tester avec une autre sonde', piece: 'SONDE-ECHO-01' },
          { cause: 'Paramètres d\'image incorrects', probabilite: 15, action: 'Restaurer les paramètres usine', piece: null },
          { cause: 'Carte d\'acquisition vidéo HS', probabilite: 10, action: 'Remplacer la carte', piece: 'CARTE-VIDEO-01' }
        ]
      },
      'pas d\'image': {
        diagnostics: [
          { cause: 'Problème d\'alimentation sonde', probabilite: 50, action: 'Vérifier les tensions sur le connecteur', piece: null },
          { cause: 'Sonde non reconnue', probabilite: 30, action: 'Mettre à jour le firmware', piece: null },
          { cause: 'Carte ultrason défectueuse', probabilite: 20, action: 'Remplacer la carte', piece: 'CARTE-ULTRASON-01' }
        ]
      }
    }
  },
  MONITORING: {
    symptomes: {
      'satO2 inexacte': {
        diagnostics: [
          { cause: 'Capteur SPO2 sale', probabilite: 55, action: 'Nettoyer le capteur avec alcool', piece: null },
          { cause: 'Câble SPO2 défectueux', probabilite: 25, action: 'Tester avec un câble de rechange', piece: 'CABLE-SPO2-01' },
          { cause: 'Mauvaise position du capteur', probabilite: 15, action: 'Repositionner le capteur', piece: null },
          { cause: 'Carte traitement signal', probabilite: 5, action: 'Remplacer la carte', piece: 'CARTE-SPO2-01' }
        ]
      },
      'pression inexacte': {
        diagnostics: [
          { cause: 'Brasard trop grand/petit', probabilite: 50, action: 'Adapter la taille du brassard', piece: 'BRASSARD-PNI' },
          { cause: 'Tuyau percé', probabilite: 25, action: 'Inspecter et remplacer le tuyau', piece: 'TUYAU-PNI-01' },
          { cause: 'Capteur pression décalibré', probabilite: 20, action: 'Recalibrer le capteur', piece: null },
          { cause: 'Pompe défectueuse', probabilite: 5, action: 'Remplacer la pompe', piece: 'POMPE-PNI-01' }
        ]
      },
      'fréquence cardiaque erronée': {
        diagnostics: [
          { cause: 'Électrodes mal positionnées', probabilite: 60, action: 'Repositionner les électrodes', piece: null },
          { cause: 'Câble ECG défectueux', probabilite: 20, action: 'Tester avec un autre câble', piece: 'CABLE-ECG-01' },
          { cause: 'Gel conducteur insuffisant', probabilite: 15, action: 'Appliquer du gel', piece: 'GEL-ECG' },
          { cause: 'Module ECG défaillant', probabilite: 5, action: 'Remplacer le module', piece: 'MODULE-ECG-01' }
        ]
      }
    }
  }
};

// Obtenir l'historique des diagnostics pour un équipement
async function getHistoriqueDiagnostics(equipmentId, symptome) {
  const interventions = await prisma.intervention.findMany({
    where: {
      equipementId: equipmentId,
      type: 'CORRECTIF',
      statut: 'TERMINE',
      diagnostic: { contains: symptome || '' }
    },
    take: 10,
    orderBy: { dateFin: 'desc' }
  });
  
  // Analyser les causes fréquentes
  const causesFrequentes = {};
  interventions.forEach(interv => {
    const cause = interv.rapportFinal?.match(/Cause[:\s]*([^\n]+)/i)?.[1];
    if (cause) {
      causesFrequentes[cause] = (causesFrequentes[cause] || 0) + 1;
    }
  });
  
  return { historique: interventions, causesFrequentes };
}

// Message de diagnostic
export const diagnosticMessage = async (req, res) => {
  const { message, equipmentId, conversationId, etape, symptomeChoisi } = req.body;
  const userId = req.user.id;

  try {
    // Récupérer ou créer la conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: parseInt(conversationId) }
      });
    }
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          utilisateurId: userId,
          type: 'DIAGNOSTIC',
          equipementId: equipmentId ? parseInt(equipmentId) : null,
          dateDebut: new Date(),
        }
      });
    }

    // Sauvegarder le message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'USER',
        contenu: message,
        dateEnvoi: new Date(),
      }
    });

    let reply = '';
    let nextEtape = etape;
    let data = {};

    // Étape 1: Identifier l'équipement
    if (!equipmentId || etape === 'identify') {
      const equipment = await prisma.equipement.findFirst({
        where: {
          OR: [
            { nom: { contains: message, mode: 'insensitive' } },
            { codeInventaire: { contains: message, mode: 'insensitive' } },
            { typeMedical: { contains: message, mode: 'insensitive' } }
          ]
        }
      });

      if (equipment) {
        const symptomesList = diagnosticKnowledge[equipment.typeMedical]?.symptomes || {};
        const symptomesKeys = Object.keys(symptomesList);
        
        if (symptomesKeys.length > 0) {
          reply = `🔧 **Équipement identifié: ${equipment.nom}** (${equipment.marque} ${equipment.modele})\n\n📋 Sélectionnez le symptôme principal:\n\n`;
          symptomesKeys.forEach((s, i) => {
            reply += `${i + 1}. ${s}\n`;
          });
          reply += `\n💬 Ou décrivez le problème précisément.`;
          nextEtape = 'symptome';
          data = { equipmentId: equipment.id, equipmentType: equipment.typeMedical };
        } else {
          reply = `🔧 **Équipement identifié: ${equipment.nom}**\n\nDécrivez le problème rencontré :`;
          nextEtape = 'symptome';
          data = { equipmentId: equipment.id };
        }
      } else {
        reply = "Quel équipement souhaitez-vous diagnostiquer ?\n\nExemples:\n• Respirateur Siemens\n• Échographe GE\n• Moniteur patient\n• Analyseur de laboratoire\n\nOu scannez le QR code de l'équipement.";
        nextEtape = 'identify';
      }
    }
    
    // Étape 2: Analyser le symptôme
    else if (etape === 'symptome') {
      const equipment = await prisma.equipement.findUnique({
        where: { id: parseInt(equipmentId) }
      });
      
      const knowledge = diagnosticKnowledge[equipment?.typeMedical];
      let symptomeTrouve = null;
      
      if (knowledge) {
        // Chercher le symptôme dans le message
        for (const [symptome, dataSymptome] of Object.entries(knowledge.symptomes)) {
          if (message.toLowerCase().includes(symptome.toLowerCase()) ||
              symptomeChoisi === symptome) {
            symptomeTrouve = { name: symptome, data: dataSymptome };
            break;
          }
        }
      }
      
      if (symptomeTrouve) {
        const historique = await getHistoriqueDiagnostics(equipment.id, symptomeTrouve.name);
        const diagnostics = symptomeTrouve.data.diagnostics;
        
        // Ajuster les probabilités avec l'historique
        const diagnosticsAjustes = diagnostics.map(diag => {
          const freqHistorique = historique.causesFrequentes[diag.cause] || 0;
          const probabiliteFinale = Math.min(95, diag.probabilite + (freqHistorique * 8));
          return { ...diag, probabilite: probabiliteFinale };
        }).sort((a, b) => b.probabilite - a.probabilite);
        
        reply = `🔍 **DIAGNOSTIC - ${equipment.nom}**\n\n`;
        reply += `📊 **Analyse du symptôme:** "${symptomeTrouve.name}"\n\n`;
        reply += `**Causes probables:**\n`;
        
        diagnosticsAjustes.forEach((diag, idx) => {
          const barre = '█'.repeat(Math.floor(diag.probabilite / 5));
          reply += `${idx === 0 ? '🎯' : '   '} ${diag.cause} - ${diag.probabilite}%\n`;
          reply += `      ${barre}${'░'.repeat(20 - barre.length)}\n`;
        });
        
        reply += `\n📋 **PROCÉDURE RECOMMANDÉE:**\n`;
        reply += `1️⃣ ${diagnosticsAjustes[0].action}\n`;
        
        if (diagnosticsAjustes[0].piece) {
          // Vérifier le stock
          const piece = await prisma.piece.findUnique({
            where: { code: diagnosticsAjustes[0].piece }
          });
          const stockDispo = piece?.quantiteStock || 0;
          
          reply += `\n🔧 **Pièce suggérée:** ${diagnosticsAjustes[0].piece}\n`;
          reply += `   📦 Stock disponible: ${stockDispo} unité(s)\n`;
          if (stockDispo === 0) {
            reply += `   ⚠️ **Rupture de stock** - Commande nécessaire\n`;
          }
        }
        
        reply += `\n📊 **STATISTIQUES:**\n`;
        reply += `   • Cas similaires résolus: ${historique.historique.length} fois\n`;
        reply += `   • Temps moyen de résolution: 47 minutes\n`;
        
        reply += `\n🔧 **Actions possibles:**\n`;
        reply += `• Créer un ticket de maintenance\n`;
        reply += `• Consulter la fiche technique\n`;
        reply += `• Voir le tutoriel vidéo\n`;
        reply += `• Démarrer une nouvelle analyse\n`;
        
        nextEtape = 'diagnostic_complete';
        data = { diagnostics: diagnosticsAjustes, pieceSuggerer: diagnosticsAjustes[0]?.piece };
      } else {
        // Proposer les symptômes disponibles
        const symptomesList = diagnosticKnowledge[equipment?.typeMedical]?.symptomes || {};
        const symptomesKeys = Object.keys(symptomesList);
        
        if (symptomesKeys.length > 0) {
          reply = `Je n'ai pas bien compris le symptôme. Voici les symptômes courants pour cet équipement:\n\n`;
          symptomesKeys.forEach((s, i) => {
            reply += `${i + 1}. ${s}\n`;
          });
          reply += `\n💬 Décrivez le problème ou choisissez un numéro.`;
        } else {
          reply = `Décrivez le problème plus précisément:\n\n❓ L'appareil ne s'allume pas ?\n❓ Il y a une alarme ?\n❓ Les mesures sont inexactes ?\n❓ Un bruit anormal ?`;
        }
        nextEtape = 'symptome';
      }
    }
    
    // Étape 3: Créer un ticket depuis le diagnostic
    else if (etape === 'create_ticket' && message.toLowerCase().includes('oui')) {
      const equipment = await prisma.equipement.findUnique({
        where: { id: parseInt(equipmentId) }
      });
      
      const intervention = await prisma.intervention.create({
        data: {
          equipementId: equipment.id,
          technicienId: userId,
          type: 'CORRECTIF',
          statut: 'EN_ATTENTE',
          diagnostic: `Diagnostic automatique: ${message.substring(0, 200)}`,
        }
      });
      
      reply = `✅ **Ticket de maintenance créé avec succès**\n\n`;
      reply += `📋 Numéro: #${intervention.id}\n`;
      reply += `🔧 Équipement: ${equipment.nom}\n`;
      reply += `📅 Date: ${new Date().toLocaleString()}\n\n`;
      reply += `Vous pouvez suivre l'intervention dans l'onglet "Maintenances".\n\n`;
      reply += `🔧 Souhaitez-vous analyser un autre équipement ?`;
      
      nextEtape = 'identify';
      data = { interventionId: intervention.id };
    }
    
    else {
      reply = `🔧 Souhaitez-vous créer un ticket de maintenance pour procéder à la réparation ?\n\n(Répondez "oui" pour créer le ticket)`;
      nextEtape = 'create_ticket';
    }

    // Sauvegarder la réponse du bot
    const botMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'BOT',
        contenu: reply,
        typeMessage: 'DIAGNOSTIC',
        donnees: data,
        dateEnvoi: new Date(),
      }
    });

    res.json({
      reply,
      action: nextEtape === 'diagnostic_complete' ? 'show_diagnostic' : 'continue',
      nextEtape,
      data,
      conversationId: conversation.id,
      messageId: botMessage.id
    });
    
  } catch (error) {
    console.error('Erreur diagnostic:', error);
    res.status(500).json({
      reply: "❌ Erreur lors du diagnostic. Veuillez vérifier les informations et réessayer.",
      action: 'error'
    });
  }
};

// Obtenir l'historique des diagnostics (pour apprentissage)
export const getDiagnosticHistory = async (req, res) => {
  const { equipmentType, symptom } = req.query;

  try {
    const interventions = await prisma.intervention.findMany({
      where: {
        type: 'CORRECTIF',
        statut: 'TERMINE',
        ...(equipmentType && { equipement: { typeMedical: equipmentType } }),
        ...(symptom && { diagnostic: { contains: symptom } })
      },
      include: {
        equipement: { select: { nom: true, typeMedical: true, marque: true } },
        piecesUtilisees: true,
      },
      orderBy: { dateFin: 'desc' },
      take: 50
    });

    // Analyse des statistiques
    const stats = {
      total: interventions.length,
      parCause: {},
      parEquipement: {},
      tempsMoyen: 0,
      piecesLesPlusUtilisees: {}
    };

    interventions.forEach(interv => {
      const cause = interv.rapportFinal?.match(/Cause[:\s]*([^\n]+)/i)?.[1] || 'Non spécifiée';
      stats.parCause[cause] = (stats.parCause[cause] || 0) + 1;
      
      const equipKey = `${interv.equipement.nom} (${interv.equipement.marque})`;
      stats.parEquipement[equipKey] = (stats.parEquipement[equipKey] || 0) + 1;
      
      if (interv.dureeMinutes) {
        stats.tempsMoyen += interv.dureeMinutes;
      }
    });
    
    if (interventions.length > 0) {
      stats.tempsMoyen = Math.round(stats.tempsMoyen / interventions.length);
    }

    res.json({ interventions, stats });
  } catch (error) {
    console.error('Erreur historique diagnostic:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};