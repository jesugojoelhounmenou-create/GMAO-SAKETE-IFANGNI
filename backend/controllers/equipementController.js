import prisma from '../config/database.js';
import QRCode from 'qrcode';

const generateQR = async (equipment) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  
  const qrData = `${baseUrl}/technicien/equipement-detail.html?id=${equipment.id}`;
  
  const qrBase64 = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300
  });
  return qrBase64;
};

export const addEquipment = async (req, res) => {
  const {
    codeInventaire, nom, marque, modele, numeroSerie,
    typeMedical, criticite, service, batiment, salle,
    latitude, longitude, dateMiseService, garantieFin,
    fabricant, anneeFabrication, specifications
  } = req.body;

  try {
    const existing = await prisma.equipement.findUnique({
      where: { codeInventaire }
    });

    if (existing) {
      return res.status(400).json({ message: 'Ce code inventaire existe deja' });
    }

    const equipement = await prisma.equipement.create({
      data: {
        codeInventaire,
        nom,
        marque,
        modele: modele || null,
        numeroSerie: numeroSerie || null,
        typeMedical,
        criticite: criticite || 'MOYENNE',
        service,
        batiment: batiment || null,
        salle: salle || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        dateMiseService: dateMiseService ? new Date(dateMiseService) : null,
        garantieFin: garantieFin ? new Date(garantieFin) : null,
        fabricant: fabricant || null,
        anneeFabrication: anneeFabrication ? parseInt(anneeFabrication) : null,
        specifications: specifications || null,
        statut: 'FONCTIONNEL',
      },
    });

    const qrBase64 = await generateQR(equipement);
    
    const updated = await prisma.equipement.update({
      where: { id: equipement.id },
      data: { qrcode: qrBase64 },
    });

    res.status(201).json({
      message: 'Equipement ajoute avec succes',
      equipement: updated,
    });
  } catch (error) {
    console.error('Erreur ajout equipement:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout' });
  }
};

export const getAllEquipments = async (req, res) => {
  const { service, statut, type, search } = req.query;

  try {
    const filters = {};
    
    if (service && service !== '') filters.service = service;
    if (statut && statut !== '') filters.statut = statut;
    if (type && type !== '') filters.typeMedical = type;
    if (search) {
      filters.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { codeInventaire: { contains: search, mode: 'insensitive' } },
        { marque: { contains: search, mode: 'insensitive' } },
        { modele: { contains: search, mode: 'insensitive' } },
      ];
    }

    const equipements = await prisma.equipement.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        maintenances: {
          take: 1,
          orderBy: { dateDebut: 'desc' },
          where: { statut: { not: 'TERMINE' } }
        }
      },
    });

    res.json(equipements);
  } catch (error) {
    console.error('Erreur liste equipements:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation' });
  }
};

export const getEquipmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const equipement = await prisma.equipement.findUnique({
      where: { id: parseInt(id) },
      include: {
        maintenances: {
          orderBy: { dateDebut: 'desc' },
          take: 10,
          include: { technicien: { select: { nom: true } } }
        },
        maintenancesPreventives: {
          where: { statut: { not: 'REALISE' } }
        },
        alertes: {
          where: { resolue: false }
        }
      },
    });

    if (!equipement) {
      return res.status(404).json({ message: 'Equipement non trouve' });
    }

    res.json(equipement);
  } catch (error) {
    console.error('Erreur detail equipement:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation' });
  }
};

export const updateEquipment = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    console.log('Mise a jour equipement ID:', id);

    const existing = await prisma.equipement.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Equipement non trouve' });
    }

    const data = {
      nom: updateData.nom,
      codeInventaire: updateData.codeInventaire,
      marque: updateData.marque || null,
      modele: updateData.modele || null,
      numeroSerie: updateData.numeroSerie || null,
      typeMedical: updateData.typeMedical,
      criticite: updateData.criticite || 'MOYENNE',
      service: updateData.service,
      batiment: updateData.batiment || null,
      salle: updateData.salle || null,
      dateMiseService: updateData.dateMiseService ? new Date(updateData.dateMiseService) : null,
      garantieFin: updateData.garantieFin ? new Date(updateData.garantieFin) : null,
      statut: updateData.statut || 'FONCTIONNEL',
    };

    const equipement = await prisma.equipement.update({
      where: { id: parseInt(id) },
      data: data,
    });

    if (updateData.nom !== existing.nom || updateData.codeInventaire !== existing.codeInventaire) {
      const newQR = await generateQR(equipement);
      await prisma.equipement.update({
        where: { id: equipement.id },
        data: { qrcode: newQR },
      });
    }

    res.json({ message: 'Equipement mis a jour avec succes', equipement });
  } catch (error) {
    console.error('Erreur mise a jour:', error);
    res.status(500).json({ message: 'Erreur serveur: ' + error.message });
  }
};

export const deleteEquipment = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.equipement.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Equipement supprime' });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

export const scanQRCode = async (req, res) => {
  const { qrData } = req.body;

  try {
    if (typeof qrData === 'string' && qrData.includes('equipement-detail.html')) {
      const match = qrData.match(/id=(\d+)/);
      if (match) {
        const equipement = await prisma.equipement.findUnique({
          where: { id: parseInt(match[1]) }
        });
        if (equipement) {
          return res.json(equipement);
        }
      }
    }

    let parsed;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      parsed = { code: qrData };
    }

    const equipement = await prisma.equipement.findFirst({
      where: {
        OR: [
          { id: parsed.id ? parseInt(parsed.id) : undefined },
          { codeInventaire: parsed.code },
          { codeInventaire: parsed.codeInventaire },
        ].filter(Boolean),
      },
      include: {
        maintenances: {
          where: { statut: { not: 'TERMINE' } },
          take: 1,
        },
      },
    });

    if (!equipement) {
      return res.status(404).json({ message: 'Equipement non trouve' });
    }

    const derniereMaintenance = await prisma.intervention.findFirst({
      where: { equipementId: equipement.id, statut: 'TERMINE' },
      orderBy: { dateFin: 'desc' },
    });

    res.json({
      ...equipement,
      derniereMaintenance: derniereMaintenance?.dateFin,
      interventionEnCours: equipement.maintenances.length > 0,
    });
  } catch (error) {
    console.error('Erreur scan QR:', error);
    res.status(500).json({ message: 'Erreur lors du scan' });
  }
};

export const getEquipmentStats = async (req, res) => {
  try {
    const [total, fonctionnel, panne, maintenance, parService, parType] = await Promise.all([
      prisma.equipement.count(),
      prisma.equipement.count({ where: { statut: 'FONCTIONNEL' } }),
      prisma.equipement.count({ where: { statut: 'EN_PANNE' } }),
      prisma.equipement.count({ where: { statut: 'EN_MAINTENANCE' } }),
      prisma.equipement.groupBy({ by: ['service'], _count: true }),
      prisma.equipement.groupBy({ by: ['typeMedical'], _count: true }),
    ]);

    const disponibilite = total > 0 ? ((fonctionnel / total) * 100).toFixed(1) : 0;

    res.json({
      total,
      fonctionnel,
      panne,
      maintenance,
      disponibilite,
      parService,
      parType,
    });
  } catch (error) {
    console.error('Erreur stats equipements:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des statistiques' });
  }
};
