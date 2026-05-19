import prisma from '../config/database.js';

// Obtenir tout le planning
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
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Mon planning (technicien connecté)
export const getMyPlanning = async (req, res) => {
  try {
    const planning = await prisma.planningGarde.findMany({
      where: { technicienId: req.user.id },
      orderBy: { date: 'asc' },
      take: 30
    });
    res.json(planning);
  } catch (error) {
    console.error('Erreur my planning:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Ajouter une garde
export const addPlanning = async (req, res) => {
  const { technicienId, date, typeGarde, heureDebut, heureFin, observateur } = req.body;

  try {
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
    res.status(500).json({ message: 'Erreur lors de l\'ajout' });
  }
};

// Mettre à jour une garde
export const updatePlanning = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const planning = await prisma.planningGarde.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(planning);
  } catch (error) {
    console.error('Erreur update planning:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer une garde
export const deletePlanning = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.planningGarde.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Garde supprimée' });
  } catch (error) {
    console.error('Erreur delete planning:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};