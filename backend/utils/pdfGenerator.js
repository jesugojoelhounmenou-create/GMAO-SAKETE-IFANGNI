import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Générer un rapport d'intervention PDF
export const generateInterventionPDF = async (intervention, equipment, technicien, signalement) => {
  return new Promise((resolve, reject) => {
    const filename = `intervention_${intervention.id}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../uploads/rapports/', filename);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT D\'INTERVENTION', { align: 'center' });
    doc.fontSize(12).text(`GMAO - Hôpital de Zone Sakété-Ifangni`, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).text(`N° Intervention: #${intervention.id}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, { align: 'right' });
    doc.moveDown();

    // Informations équipement
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('1. ÉQUIPEMENT CONCERNÉ');
    doc.fontSize(12).font('Helvetica').fillColor('black');
    doc.text(`Nom: ${equipment.nom}`);
    doc.text(`Code inventaire: ${equipment.codeInventaire}`);
    doc.text(`Marque/Modèle: ${equipment.marque} ${equipment.modele || '-'}`);
    doc.text(`Numéro série: ${equipment.numeroSerie || '-'}`);
    doc.text(`Service: ${equipment.service}`);
    doc.moveDown();

    // Signalement
    if (signalement) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('2. SIGNALEMENT');
      doc.fontSize(12).font('Helvetica').fillColor('black');
      doc.text(`Signalé par: ${signalement.signalePar?.nom || 'N/C'}`);
      doc.text(`Date signalement: ${new Date(signalement.dateSignalement).toLocaleString('fr-FR')}`);
      doc.text(`Priorité: ${signalement.priorite}`);
      doc.text(`Description: ${signalement.description}`);
      doc.moveDown();
    }

    // Intervention
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('3. INTERVENTION');
    doc.fontSize(12).font('Helvetica').fillColor('black');
    doc.text(`Technicien: ${technicien?.nom || 'N/C'} ${technicien?.prenom || ''}`);
    doc.text(`Date début: ${new Date(intervention.dateDebut).toLocaleString('fr-FR')}`);
    if (intervention.dateFin) {
      doc.text(`Date fin: ${new Date(intervention.dateFin).toLocaleString('fr-FR')}`);
      doc.text(`Durée: ${intervention.dureeMinutes || 0} minutes`);
    }
    doc.text(`Type: ${intervention.type}`);
    doc.text(`Statut: ${intervention.statut}`);
    doc.moveDown();

    // Diagnostic et actions
    if (intervention.diagnostic) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('4. DIAGNOSTIC');
      doc.fontSize(12).font('Helvetica').fillColor('black');
      doc.text(intervention.diagnostic);
      doc.moveDown();
    }

    if (intervention.actionsRealisees) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('5. ACTIONS RÉALISÉES');
      doc.fontSize(12).font('Helvetica').fillColor('black');
      doc.text(intervention.actionsRealisees);
      doc.moveDown();
    }

    // Pièces utilisées
    if (intervention.piecesUtilisees && JSON.parse(intervention.piecesUtilisees).length > 0) {
      const pieces = JSON.parse(intervention.piecesUtilisees);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('6. PIÈCES UTILISÉES');
      doc.fontSize(12).font('Helvetica').fillColor('black');
      
      const tableTop = doc.y;
      doc.text('Désignation', 50, tableTop);
      doc.text('Quantité', 300, tableTop);
      doc.text('Prix unitaire', 400, tableTop);
      doc.text('Total', 470, tableTop);
      
      let y = tableTop + 20;
      let totalPieces = 0;
      pieces.forEach(piece => {
        doc.text(piece.designation || piece.code, 50, y);
        doc.text(piece.quantite.toString(), 300, y);
        doc.text(`${piece.prixUnitaire?.toLocaleString() || 0} FCFA`, 400, y);
        const total = (piece.quantite || 0) * (piece.prixUnitaire || 0);
        doc.text(`${total.toLocaleString()} FCFA`, 470, y);
        totalPieces += total;
        y += 20;
      });
      
      doc.text('TOTAL PIÈCES', 400, y + 10);
      doc.text(`${totalPieces.toLocaleString()} FCFA`, 470, y + 10);
      doc.moveDown(2);
    }

    // Rapport final
    if (intervention.rapportFinal) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a2a4f').text('7. RAPPORT FINAL');
      doc.fontSize(12).font('Helvetica').fillColor('black');
      doc.text(intervention.rapportFinal);
      doc.moveDown();
    }

    // Signatures
    doc.moveDown(2);
    doc.fontSize(10).text('Signature du technicien:', 50, doc.y);
    doc.text('Signature du responsable:', 350, doc.y);
    doc.moveDown();
    doc.text('_________________________', 50, doc.y);
    doc.text('_________________________', 350, doc.y);

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Document généré par GMAO Sakété-Ifangni - Page ${i + 1}/${pageCount}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();

    stream.on('finish', () => {
      resolve({ filename, filepath, url: `/uploads/rapports/${filename}` });
    });

    stream.on('error', reject);
  });
};

