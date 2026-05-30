import prisma from '../config/database.js';

export const getPlanning = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const filters = {};
    if (startDate && endDate) {
      filters.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const planning = await prisma.planningGarde.findMany({
      where: filters,
      include: {
        technicien: { select: { id: true, nom: true, prenom: true, telephone: true } }
      },
      orderBy: { date: 'asc' }
    });

    res.json(planning);
  } catch (error) {
    console.error('Erreur get planning:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation du planning' });
  }
};

export const getMyPlanning = async (req, res) => {
  try {
    const planning = await prisma.planningGarde.findMany({
      where: { technicienId: req.user.id },
      orderBy: { date: 'asc' },
      take: 30
    });
    res.json(planning);
  } catch (error) {
    console.error('Erreur get my planning:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation de votre planning' });
  }
};

export const addPlanning = async (req, res) => {
  const { technicienId, date, typeGarde, heureDebut, heureFin, observateur } = req.body;

  try {
    if (!technicienId || !date || !typeGarde) {
      return res.status(400).json({ message: 'Technicien, date et type de garde sont requis' });
    }

    const planning = await prisma.planningGarde.create({
      data: {
        technicienId: parseInt(technicienId),
        date: new Date(date),
        typeGarde,
        heureDebut: heureDebut || null,
        heureFin: heureFin || null,
        observateur: observateur || null,
        valide: true
      }
    });
    res.status(201).json(planning);
  } catch (error) {
    console.error('Erreur add planning:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de la garde' });
  }
};

export const updatePlanning = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existing = await prisma.planningGarde.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Garde non trouvee' });
    }

    const planning = await prisma.planningGarde.update({
      where: { id: parseInt(id) },
      data: {
        technicienId: updateData.technicienId ? parseInt(updateData.technicienId) : existing.technicienId,
        date: updateData.date ? new Date(updateData.date) : existing.date,
        typeGarde: updateData.typeGarde || existing.typeGarde,
        heureDebut: updateData.heureDebut !== undefined ? updateData.heureDebut : existing.heureDebut,
        heureFin: updateData.heureFin !== undefined ? updateData.heureFin : existing.heureFin,
        observateur: updateData.observateur !== undefined ? updateData.observateur : existing.observateur,
        valide: updateData.valide !== undefined ? updateData.valide : existing.valide
      }
    });
    res.json(planning);
  } catch (error) {
    console.error('Erreur update planning:', error);
    res.status(500).json({ message: 'Erreur lors de la mise a jour de la garde' });
  }
};

export const deletePlanning = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.planningGarde.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Garde non trouvee' });
    }

    await prisma.planningGarde.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Garde supprimee' });
  } catch (error) {
    console.error('Erreur delete planning:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la garde' });
  }
};
