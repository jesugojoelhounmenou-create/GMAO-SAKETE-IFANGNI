import prisma from '../config/database.js';

export const getFournisseurs = async (req, res) => {
  const { type, actif, search } = req.query;

  try {
    const filters = {};
    if (type && type !== '') filters.type = type;
    if (actif !== undefined) filters.actif = actif === 'true';

    if (search) {
      filters.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const fournisseurs = await prisma.fournisseur.findMany({
      where: filters,
      include: {
        _count: {
          select: { equipements: true, pieces: true, contrats: true }
        }
      },
      orderBy: { nom: 'asc' }
    });

    res.json(fournisseurs);
  } catch (error) {
    console.error('Erreur get fournisseurs:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des fournisseurs' });
  }
};

export const getFournisseurById = async (req, res) => {
  const { id } = req.params;

  try {
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: parseInt(id) },
      include: {
        equipements: { take: 5, orderBy: { createdAt: 'desc' } },
        pieces: { take: 5 },
        contrats: { where: { dateFin: { gte: new Date() } } }
      }
    });

    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouve' });
    }

    res.json(fournisseur);
  } catch (error) {
    console.error('Erreur get fournisseur by id:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation du fournisseur' });
  }
};

export const addFournisseur = async (req, res) => {
  const { nom, contact, telephone, email, adresse, siteWeb, type, note, delaiMoyen } = req.body;

  try {
    if (!nom) {
      return res.status(400).json({ message: 'Le nom du fournisseur est requis' });
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom,
        contact: contact || null,
        telephone: telephone || null,
        email: email || null,
        adresse: adresse || null,
        siteWeb: siteWeb || null,
        type: type || 'EQUIPEMENT',
        note: note ? parseFloat(note) : null,
        delaiMoyen: delaiMoyen ? parseInt(delaiMoyen) : null,
        actif: true
      }
    });

    res.status(201).json({ message: 'Fournisseur ajoute', fournisseur });
  } catch (error) {
    console.error('Erreur add fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout du fournisseur' });
  }
};

export const updateFournisseur = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existing = await prisma.fournisseur.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Fournisseur non trouve' });
    }

    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(id) },
      data: {
        nom: updateData.nom,
        contact: updateData.contact || null,
        telephone: updateData.telephone || null,
        email: updateData.email || null,
        adresse: updateData.adresse || null,
        siteWeb: updateData.siteWeb || null,
        type: updateData.type || 'EQUIPEMENT',
        note: updateData.note ? parseFloat(updateData.note) : null,
        delaiMoyen: updateData.delaiMoyen ? parseInt(updateData.delaiMoyen) : null,
        actif: updateData.actif !== undefined ? updateData.actif : existing.actif
      }
    });

    res.json({ message: 'Fournisseur mis a jour', fournisseur });
  } catch (error) {
    console.error('Erreur update fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise a jour du fournisseur' });
  }
};

export const deleteFournisseur = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.fournisseur.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Fournisseur non trouve' });
    }

    await prisma.fournisseur.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Fournisseur supprime' });
  } catch (error) {
    console.error('Erreur delete fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du fournisseur' });
  }
};
