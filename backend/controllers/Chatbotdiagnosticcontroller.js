import prisma from '../config/database.js';

// ============================================================
// BASE DE CONNAISSANCES TECHNIQUE — Arbre de decision
// Pour techniciens biomedicaux uniquement
// ============================================================

const arbeDiagnostic = {
  'pas de mise sous tension': {
    causes: ['Fusible grille', 'Cable d\'alimentation defectueux', 'Bloc d\'alimentation HS'],
    procedures: [
      '1. Verifier le cable secteur et la prise murale',
      '2. Controler et remplacer le fusible',
      '3. Mesurer la tension en sortie du bloc d\'alimentation',
      '4. Remplacer le bloc d\'alimentation si tension absente'
    ],
    pieces: ['Fusible 5A', 'Cable secteur IEC', 'Bloc alimentation'],
    urgence: 'HAUTE'
  },
  'ne demarre pas': {
    causes: ['Batterie dechargee', 'Bloc d\'alimentation defaillant', 'Carte mere HS'],
    procedures: [
      '1. Connecter a l\'alimentation secteur et attendre 30 min',
      '2. Verifier tension batterie (> 11V)',
      '3. Tester avec alimentation externe',
      '4. Diagnostic carte mere si alimentation OK'
    ],
    pieces: ['Batterie Li-ion', 'Chargeur externe'],
    urgence: 'HAUTE'
  },
  'ecran noir': {
    causes: ['Retroeclairage defaillant', 'Connecteur nappe desserre', 'Carte graphique HS'],
    procedures: [
      '1. Verifier la luminosite (reglages)',
      '2. Controler le connecteur de la nappe ecran',
      '3. Tester avec ecran externe si possible',
      '4. Remplacer l\'ecran LCD/TFT'
    ],
    pieces: ['Ecran LCD', 'Nappe LCD', 'Cable video'],
    urgence: 'MOYENNE'
  },
  'image floue': {
    causes: ['Sonde encrassee', 'Mise au point desreglee', 'Capteur degrade'],
    procedures: [
      '1. Nettoyer la sonde avec solution appropriee',
      '2. Reinitialiser les parametres d\'image',
      '3. Recalibrer la mise au point automatique',
      '4. Remplacer la sonde si persistant'
    ],
    pieces: ['Sonde echographique', 'Kit nettoyage sonde'],
    urgence: 'MOYENNE'
  },
  'alarme pression': {
    causes: ['Circuit pneumatique obstrué', 'Capteur de pression defaillant', 'Fuite dans le circuit'],
    procedures: [
      '1. Verifier l\'absence d\'obstruction sur les voies',
      '2. Controler les connexions des tubulures',
      '3. Tester le capteur de pression (valeurs de reference)',
      '4. Remplacer le capteur si hors tolerance (±2%)'
    ],
    pieces: ['Capteur pression', 'Tubulure patient', 'Joint silicone'],
    urgence: 'CRITIQUE'
  },
  'alarme': {
    causes: ['Parametre hors limite', 'Capteur deconnecte', 'Defaut electronique'],
    procedures: [
      '1. Identifier le code d\'alarme affiche',
      '2. Consulter le manuel technique section alarmes',
      '3. Verifier les connexions des capteurs',
      '4. Reinitialiser l\'appareil et observer'
    ],
    pieces: [],
    urgence: 'HAUTE'
  },
  'sato2 inexacte': {
    causes: ['Sonde SpO2 encrassee', 'Mouvement patient', 'Vasoconstriction', 'Capteur defaillant'],
    procedures: [
      '1. Nettoyer la sonde avec alcool isopropylique',
      '2. Repositionner sur un autre doigt',
      '3. Verifier la perfusion peripherique du patient',
      '4. Calibrer avec oximetre de reference',
      '5. Remplacer la sonde SpO2 si derive > 3%'
    ],
    pieces: ['Sonde SpO2 adulte', 'Sonde SpO2 pediatrique'],
    urgence: 'HAUTE'
  },
  'spo2': {
    causes: ['Sonde SpO2 encrassee', 'Mouvement patient', 'Capteur defaillant'],
    procedures: [
      '1. Nettoyer la sonde',
      '2. Repositionner sur un autre doigt',
      '3. Calibrer avec oximetre de reference',
      '4. Remplacer si derive persistante'
    ],
    pieces: ['Sonde SpO2'],
    urgence: 'HAUTE'
  },
  'mesure inexacte': {
    causes: ['Derive du capteur', 'Calibration perimee', 'Interference electromagnetique'],
    procedures: [
      '1. Verifier la date de derniere calibration',
      '2. Effectuer une calibration avec etalon certifie',
      '3. Eloigner des sources d\'interference (GSM, radio)',
      '4. Remplacer le capteur si derive persistante'
    ],
    pieces: ['Kit calibration', 'Capteur de remplacement'],
    urgence: 'HAUTE'
  },
  'bruit anormal': {
    causes: ['Roulement use', 'Corps etranger', 'Fixation desserree', 'Ventilateur defaillant'],
    procedures: [
      '1. Localiser la source du bruit (stethoscope technique)',
      '2. Verifier toutes les fixations et vis',
      '3. Inspecter les ventilateurs (poussiere, usure)',
      '4. Lubrifier ou remplacer le roulement defaillant'
    ],
    pieces: ['Roulement', 'Ventilateur', 'Lubrifiant technique'],
    urgence: 'MOYENNE'
  },
  'fuite': {
    causes: ['Joint use', 'Raccord desserre', 'Tubulure percee'],
    procedures: [
      '1. Identifier precisement la zone de fuite',
      '2. Serrer les raccords (couple de serrage fabricant)',
      '3. Remplacer le joint ou la tubulure concernée',
      '4. Test d\'etancheite a 1.5x la pression nominale'
    ],
    pieces: ['Joint torique', 'Tubulure', 'Raccord'],
    urgence: 'CRITIQUE'
  },
  'pas de connexion': {
    causes: ['Cable reseau defectueux', 'Configuration IP incorrecte', 'Switch/Hub HS'],
    procedures: [
      '1. Verifier le cable RJ45 et le voyant de connexion',
      '2. Controler l\'adresse IP et le masque reseau',
      '3. Tester avec un autre port du switch',
      '4. Redemarrer l\'interface reseau'
    ],
    pieces: ['Cable RJ45', 'Module reseau'],
    urgence: 'BASSE'
  },
  'panne': {
    causes: ['Cause a determiner apres inspection'],
    procedures: [
      '1. Effectuer un diagnostic visuel complet',
      '2. Consulter l\'historique de maintenance',
      '3. Identifier les codes d\'erreur affiches',
      '4. Contacter le fabricant si necessaire'
    ],
    pieces: [],
    urgence: 'MOYENNE'
  }
};

