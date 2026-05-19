import prisma from '../config/database.js';

// Liste des fournisseurs
export const getFournisseurs = async (req, res) => {
  const { type, actif, search } = req.query;

  try {
    const filters = {};
    if (type && type !== '') filters.type = type;
    if (actif !== undefined) filters.actif = actif === 'true';

    if (search) {
      filters.OR = [
        { nom: { contains: search } },
        { contact: { contains: search } },
        { email: { contains: search } }
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
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Détail d'un fournisseur
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
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    res.json(fournisseur);
  } catch (error) {
    console.error('Erreur get fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Ajouter un fournisseur
export const addFournisseur = async (req, res) => {
  const { nom, contact, telephone, email, adresse, siteWeb, type, note, delaiMoyen } = req.body;

  try {
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

    res.status(201).json({ message: 'Fournisseur ajouté', fournisseur });
  } catch (error) {
    console.error('Erreur add fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout' });
  }
};

// Mettre à jour un fournisseur
export const updateFournisseur = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ message: 'Fournisseur mis à jour', fournisseur });
  } catch (error) {
    console.error('Erreur update fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un fournisseur
export const deleteFournisseur = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.fournisseur.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Fournisseur supprimé' });
  } catch (error) {
    console.error('Erreur delete fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};