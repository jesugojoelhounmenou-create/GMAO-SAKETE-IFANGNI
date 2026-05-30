import prisma from '../config/database.js';

export const getAlertes = async (req, res) => {
  const { type, niveau, resolue, limit } = req.query;

  try {
    const filters = {};
    if (type && type !== '') filters.type = type;
    if (niveau && niveau !== '') filters.niveau = niveau;
    if (resolue !== undefined) filters.resolue = resolue === 'true';

    const alertes = await prisma.alerte.findMany({
      where: filters,
      include: {
        equipement: { select: { id: true, nom: true, codeInventaire: true, service: true } },
        resoluePar: { select: { id: true, nom: true } }
      },
      orderBy: { dateCreation: 'desc' },
      take: limit ? parseInt(limit) : undefined
    });

    res.json(alertes);
  } catch (error) {
    console.error('Erreur get alertes:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des alertes' });
  }
};

export const getAlerteById = async (req, res) => {
  const { id } = req.params;

  try {
    const alerte = await prisma.alerte.findUnique({
      where: { id: parseInt(id) },
      include: {
        equipement: true,
        resoluePar: { select: { nom: true, prenom: true } }
      }
    });

    if (!alerte) {
      return res.status(404).json({ message: 'Alerte non trouvee' });
    }

    res.json(alerte);
  } catch (error) {
    console.error('Erreur get alerte by id:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation de l alerte' });
  }
};

export const resoudreAlerte = async (req, res) => {
  const { id } = req.params;
  const { commentaire } = req.body;

  try {
    const alerte = await prisma.alerte.update({
      where: { id: parseInt(id) },
      data: {
        resolue: true,
        dateResolution: new Date(),
        resolueParId: req.user.id,
        commentaire: commentaire || null
      }
    });

    res.json({ message: 'Alerte resolue', alerte });
  } catch (error) {
    console.error('Erreur resolution alerte:', error);
    res.status(500).json({ message: 'Erreur lors de la resolution de l alerte' });
  }
};

export const getAlertesNonResolues = async (req, res) => {
  try {
    const criticales = await prisma.alerte.findMany({
      where: { resolue: false, niveau: 'CRITIQUE' },
      include: { equipement: true },
      orderBy: { dateCreation: 'asc' }
    });

    const attention = await prisma.alerte.findMany({
      where: { resolue: false, niveau: 'ATTENTION' },
      include: { equipement: true },
      orderBy: { dateCreation: 'asc' }
    });

    const info = await prisma.alerte.findMany({
      where: { resolue: false, niveau: 'INFO' },
      include: { equipement: true },
      orderBy: { dateCreation: 'asc' }
    });

    res.json({
      total: criticales.length + attention.length + info.length,
      criticales,
      attention,
      info
    });
  } catch (error) {
    console.error('Erreur get alertes non resolues:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des alertes non resolues' });
  }
};

export const getStatsAlertes = async (req, res) => {
  try {
    const parType = await prisma.alerte.groupBy({
      by: ['type'],
      _count: true,
      where: { resolue: false }
    });

    const parNiveau = await prisma.alerte.groupBy({
      by: ['niveau'],
      _count: true,
      where: { resolue: false }
    });

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const evolution = await prisma.alerte.findMany({
      where: {
        dateCreation: { gte: sixMonthsAgo }
      },
      select: {
        dateCreation: true,
        resolue: true
      }
    });

    const evolutionParMois = {};
    evolution.forEach(alerte => {
      const mois = alerte.dateCreation.toISOString().slice(0, 7);
      if (!evolutionParMois[mois]) {
        evolutionParMois[mois] = { total: 0, resolues: 0 };
      }
      evolutionParMois[mois].total++;
      if (alerte.resolue) evolutionParMois[mois].resolues++;
    });

    const evolutionArray = Object.entries(evolutionParMois).map(([mois, data]) => ({
      mois,
      total: data.total,
      resolues: data.resolues
    })).sort((a, b) => a.mois.localeCompare(b.mois));

    const alertesResolues = await prisma.alerte.findMany({
      where: {
        resolue: true,
        dateResolution: { not: null }
      },
      select: {
        dateCreation: true,
        dateResolution: true
      }
    });

    let tempsTotalHeures = 0;
    let countResolues = 0;
    alertesResolues.forEach(alerte => {
      if (alerte.dateCreation && alerte.dateResolution) {
        const diffHeures = (alerte.dateResolution.getTime() - alerte.dateCreation.getTime()) / (1000 * 60 * 60);
        tempsTotalHeures += diffHeures;
        countResolues++;
      }
    });

    const tempsMoyenResolution = countResolues > 0 ? (tempsTotalHeures / countResolues).toFixed(1) : 0;
    const totalNonResolues = parType.reduce((acc, t) => acc + t._count, 0);

    res.json({
      parType,
      parNiveau,
      evolution: evolutionArray,
      tempsMoyenResolution: parseFloat(tempsMoyenResolution),
      totalNonResolues
    });
  } catch (error) {
    console.error('Erreur stats alertes:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des statistiques' });
  }
};
