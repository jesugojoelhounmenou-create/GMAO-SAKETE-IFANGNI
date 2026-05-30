import prisma from '../config/database.js';

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
    res.status(500).json({ message: 'Erreur lors de la recuperation des maintenances preventives' });
  }
};

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
      return res.status(404).json({ message: 'Maintenance preventive non trouvee' });
    }

    res.json(preventive);
  } catch (error) {
    console.error('Erreur get preventive by id:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation' });
  }
};

export const addPreventive = async (req, res) => {
  const { equipementId, type, periodicite, prochaineRealisation, checklist, instructions, responsableId } = req.body;

  try {
    if (!equipementId || !prochaineRealisation) {
      return res.status(400).json({ message: 'Equipement et date de realisation sont requis' });
    }

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

    res.status(201).json({ message: 'Maintenance preventive planifiee', preventive });
  } catch (error) {
    console.error('Erreur add preventive:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de la maintenance preventive' });
  }
};

export const updatePreventive = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existing = await prisma.maintenancePreventive.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Maintenance preventive non trouvee' });
    }

    const preventive = await prisma.maintenancePreventive.update({
      where: { id: parseInt(id) },
      data: {
        type: updateData.type || existing.type,
        periodicite: updateData.periodicite ? parseInt(updateData.periodicite) : existing.periodicite,
        prochaineRealisation: updateData.prochaineRealisation ? new Date(updateData.prochaineRealisation) : existing.prochaineRealisation,
        checklist: updateData.checklist ? JSON.stringify(updateData.checklist) : existing.checklist,
        instructions: updateData.instructions !== undefined ? updateData.instructions : existing.instructions,
        responsableId: updateData.responsableId ? parseInt(updateData.responsableId) : existing.responsableId,
        statut: updateData.statut || existing.statut
      }
    });

    res.json({ message: 'Maintenance preventive mise a jour', preventive });
  } catch (error) {
    console.error('Erreur update preventive:', error);
    res.status(500).json({ message: 'Erreur lors de la mise a jour' });
  }
};

export const deletePreventive = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.maintenancePreventive.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Maintenance preventive non trouvee' });
    }

    await prisma.maintenancePreventive.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Maintenance preventive supprimee' });
  } catch (error) {
    console.error('Erreur delete preventive:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

export const realiserPreventive = async (req, res) => {
  const { id } = req.params;
  const { rapport, checklistEffectuee, dureeReelle } = req.body;

  try {
    console.log('Realisation maintenance ID:', id);

    const preventive = await prisma.maintenancePreventive.findUnique({
      where: { id: parseInt(id) },
      include: { equipement: true }
    });

    if (!preventive) {
      return res.status(404).json({ message: 'Maintenance preventive non trouvee' });
    }

    const prochaineDate = new Date();
    prochaineDate.setDate(prochaineDate.getDate() + preventive.periodicite);

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

    const technicien = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!technicien) {
      console.error('Technicien non trouve:', req.user.id);
    } else {
      await prisma.intervention.create({
        data: {
          equipementId: preventive.equipementId,
          technicienId: req.user.id,
          type: 'PREVENTIF',
          statut: 'TERMINE',
          diagnostic: `Maintenance preventive ${preventive.type} realisee`,
          rapportFinal: rapport || `Maintenance ${preventive.type} effectuee avec succes`,
          dateDebut: new Date(),
          dateFin: new Date(),
          dureeMinutes: dureeReelle || 30
        }
      });
    }

    res.json({ 
      message: 'Maintenance preventive realisee avec succes', 
      preventive: updated 
    });
  } catch (error) {
    console.error('Erreur realiser preventive:', error);
    res.status(500).json({ 
      message: 'Erreur serveur: ' + error.message 
    });
  }
};

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
    res.status(500).json({ message: 'Erreur lors de la recuperation' });
  }
};

export const getStatsPreventives = async (req, res) => {
  try {
    const parType = await prisma.maintenancePreventive.groupBy({
      by: ['type'],
      _count: true,
      where: { statut: 'PREVU' }
    });

    const trenteJoursAvant = new Date();
    trenteJoursAvant.setDate(trenteJoursAvant.getDate() - 30);

    const allPreventives = await prisma.maintenancePreventive.findMany({
      where: {
        dateRealisation: { gte: trenteJoursAvant }
      },
      select: { statut: true }
    });

    const total = allPreventives.length;
    const realisees = allPreventives.filter(p => p.statut === 'REALISE').length;
    const taux = total > 0 ? ((realisees / total) * 100).toFixed(1) : 0;

    const semaineProchaine = new Date();
    semaineProchaine.setDate(semaineProchaine.getDate() + 7);

    const prochainesEcheances = await prisma.maintenancePreventive.count({
      where: {
        statut: 'PREVU',
        prochaineRealisation: { lte: semaineProchaine }
      }
    });

    res.json({
      parType,
      tauxRealisation: taux + '%',
      prochainesEcheances: prochainesEcheances,
      totalPrevues: await prisma.maintenancePreventive.count({ where: { statut: 'PREVU' } }),
      totalRealisees: await prisma.maintenancePreventive.count({ where: { statut: 'REALISE' } })
    });
  } catch (error) {
    console.error('Erreur stats preventives:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des statistiques' });
  }
};
