import prisma from '../config/database.js';

export const getAllPieces = async (req, res) => {
  const { categorie, search, stockFaible } = req.query;

  try {
    const filters = {};
    
    if (categorie && categorie !== '') filters.categorie = categorie;
    if (stockFaible === 'true') filters.quantiteStock = { lte: prisma.piece.fields.seuilAlerte };
    if (search) {
      filters.OR = [
        { designation: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pieces = await prisma.piece.findMany({
      where: filters,
      orderBy: { designation: 'asc' }
    });

    res.json(pieces);
  } catch (error) {
    console.error('Erreur liste pieces:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des pieces' });
  }
};

export const addPiece = async (req, res) => {
  const { code, designation, categorie, description, prixUnitaire, quantiteStock, seuilAlerte, emplacement, fournisseur } = req.body;

  try {
    if (!code || !designation) {
      return res.status(400).json({ message: 'Code et designation sont requis' });
    }

    const existing = await prisma.piece.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Ce code piece existe deja' });
    }

    const piece = await prisma.piece.create({
      data: {
        code,
        designation,
        categorie: categorie || 'AUTRE',
        description: description || null,
        prixUnitaire: parseFloat(prixUnitaire) || 0,
        quantiteStock: parseInt(quantiteStock) || 0,
        seuilAlerte: parseInt(seuilAlerte) || 5,
        emplacement: emplacement || null,
        fournisseur: fournisseur || null,
      }
    });

    if (quantiteStock > 0) {
      await prisma.mouvementStock.create({
        data: {
          pieceId: piece.id,
          type: 'ENTRER',
          quantite: parseInt(quantiteStock),
          date: new Date(),
          motif: 'Ajout initial au stock',
          utilisateurId: req.user.id,
        }
      });
    }

    res.status(201).json({ message: 'Piece ajoutee avec succes', piece });
  } catch (error) {
    console.error('Erreur ajout piece:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de la piece' });
  }
};

export const updatePiece = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existing = await prisma.piece.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Piece non trouvee' });
    }

    const piece = await prisma.piece.update({
      where: { id: parseInt(id) },
      data: {
        code: updateData.code || existing.code,
        designation: updateData.designation || existing.designation,
        categorie: updateData.categorie || existing.categorie,
        description: updateData.description !== undefined ? updateData.description : existing.description,
        prixUnitaire: updateData.prixUnitaire !== undefined ? parseFloat(updateData.prixUnitaire) : existing.prixUnitaire,
        quantiteStock: updateData.quantiteStock !== undefined ? parseInt(updateData.quantiteStock) : existing.quantiteStock,
        seuilAlerte: updateData.seuilAlerte !== undefined ? parseInt(updateData.seuilAlerte) : existing.seuilAlerte,
        emplacement: updateData.emplacement !== undefined ? updateData.emplacement : existing.emplacement,
        fournisseur: updateData.fournisseur !== undefined ? updateData.fournisseur : existing.fournisseur,
      },
    });

    res.json({ message: 'Piece mise a jour', piece });
  } catch (error) {
    console.error('Erreur mise a jour piece:', error);
    res.status(500).json({ message: 'Erreur lors de la mise a jour de la piece' });
  }
};

export const deletePiece = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.piece.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Piece non trouvee' });
    }

    await prisma.piece.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Piece supprimee' });
  } catch (error) {
    console.error('Erreur suppression piece:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la piece' });
  }
};

