import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

// Liste tous les utilisateurs
export const getAllUsers = async (req, res) => {
  const { role, statut, search } = req.query;

  try {
    const filters = {};
    if (role && role !== '') filters.role = role;
    if (statut && statut !== '') filters.statut = statut;
    if (search) {
      filters.OR = [
        { nom: { contains: search } },
        { email: { contains: search } },
        { matricule: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where: filters,
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        service: true,
        role: true,
        statut: true,
        createdAt: true,
        dernierConnexion: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Erreur get users:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Détail d'un utilisateur
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        service: true,
        role: true,
        statut: true,
        photo: true,
        createdAt: true,
        dernierConnexion: true,
        validePar: { select: { nom: true } },
        dateValidation: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur get user:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Mettre à jour un utilisateur
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, service, role, password } = req.body;

  try {
    const updateData = { nom, prenom, telephone, service, role };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        service: true,
        statut: true
      }
    });

    res.json({ message: 'Utilisateur mis à jour', user });
  } catch (error) {
    console.error('Erreur update user:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un utilisateur
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Erreur delete user:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// Récupérer les comptes en attente de validation
export const getPendingUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: 'SOIGNANT',
                statut: 'EN_ATTENTE'
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};