// Générer un rapport d'inventaire PDF
export const generateInventairePDF = async (equipements, filters) => {
  return new Promise((resolve, reject) => {
    const filename = `inventaire_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../uploads/rapports/', filename);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text('INVENTAIRE DES ÉQUIPEMENTS', { align: 'center' });
    doc.fontSize(12).text(`GMAO - Hôpital de Zone Sakété-Ifangni`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.moveDown();

    // Filtres appliqués
    if (filters && Object.keys(filters).length > 0) {
      doc.fontSize(10).text('Filtres appliqués:', { align: 'left' });
      if (filters.service) doc.text(`- Service: ${filters.service}`);
      if (filters.statut) doc.text(`- Statut: ${filters.statut}`);
      if (filters.type) doc.text(`- Type: ${filters.type}`);
      doc.moveDown();
    }

    // Statistiques
    const total = equipements.length;
    const parStatut = {};
    const parService = {};
    
    equipements.forEach(e => {
      parStatut[e.statut] = (parStatut[e.statut] || 0) + 1;
      parService[e.service] = (parService[e.service] || 0) + 1;
    });

    doc.fontSize(12).font('Helvetica-Bold').text('Résumé');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total équipements: ${total}`);
    doc.text(`Répartition par statut:`);
    Object.entries(parStatut).forEach(([k, v]) => {
      doc.text(`  - ${k}: ${v}`);
    });
    doc.moveDown();

    // Tableau des équipements
    doc.fontSize(10).font('Helvetica-Bold');
    const tableTop = doc.y;
    doc.text('Code', 50, tableTop);
    doc.text('Nom', 120, tableTop);
    doc.text('Marque', 250, tableTop);
    doc.text('Service', 340, tableTop);
    doc.text('Statut', 430, tableTop);
    
    doc.fontSize(9).font('Helvetica');
    let y = tableTop + 20;
    
    equipements.forEach(eq => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Code', 50, y);
        doc.text('Nom', 120, y);
        doc.text('Marque', 250, y);
        doc.text('Service', 340, y);
        doc.text('Statut', 430, y);
        y += 20;
        doc.fontSize(9).font('Helvetica');
      }
      
      doc.text(eq.codeInventaire, 50, y);
      doc.text(eq.nom.substring(0, 30), 120, y);
      doc.text(eq.marque.substring(0, 20), 250, y);
      doc.text(eq.service, 340, y);
      
      const statutColors = {
        'FONCTIONNEL': 'green',
        'EN_PANNE': 'red',
        'EN_MAINTENANCE': 'orange',
        'HORS_SERVICE': 'gray'
      };
      doc.fillColor(statutColors[eq.statut] || 'black').text(eq.statut, 430, y);
      doc.fillColor('black');
      
      y += 20;
    });

    doc.end();

    stream.on('finish', () => {
      resolve({ filename, filepath, url: `/uploads/rapports/${filename}` });
    });

    stream.on('error', reject);
  });
};