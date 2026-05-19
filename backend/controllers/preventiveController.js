import prisma from '../config/database.js';

// Liste des maintenances préventives
export const getPreventives = async (req, res) => {
  const { statut, equipementId, type } = req.query;

  try {
    const filters = {};
    if (statut && statut !== '') filters.statut = statut;
    if (type && type !== '') filters.type = type;
    if (equipementId) filters.equipementId = parseInt(equipementId);

    const preventives = await prisma.maintenancePreventive.findMany({
      where: filters,
      include: {
        equipement: { select: { id: true, nom: true, codeInventaire: true, service: true, statut: true } },
        responsable: { select: { id: true, nom: true } }
      },
      orderBy: { prochaineRealisation: 'asc' }
    });

    res.json(preventives);
  } catch (error) {
    console.error('Erreur get preventives:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Détail d'une préventive
export const getPreventiveById = async (req, res) => {
  const { id } = req.params;

  try {
    const preventive = await prisma.maintenancePreventive.findUnique({
      where: { id: parseInt(id) },
      include: {
        equipement: true,
        responsable: true
      }
    });

    if (!preventive) {
      return res.status(404).json({ message: 'Maintenance préventive non trouvée' });
    }

    res.json(preventive);
  } catch (error) {
    console.error('Erreur get preventive:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Ajouter une maintenance préventive
export const addPreventive = async (req, res) => {
  const { equipementId, type, periodicite, prochaineRealisation, checklist, instructions, responsableId } = req.body;

  try {
    const preventive = await prisma.maintenancePreventive.create({
      data: {
        equipementId: parseInt(equipementId),
        type: type || 'MENSUELLE',
        periodicite: parseInt(periodicite) || 30,
        prochaineRealisation: new Date(prochaineRealisation),
        checklist: checklist ? JSON.stringify(checklist) : null,
        instructions: instructions || null,
        responsableId: responsableId ? parseInt(responsableId) : null,
        statut: 'PREVU'
      },
      include: { equipement: true }
    });

    res.status(201).json({ message: 'Maintenance préventive planifiée', preventive });
  } catch (error) {
    console.error('Erreur add preventive:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout' });
  }
};

// Mettre à jour une préventive
export const updatePreventive = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const preventive = await prisma.maintenancePreventive.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ message: 'Maintenance préventive mise à jour', preventive });
  } catch (error) {
    console.error('Erreur update preventive:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer une préventive
export const deletePreventive = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.maintenancePreventive.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Maintenance préventive supprimée' });
  } catch (error) {
    console.error('Erreur delete preventive:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// Réaliser une maintenance préventive (version corrigée)
export const realiserPreventive = async (req, res) => {
  const { id } = req.params;
  const { rapport, checklistEffectuee, dureeReelle } = req.body;

  try {
    console.log('🔧 Réalisation maintenance ID:', id);

    const preventive = await prisma.maintenancePreventive.findUnique({
      where: { id: parseInt(id) },
      include: { equipement: true }
    });

    if (!preventive) {
      return res.status(404).json({ message: 'Maintenance préventive non trouvée' });
    }

    // Calculer la prochaine date
    const prochaineDate = new Date();
    prochaineDate.setDate(prochaineDate.getDate() + preventive.periodicite);

    // Mettre à jour la maintenance préventive
    const updated = await prisma.maintenancePreventive.update({
      where: { id: parseInt(id) },
      data: {
        statut: 'REALISE',
        dateRealisation: new Date(),
        derniereRealisation: new Date(),
        prochaineRealisation: prochaineDate,
        rapport: rapport || null,
        ...(checklistEffectuee && { checklist: JSON.stringify(checklistEffectuee) })
      }
    });

    // Vérifier si l'utilisateur existe
    const technicien = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!technicien) {
      console.error('Technicien non trouvé:', req.user.id);
    } else {
      // Créer une intervention associée
      await prisma.intervention.create({
        data: {
          equipementId: preventive.equipementId,
          technicienId: req.user.id,
          type: 'PREVENTIF',
          statut: 'TERMINE',
          diagnostic: `Maintenance préventive ${preventive.type} réalisée`,
          rapportFinal: rapport || `Maintenance ${preventive.type} effectuée avec succès`,
          dateDebut: new Date(),
          dateFin: new Date(),
          dureeMinutes: dureeReelle || 30
        }
      });
    }

    res.json({ 
      message: 'Maintenance préventive réalisée avec succès', 
      preventive: updated 
    });
  } catch (error) {
    console.error('Erreur realiser preventive:', error);
    res.status(500).json({ 
      message: 'Erreur serveur: ' + error.message 
    });
  }
};

// Préventives à venir
export const getPreventivesADate = async (req, res) => {
  const { jours = 7 } = req.query;

  try {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + parseInt(jours));

    const preventives = await prisma.maintenancePreventive.findMany({
      where: {
        statut: 'PREVU',
        prochaineRealisation: { lte: dateLimite }
      },
      include: {
        equipement: { select: { id: true, nom: true, codeInventaire: true, service: true } },
        responsable: { select: { nom: true } }
      },
      orderBy: { prochaineRealisation: 'asc' }
    });

    res.json(preventives);
  } catch (error) {
    console.error('Erreur get preventives a date:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Statistiques préventives
export const getStatsPreventives = async (req, res) => {
  try {
    const [parType, tauxRealisation, prochainesEcheances] = await Promise.all([
      prisma.maintenancePreventive.groupBy({
        by: ['type'],
        _count: true,
        where: { statut: 'PREVU' }
      }),
      prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN statut = 'REALISE' THEN 1 END) as realisees,
          COUNT(*) as total
        FROM MaintenancePreventive
        WHERE dateRealisation >= date('now', '-30 days')
      `,
      prisma.maintenancePreventive.count({
        where: {
          statut: 'PREVU',
          prochaineRealisation: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const total = tauxRealisation[0]?.total || 0;
    const realisees = tauxRealisation[0]?.realisees || 0;
    const taux = total > 0 ? ((realisees / total) * 100).toFixed(1) : 0;

    res.json({
      parType,
      tauxRealisation: taux + '%',
      prochainesEcheances: prochainesEcheances,
      totalPrevues: await prisma.maintenancePreventive.count({ where: { statut: 'PREVU' } }),
      totalRealisees: await prisma.maintenancePreventive.count({ where: { statut: 'REALISE' } })
    });
  } catch (error) {
    console.error('Erreur stats preventives:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};