function findDiagnostic(message) {
  const msg = message.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [symptome, data] of Object.entries(arbeDiagnostic)) {
    const mots = symptome.split(' ');
    const score = mots.filter(m => msg.includes(m)).length / mots.length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { symptome, ...data };
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}

async function findEquipement(message) {
  try {
    const equipements = await prisma.equipement.findMany({
      select: {
        id: true, nom: true, marque: true, modele: true,
        statut: true, codeInventaire: true, service: true,
        updatedAt: true, manuelTechnique: true
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

async function findPieceEnStock(keywords) {
  if (!keywords || keywords.length === 0) return null;
  try {
    for (const kw of keywords) {
      const piece = await prisma.piece.findFirst({
        where: {
          OR: [
            { designation: { contains: kw, mode: 'insensitive' } },
            { code: { contains: kw, mode: 'insensitive' } }
          ],
          quantiteStock: { gt: 0 }
        },
        select: { id: true, code: true, designation: true, quantiteStock: true, emplacement: true }
      });
      if (piece) return piece;
    }
    return null;
  } catch { return null; }
}

async function getOrCreateConversation(conversationId, userId, equipementId = null) {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: parseInt(conversationId) }
    });
    if (existing) return existing;
  }
  return prisma.conversation.create({
    data: {
      utilisateurId: userId,
      type: 'DIAGNOSTIC',
      equipementId: equipementId || null,
      dateDebut: new Date()
    }
  });
}

export const chatbotDiagnostic = async (req, res) => {
  const { message, equipmentId, conversationId } = req.body;
  const userId = req.user?.id;

  if (!message?.trim()) {
    return res.status(400).json({ reply: 'Message vide.', action: 'error' });
  }

  try {
    let equipement = null;
    if (equipmentId) {
      equipement = await prisma.equipement.findUnique({
        where: { id: parseInt(equipmentId) }
      });
    }
    if (!equipement) {
      equipement = await findEquipement(message);
    }

    const conversation = await getOrCreateConversation(
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

    const diag = findDiagnostic(message);
    let reply = '';
    let action = 'info';
    let data = {};

    if (!equipement && !diag) {
      reply = 'Assistant Diagnostic Technique\n\n' +
        'Je peux vous aider a diagnostiquer une panne.\n\n' +
        'Decrivez le probleme ou scannez le QR code de l\'equipement.\n\n' +
        'Symptomes reconnus :\n' +
        '- Pas de mise sous tension\n- Ecran noir\n- Alarme pression\n' +
        '- SpO2 inexacte\n- Bruit anormal\n- Image floue\n- Fuite';
      action = 'aide';

    } else if (equipement && !diag) {
      const statutTexte = equipement.statut === 'FONCTIONNEL' ? 'FONCTIONNEL' : 'EN PANNE';
      reply = `Equipement : ${equipement.nom} (${equipement.marque} - ${equipement.service})\n\n` +
        `Statut actuel : ${statutTexte}\n` +
        `Derniere mise a jour : ${new Date(equipement.updatedAt).toLocaleDateString('fr-FR')}\n\n` +
        `Quel symptome observez-vous sur cet equipement ?`;
      action = 'ask_symptom';
      data = { equipmentId: equipement.id };

    } else if (diag) {
      const piece = await findPieceEnStock(diag.pieces);

      let piecesTexte = '';
      if (piece) {
        piecesTexte = `Piece disponible en stock : ${piece.designation} (${piece.quantiteStock} unites - ${piece.emplacement || 'Stock general'})`;
      } else if (diag.pieces.length > 0) {
        piecesTexte = `Pieces possiblement necessaires :\n${diag.pieces.map(p => `- ${p}`).join('\n')}\n(Verifier le stock)`;
      }

      reply = `Diagnostic : ${diag.symptome.toUpperCase()}\n\n` +
        (equipement ? `Equipement : ${equipement.nom}\n\n` : '') +
        `Causes probables :\n${diag.causes.map(c => `- ${c}`).join('\n')}\n\n` +
        `Procedure d'intervention :\n${diag.procedures.join('\n')}\n\n` +
        piecesTexte;

      action = 'show_diagnostic';
      data = {
        equipmentId: equipement?.id || null,
        urgence: diag.urgence,
        pieceSuggestion: piece?.code || diag.pieces[0] || null,
        pieceId: piece?.id || null
      };

      if (equipement && (diag.urgence === 'CRITIQUE' || diag.urgence === 'HAUTE')) {
        await prisma.equipement.update({
          where: { id: equipement.id },
          data: { statut: 'EN_PANNE', dateDernierePanne: new Date() }
        }).catch(() => {});
      }
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
    console.error('chatbotDiagnostic error:', error);
    return res.status(500).json({
      reply: 'Erreur serveur. Reessayez ou contactez l\'administrateur.',
      action: 'error'
    });
  }
};

export const chatbotCreerIntervention = async (req, res) => {
  const { equipmentId, diagnostic, pieceSuggestion, pieceId, conversationId } = req.body;
  const technicienId = req.user?.id;

  if (!equipmentId) {
    return res.status(400).json({ success: false, message: 'Equipement requis.' });
  }

  try {
    const equipId = parseInt(equipmentId);

    const equipement = await prisma.equipement.findUnique({ where: { id: equipId } });
    if (!equipement) {
      return res.status(404).json({ success: false, message: 'Equipement introuvable.' });
    }

    const intervention = await prisma.intervention.create({
      data: {
        equipementId: equipId,
        technicienId,
        type: 'CORRECTIF',
        statut: 'EN_COURS',
        diagnostic: diagnostic || 'Diagnostic via chatbot',
        dateDebut: new Date()
      }
    });

    await prisma.alerte.create({
      data: {
        type: 'INTERVENTION_CREEE',
        niveau: 'INFO',
        message: `Intervention creee via chatbot diagnostic : ${equipement.nom}`,
        equipementId: equipId,
        interventionId: intervention.id
      }
    }).catch(() => {});

    if (conversationId) {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { type: 'INTERVENTION', equipementId: equipId }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Intervention ${intervention.id} creee sur ${equipement.nom}.`,
      interventionId: intervention.id
    });

  } catch (error) {
    console.error('chatbotCreerIntervention error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la creation de l\'intervention.'
    });
  }
};