export const mouvementStock = async (req, res) => {
  const { pieceId, type, quantite, motif, prixUnitaire } = req.body;

  try {
    if (!pieceId || !type || !quantite || !motif) {
      return res.status(400).json({ message: 'Piece, type, quantite et motif sont requis' });
    }

    const piece = await prisma.piece.findUnique({
      where: { id: parseInt(pieceId) }
    });

    if (!piece) {
      return res.status(404).json({ message: 'Piece non trouvee' });
    }

    let nouvelleQuantite = piece.quantiteStock;
    if (type === 'ENTRER') {
      nouvelleQuantite += parseInt(quantite);
    } else if (type === 'SORTIR') {
      if (piece.quantiteStock < quantite) {
        return res.status(400).json({ message: 'Stock insuffisant' });
      }
      nouvelleQuantite -= parseInt(quantite);
    } else {
      return res.status(400).json({ message: 'Type de mouvement invalide' });
    }

    const updatedPiece = await prisma.piece.update({
      where: { id: piece.id },
      data: {
        quantiteStock: nouvelleQuantite,
        derniereEntree: type === 'ENTRER' ? new Date() : undefined,
        derniereSortie: type === 'SORTIR' ? new Date() : undefined,
      }
    });

    const mouvement = await prisma.mouvementStock.create({
      data: {
        pieceId: piece.id,
        type,
        quantite: parseInt(quantite),
        prixUnitaire: prixUnitaire ? parseFloat(prixUnitaire) : piece.prixUnitaire,
        date: new Date(),
        motif,
        utilisateurId: req.user.id,
      }
    });

    if (nouvelleQuantite <= piece.seuilAlerte && type === 'SORTIR') {
      await prisma.alerte.create({
        data: {
          type: 'STOCK_FAIBLE',
          niveau: 'ATTENTION',
          message: `Stock faible pour ${piece.designation}: ${nouvelleQuantite} unite(s) restante(s)`,
          pieceId: piece.id,
        }
      });
    }

    res.json({ message: 'Mouvement enregistre', piece: updatedPiece, mouvement });
  } catch (error) {
    console.error('Erreur mouvement stock:', error);
    res.status(500).json({ message: 'Erreur lors du mouvement de stock' });
  }
};

export const checkStock = async (req, res) => {
  const { pieceCode } = req.params;

  try {
    const piece = await prisma.piece.findUnique({
      where: { code: pieceCode }
    });

    if (!piece) {
      return res.status(404).json({ message: 'Piece non trouvee' });
    }

    res.json({
      code: piece.code,
      designation: piece.designation,
      quantite: piece.quantiteStock,
      seuilAlerte: piece.seuilAlerte,
      stockFaible: piece.quantiteStock <= piece.seuilAlerte,
      emplacement: piece.emplacement,
      prixUnitaire: piece.prixUnitaire
    });
  } catch (error) {
    console.error('Erreur verification stock:', error);
    res.status(500).json({ message: 'Erreur lors de la verification du stock' });
  }
};

export const getStockStats = async (req, res) => {
  try {
    const totalPieces = await prisma.piece.count();
    
    const pieces = await prisma.piece.findMany();
    const valeurTotale = pieces.reduce((total, p) => total + (p.quantiteStock * p.prixUnitaire), 0);

    const piecesFaibles = await prisma.piece.count({
      where: {
        quantiteStock: { lte: prisma.piece.fields.seuilAlerte }
      }
    });

    const mouvementsRecents = await prisma.mouvementStock.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { piece: true }
    });

    const sixMoisAvant = new Date();
    sixMoisAvant.setMonth(sixMoisAvant.getMonth() - 6);

    const mouvementsSortie = await prisma.mouvementStock.findMany({
      where: {
        type: 'SORTIR',
        date: { gte: sixMoisAvant }
      },
      select: { date: true, quantite: true }
    });

    const consommationsParMois = {};
    mouvementsSortie.forEach(mvt => {
      const mois = mvt.date.toISOString().slice(0, 7);
      if (!consommationsParMois[mois]) {
        consommationsParMois[mois] = 0;
      }
      consommationsParMois[mois] += mvt.quantite;
    });

    const consommationsParMoisArray = Object.entries(consommationsParMois)
      .map(([mois, totalSorties]) => ({ mois, totalSorties }))
      .sort((a, b) => a.mois.localeCompare(b.mois))
      .slice(-6);

    const alertes = pieces
      .filter(p => p.quantiteStock <= p.seuilAlerte)
      .map(p => ({
        code: p.code,
        designation: p.designation,
        quantite: p.quantiteStock,
        seuil: p.seuilAlerte
      }));

    res.json({
      totalPieces,
      valeurTotale: valeurTotale.toFixed(0),
      piecesFaibles,
      mouvementsRecents,
      consommationsParMois: consommationsParMoisArray,
      alertes
    });
  } catch (error) {
    console.error('Erreur stats stock:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des statistiques' });
  }
};
