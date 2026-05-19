import prisma from '../config/database.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Générer les indicateurs CoDIR
export const getCodirIndicators = async (req, res) => {
  const { mois, annee } = req.query;
  const dateDebut = new Date(annee, mois - 1, 1);
  const dateFin = new Date(annee, mois, 0);

  try {
    // 1. Disponibilité globale
    const totalEquipements = await prisma.equipement.count();
    const equipementsFonctionnels = await prisma.equipement.count({
      where: { statut: 'FONCTIONNEL' }
    });
    const disponibiliteGlobale = totalEquipements > 0 
      ? ((equipementsFonctionnels / totalEquipements) * 100).toFixed(1) 
      : 0;

    // 2. MTBF (Mean Time Between Failures)
    const interventions = await prisma.intervention.findMany({
      where: {
        type: 'CORRECTIF',
        statut: 'TERMINE',
        dateDebut: { gte: dateDebut, lte: dateFin }
      },
      include: { equipement: true }
    });
    
    // Grouper par équipement pour calculer MTBF
    const panneParEquipement = {};
    interventions.forEach(interv => {
      if (!panneParEquipement[interv.equipementId]) {
        panneParEquipement[interv.equipementId] = [];
      }
      panneParEquipement[interv.equipementId].push(interv.dateDebut);
    });
    
    let mtbfTotal = 0;
    let nbEquipementsAvecPannes = 0;
    for (const [equipId, dates] of Object.entries(panneParEquipement)) {
      if (dates.length >= 2) {
        let sommeIntervalles = 0;
        for (let i = 1; i < dates.length; i++) {
          const intervalle = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24); // en jours
          sommeIntervalles += intervalle;
        }
        const mtbfEquip = sommeIntervalles / (dates.length - 1);
        mtbfTotal += mtbfEquip;
        nbEquipementsAvecPannes++;
      }
    }
    const mtbfMoyen = nbEquipementsAvecPannes > 0 ? (mtbfTotal / nbEquipementsAvecPannes).toFixed(1) : 0;

    // 3. MTTR (Mean Time To Repair)
    const interventionsTerminees = interventions.filter(i => i.dateFin);
    let mttrTotal = 0;
    interventionsTerminees.forEach(interv => {
      const duree = (interv.dateFin - interv.dateDebut) / (1000 * 60 * 60); // en heures
      mttrTotal += duree;
    });
    const mttrMoyen = interventionsTerminees.length > 0 
      ? (mttrTotal / interventionsTerminees.length).toFixed(1) 
      : 0;

    // 4. Taux de pannes critiques
    const pannesCritiques = interventions.filter(i => 
      i.signalement?.priorite === 'CRITIQUE' || i.type === 'URGEANT'
    ).length;
    const tauxPannesCritiques = interventions.length > 0 
      ? ((pannesCritiques / interventions.length) * 100).toFixed(1) 
      : 0;

    // 5. Coût de maintenance
    const coutPieces = await prisma.pieceUtilisee.aggregate({
      where: {
        dateUtilisation: { gte: dateDebut, lte: dateFin }
      },
      _sum: { prixUnitaire: true }
    });
    const coutTotal = (coutPieces._sum.prixUnitaire || 0);

    // 6. Taux de réalisation des préventives
    const preventivesPrevues = await prisma.maintenancePreventive.count({
      where: {
        prochaineRealisation: { gte: dateDebut, lte: dateFin }
      }
    });
    const preventivesRealisees = await prisma.maintenancePreventive.count({
      where: {
        dateRealisation: { gte: dateDebut, lte: dateFin },
        statut: 'REALISE'
      }
    });
    const tauxPreventif = preventivesPrevues > 0 
      ? ((preventivesRealisees / preventivesPrevues) * 100).toFixed(1) 
      : 0;

    // 7. Top pannes par équipement
    const topPannes = await prisma.$queryRaw`
      SELECT 
        e.nom as equipmentNom,
        e.typeMedical,
        COUNT(i.id) as nombrePannes
      FROM Intervention i
      JOIN Equipement e ON i.equipementId = e.id
      WHERE i.type = 'CORRECTIF'
        AND i.dateDebut >= ${dateDebut}
        AND i.dateDebut <= ${dateFin}
      GROUP BY e.id
      ORDER BY nombrePannes DESC
      LIMIT 5
    `;

    // 8. Disponibilité par service
    const disponibiliteParService = await prisma.$queryRaw`
      SELECT 
        e.service,
        COUNT(*) as total,
        SUM(CASE WHEN e.statut = 'FONCTIONNEL' THEN 1 ELSE 0 END) as fonctionnel
      FROM Equipement e
      GROUP BY e.service
    `;

    const servicesDispo = disponibiliteParService.map(s => ({
      service: s.service,
      disponibilite: s.total > 0 ? ((s.fonctionnel / s.total) * 100).toFixed(1) : 0,
      total: s.total,
      fonctionnel: s.fonctionnel
    }));

    // 9. Évolution mensuelle
    const evolutionMensuelle = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', dateDebut) as mois,
        COUNT(*) as interventions,
        AVG(julianday(dateFin) - julianday(dateDebut)) * 24 as mttr
      FROM Intervention
      WHERE statut = 'TERMINE'
        AND dateDebut >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', dateDebut)
      ORDER BY mois ASC
    `;

    const indicateurs = {
      periode: { mois: parseInt(mois), annee: parseInt(annee), dateDebut, dateFin },
      disponibilite: {
        globale: disponibiliteGlobale,
        objectif: 95,
        atteint: disponibiliteGlobale >= 95,
        parService: servicesDispo
      },
      fiabilite: {
        mtbf: mtbfMoyen + ' jours',
        mttr: mttrMoyen + ' heures',
        tauxPannesCritiques: tauxPannesCritiques + '%'
      },
      maintenance: {
        interventions: interventions.length,
        pannesCritiques: pannesCritiques,
        coutTotal: coutTotal.toFixed(0),
        tauxPreventif: tauxPreventif + '%'
      },
      topEquipementsPannes: topPannes,
      evolution: evolutionMensuelle,
      alertes: {
        stockFaible: await prisma.piece.count({
          where: { quantiteStock: { lte: prisma.piece.fields.seuilAlerte } }
        }),
        garantiesExpirant: await prisma.equipement.count({
          where: {
            garantieFin: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
          }
        })
      }
    };

    // Sauvegarder le rapport
    const rapport = await prisma.rapportCoDIR.create({
      data: {
        mois: dateDebut,
        indicateurs: indicateurs,
        genereParId: req.user.id,
        resume: `Rapport mensuel ${mois}/${annee} - Disponibilité: ${disponibiliteGlobale}%`
      }
    });

    res.json({ indicateurs, rapportId: rapport.id });
  } catch (error) {
    console.error('Erreur indicateurs CoDIR:', error);
    res.status(500).json({ message: 'Erreur lors de la génération des indicateurs' });
  }
};

// Générer un rapport PDF
export const generatePDFRapport = async (req, res) => {
  const { rapportId } = req.params;

  try {
    const rapport = await prisma.rapportCoDIR.findUnique({
      where: { id: parseInt(rapportId) },
      include: { generePar: { select: { nom: true } } }
    });

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const indicateurs = rapport.indicateurs;
    const filename = `rapport_codir_${rapport.mois.getFullYear()}_${rapport.mois.getMonth() + 1}.pdf`;
    const filepath = path.join(__dirname, '../uploads/rapports/', filename);

    // Créer le PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT CoDIR - GMAO', { align: 'center' });
    doc.fontSize(14).text(`Hôpital de Zone Sakété-Ifangni`, { align: 'center' });
    doc.fontSize(12).text(`Période: ${indicateurs.periode.mois}/${indicateurs.periode.annee}`, { align: 'center' });
    doc.moveDown();

    // Section Disponibilité
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('1. DISPONIBILITÉ DES ÉQUIPEMENTS');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Taux de disponibilité global: ${indicateurs.disponibilite.globale}%`);
    doc.text(`Objectif OMS: 95% - ${indicateurs.disponibilite.atteint ? '✅ ATTEINT' : '❌ NON ATTEINT'}`);
    doc.moveDown();

    // Graphique disponibilité par service
    doc.text('Disponibilité par service:');
    indicateurs.disponibilite.parService.forEach(service => {
      const barre = '█'.repeat(Math.floor(service.disponibilite / 5));
      doc.text(`  ${service.service}: ${barre} ${service.disponibilite}%`);
    });
    doc.moveDown();

    // Section Fiabilité
    doc.fontSize(14).font('Helvetica-Bold').text('2. INDICATEURS DE FIABILITÉ');
    doc.fontSize(12).font('Helvetica');
    doc.text(`MTBF (Mean Time Between Failures): ${indicateurs.fiabilite.mtbf}`);
    doc.text(`MTTR (Mean Time To Repair): ${indicateurs.fiabilite.mttr}`);
    doc.text(`Taux de pannes critiques: ${indicateurs.fiabilite.tauxPannesCritiques}`);
    doc.moveDown();

    // Section Maintenance
    doc.fontSize(14).font('Helvetica-Bold').text('3. ACTIVITÉ DE MAINTENANCE');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Nombre d'interventions: ${indicateurs.maintenance.interventions}`);
    doc.text(`Pannes critiques: ${indicateurs.maintenance.pannesCritiques}`);
    doc.text(`Coût total de maintenance: ${new Intl.NumberFormat('fr-FR').format(indicateurs.maintenance.coutTotal)} FCFA`);
    doc.text(`Taux de réalisation des préventives: ${indicateurs.maintenance.tauxPreventif}`);
    doc.moveDown();

    // Top pannes
    doc.fontSize(14).font('Helvetica-Bold').text('4. TOP 5 ÉQUIPEMENTS LES PLUS EN PANNE');
    doc.fontSize(12).font('Helvetica');
    indicateurs.topEquipementsPannes.forEach((eq, idx) => {
      doc.text(`${idx + 1}. ${eq.equipmentNom} (${eq.typeMedical}) - ${eq.nombrePannes} panne(s)`);
    });
    doc.moveDown();

    // Alertes
    doc.fontSize(14).font('Helvetica-Bold').text('5. ALERTES ET RECOMMANDATIONS');
    doc.fontSize(12).font('Helvetica');
    doc.text(`⚠️ Stock critique: ${indicateurs.alertes.stockFaible} références de pièces`);
    doc.text(`⚠️ Garanties expirant prochainement: ${indicateurs.alertes.garantiesExpirant} équipements`);
    doc.moveDown();

    // Footer
    doc.fontSize(10).text(`Généré par: ${rapport.generePar.nom}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, { align: 'right' });

    doc.end();

    stream.on('finish', () => {
      res.json({ 
        message: 'PDF généré avec succès', 
        url: `/uploads/rapports/${filename}`,
        filename 
      });
    });
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};

// Exporter en Excel
export const exportToExcel = async (req, res) => {
  const { mois, annee } = req.query;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rapport CoDIR');

    // En-tête
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `RAPPORT CoDIR - ${mois}/${annee}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };

    // Obtenir les données
    const interventions = await prisma.intervention.findMany({
      where: {
        dateDebut: {
          gte: new Date(annee, mois - 1, 1),
          lte: new Date(annee, mois, 0)
        }
      },
      include: { equipement: true, signalement: true }
    });

    // Remplir les données
    worksheet.addRow(['ID', 'Équipement', 'Service', 'Type', 'Date Début', 'Date Fin', 'Durée (h)', 'Statut']);
    interventions.forEach(interv => {
      worksheet.addRow([
        interv.id,
        interv.equipement.nom,
        interv.equipement.service,
        interv.type,
        new Date(interv.dateDebut).toLocaleDateString('fr-FR'),
        interv.dateFin ? new Date(interv.dateFin).toLocaleDateString('fr-FR') : 'En cours',
        interv.dureeMinutes ? (interv.dureeMinutes / 60).toFixed(1) : '-',
        interv.statut
      ]);
    });

    // Style
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach(col => {
      col.width = 15;
    });

    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_codir_${mois}_${annee}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erreur export Excel:', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
};

// Liste des rapports CoDIR
export const getRapportsList = async (req, res) => {
  try {
    const rapports = await prisma.rapportCoDIR.findMany({
      orderBy: { mois: 'desc' },
      include: { generePar: { select: { nom: true } } }
    });
    res.json(rapports);
  } catch (error) {
    console.error('Erreur liste rapports:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};