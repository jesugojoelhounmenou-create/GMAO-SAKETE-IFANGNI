import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res) => {
  const { role, statut, search } = req.query;

  try {
    const filters = {};
    if (role && role !== '') filters.role = role;
    if (statut && statut !== '') filters.statut = statut;
    if (search) {
      filters.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } }
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
    res.status(500).json({ message: 'Erreur lors de la recuperation des utilisateurs' });
  }
};

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
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur get user by id:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation de l\'utilisateur' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, service, role, password } = req.body;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (service !== undefined) updateData.service = service;
    if (role !== undefined) updateData.role = role;
    
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

    res.json({ message: 'Utilisateur mis a jour', user });
  } catch (error) {
    console.error('Erreur update user:', error);
    res.status(500).json({ message: 'Erreur lors de la mise a jour de l\'utilisateur' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Utilisateur supprime' });
  } catch (error) {
    console.error('Erreur delete user:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
};

export const getPendingUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: 'SOIGNANT',
                statut: 'EN_ATTENTE'
            },
            orderBy: { createdAt: 'desc' }
        });

        const usersWithoutPassword = users.map(({ password, ...rest }) => rest);

        res.json(usersWithoutPassword);
    } catch (error) {
        console.error('Erreur get pending users:', error);
        res.status(500).json({ message: 'Erreur lors de la recuperation des comptes en attente' });
    }
};
