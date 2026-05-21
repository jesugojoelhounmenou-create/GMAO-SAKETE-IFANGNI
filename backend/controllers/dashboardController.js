import prisma from '../config/database.js';

// Dashboard technicien
export const getTechnicienDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEquipements,
      statsEquipements,
      urgences,
      interventionsEnCours,
      preventifsAujourdhui,
      dernieresInterventions,
      alertesCritiques,
    ] = await Promise.all([
      prisma.equipement.count(),
      prisma.equipement.groupBy({
        by: ['statut'],
        _count: true,
      }),
      prisma.intervention.findMany({
        where: { statut: 'EN_ATTENTE', type: { in: ['URGEANT', 'CORRECTIF'] } },
        include: {
          equipement: true,
          signalement: { include: { signalePar: { select: { nom: true } } } },
        },
        orderBy: { dateDebut: 'asc' },
        take: 10,
      }),
      prisma.intervention.findMany({
        where: { statut: 'EN_COURS', technicienId: req.user.id },
        include: { equipement: true },
        orderBy: { dateDebut: 'desc' },
      }),
      prisma.maintenancePreventive.findMany({
        where: {
          prochaineRealisation: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          statut: 'PREVU',
        },
        include: { equipement: true },
      }),
      prisma.intervention.findMany({
        where: { technicienId: req.user.id, statut: 'TERMINE' },
        include: { equipement: true },
        orderBy: { dateFin: 'desc' },
        take: 5,
      }),
      prisma.alerte.findMany({
        where: { resolue: false, niveau: 'CRITIQUE' },
        include: { equipement: true },
        take: 5,
      }),
    ]);

    // Calculer la disponibilité
    const total = statsEquipements.reduce((acc, s) => acc + s._count, 0);
    const fonctionnel = statsEquipements.find(s => s.statut === 'FONCTIONNEL')?._count || 0;
    const disponibilite = total > 0 ? ((fonctionnel / total) * 100).toFixed(1) : 0;

    res.json({
      stats: {
        totalEquipements: total,
        fonctionnel,
        panne: statsEquipements.find(s => s.statut === 'EN_PANNE')?._count || 0,
        maintenance: statsEquipements.find(s => s.statut === 'EN_MAINTENANCE')?._count || 0,
        disponibilite,
        urgencesCount: urgences.length,
        interventionsEnCours: interventionsEnCours.length,
        preventifsAujourdhui: preventifsAujourdhui.length,
      },
      urgences,
      interventionsEnCours,
      preventifsAujourdhui,
      dernieresInterventions,
      alertesCritiques,
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du dashboard' });
  }
};

// Dashboard soignant
export const getSoignantDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    const [
      mesSignalements,
      equipementsRecents,
      stats,
    ] = await Promise.all([
      prisma.signalement.findMany({
        where: { signaleParId: userId },
        include: { equipement: true },
        orderBy: { dateSignalement: 'desc' },
        take: 10,
      }),
      prisma.equipement.findMany({
        where: { service: req.user.service || undefined },
        take: 6,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN statut = 'FONCTIONNEL' THEN 1 END) as fonctionnel,
          COUNT(*) as total
        FROM Equipement
        WHERE service = ${req.user.service || 'URGENCES'}
      `,
    ]);

    const statsObj = stats[0] || { fonctionnel: 0, total: 0 };
    const disponibiliteService = statsObj.total > 0 
      ? ((statsObj.fonctionnel / statsObj.total) * 100).toFixed(1) 
      : 0;

    res.json({
      mesSignalements,
      equipementsRecents,
      stats: {
        mesSignalementsCount: mesSignalements.length,
        signalementsEnCours: mesSignalements.filter(s => !s.traite).length,
        disponibiliteService,
      },
    });
  } catch (error) {
    console.error('Erreur dashboard soignant:', error);
    res.status(500).json({ message: 'Erreur lors du chargement' });
  }
};

// Dashboard mobile (version optimisée)
export const getMobileDashboard = async (req, res) => {
  try {
    const [
      urgences,
      interventionsEnCours,
      stats,
    ] = await Promise.all([
      prisma.intervention.findMany({
        where: { statut: 'EN_ATTENTE', type: { in: ['URGEANT', 'CORRECTIF'] } },
        include: { equipement: { select: { id: true, nom: true, service: true, codeInventaire: true } } },
        orderBy: { dateDebut: 'asc' },
        take: 5,
      }),
      prisma.intervention.findMany({
        where: { technicienId: req.user.id, statut: 'EN_COURS' },
        include: { equipement: { select: { id: true, nom: true } } },
      }),
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN statut = 'FONCTIONNEL' THEN 1 ELSE 0 END) as fonctionnel
        FROM Equipement
      `,
    ]);

    const statsObj = stats[0] || { total: 0, fonctionnel: 0 };
    const disponibilite = statsObj.total > 0 
      ? ((statsObj.fonctionnel / statsObj.total) * 100).toFixed(1) 
      : 0;

    res.json({
      urgences: urgences.map(u => ({
        id: u.id,
        equipement: u.equipement,
        priorite: u.signalement?.priorite || 'MOYENNE',
        dateSignalement: u.dateDebut,
      })),
      interventionsEnCours,
      stats: {
        urgencesCount: urgences.length,
        enCoursCount: interventionsEnCours.length,
        disponibilite,
      },
    });
  } catch (error) {
    console.error('Erreur dashboard mobile:', error);
    res.status(500).json({ message: 'Erreur lors du chargement' });
  }
};
