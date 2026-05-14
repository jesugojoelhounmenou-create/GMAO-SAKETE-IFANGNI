import prisma from '../config/database.js';

// Liste des alertes
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
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Détail d'une alerte
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
      return res.status(404).json({ message: 'Alerte non trouvée' });
    }

    res.json(alerte);
  } catch (error) {
    console.error('Erreur get alerte:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Résoudre une alerte
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

    res.json({ message: 'Alerte résolue', alerte });
  } catch (error) {
    console.error('Erreur resolution alerte:', error);
    res.status(500).json({ message: 'Erreur lors de la résolution' });
  }
};

// Alertes non résolues
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
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Statistiques des alertes
export const getStatsAlertes = async (req, res) => {
  try {
    const [parType, parNiveau, evolution, tempsResolution] = await Promise.all([
      prisma.alerte.groupBy({
        by: ['type'],
        _count: true,
        where: { resolue: false }
      }),
      prisma.alerte.groupBy({
        by: ['niveau'],
        _count: true,
        where: { resolue: false }
      }),
      prisma.$queryRaw`
        SELECT 
          strftime('%Y-%m', dateCreation) as mois,
          COUNT(*) as total,
          SUM(CASE WHEN resolue = 1 THEN 1 ELSE 0 END) as resolues
        FROM Alerte
        WHERE dateCreation >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', dateCreation)
        ORDER BY mois ASC
      `,
      prisma.$queryRaw`
        SELECT 
          AVG(julianday(dateResolution) - julianday(dateCreation)) * 24 as avgHeures
        FROM Alerte
        WHERE resolue = 1
          AND dateResolution IS NOT NULL
      `
    ]);

    res.json({
      parType,
      parNiveau,
      evolution,
      tempsMoyenResolution: tempsResolution[0]?.avgHeures?.toFixed(1) || 0,
      totalNonResolues: parType.reduce((acc, t) => acc + t._count, 0)
    });
  } catch (error) {
    console.error('Erreur stats alertes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};