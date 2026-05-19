import express from 'express';
import {
  addEquipment,
  getAllEquipments,
  getEquipmentById,
  updateEquipment,
  deleteEquipment,
  scanQRCode,
  getEquipmentStats
} from '../controllers/equipementController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';
import prisma from '../config/database.js';
import QRCode from 'qrcode';

const router = express.Router();

// Routes existantes
router.get('/', verifyToken, getAllEquipments);
router.get('/stats', verifyToken, isTechnicien, getEquipmentStats);
router.get('/:id', verifyToken, getEquipmentById);
router.post('/scan-qr', verifyToken, scanQRCode);
router.post('/', verifyToken, isTechnicien, addEquipment);
router.put('/:id', verifyToken, isTechnicien, updateEquipment);
router.delete('/:id', verifyToken, isTechnicien, deleteEquipment);

// Générer QR code pour impression
router.get('/:id/qr', async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.query.token;
        
        if (!token) {
            return res.status(401).send('Token manquant');
        }
        
        try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
            if (!decoded) {
                return res.status(401).send('Token invalide');
            }
        } catch (err) {
            return res.status(401).send('Token invalide');
        }
        
        const equipement = await prisma.equipement.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!equipement) {
            return res.status(404).send('Équipement non trouvé');
        }
        
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
        // URL directe (pas de JSON) pour scan automatique
        const directUrl = `${baseUrl}/technicien/equipement-detail.html?id=${equipement.id}`;
        
        const qrImage = await QRCode.toDataURL(directUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300
        });
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>QR Code - ${equipement.nom}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: #e8f5e9;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        padding: 20px;
                    }
                    .qr-card {
                        background: white;
                        border-radius: 20px;
                        padding: 30px;
                        text-align: center;
                        max-width: 450px;
                        width: 100%;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    }
                    .qr-header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e8f5e9; }
                    .qr-header h2 { color: #1b5e20; font-size: 20px; }
                    .qr-header p { color: #64748b; font-size: 12px; margin-top: 5px; }
                    .qr-code { background: white; padding: 20px; margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 16px; }
                    .qr-code img { width: 250px; height: 250px; }
                    .equipment-info { background: #f8fafc; padding: 15px; border-radius: 12px; margin: 15px 0; text-align: left; }
                    .equipment-info div { margin-bottom: 8px; font-size: 14px; }
                    .equipment-info .label { font-weight: bold; color: #1b5e20; width: 100px; display: inline-block; }
                    .url-info { background: #f1f5f9; padding: 10px; border-radius: 8px; font-size: 11px; word-break: break-all; margin-top: 10px; }
                    .btn-group { display: flex; gap: 10px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
                    .btn { padding: 10px 20px; border: none; border-radius: 30px; cursor: pointer; font-size: 14px; font-weight: 500; }
                    .btn-print { background: #1b5e20; color: white; }
                    .btn-copy { background: #3b82f6; color: white; }
                    .btn-close { background: #e2e8f0; color: #475569; }
                    @media print { .btn-group { display: none; } }
                </style>
            </head>
            <body>
                <div class="qr-card">
                    <div class="qr-header">
                        <h2>🏥 GMAO Sakété-Ifangni</h2>
                        <p>Scannez ce QR code pour accéder à la fiche technique</p>
                    </div>
                    <div class="qr-code">
                        <img src="${qrImage}" alt="QR Code">
                    </div>
                    <div class="equipment-info">
                        <div><span class="label">📦 Code:</span> ${equipement.codeInventaire}</div>
                        <div><span class="label">🏷️ Nom:</span> ${equipement.nom}</div>
                        <div><span class="label">🔧 Marque:</span> ${equipement.marque || '-'}</div>
                        <div><span class="label">📍 Service:</span> ${equipement.service}</div>
                    </div>
                    <div class="url-info">
                        🔗 ${directUrl}
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-print" onclick="window.print()">🖨️ Imprimer</button>
                        <button class="btn btn-copy" onclick="copyUrl()">📋 Copier le lien</button>
                        <button class="btn btn-close" onclick="window.close()">Fermer</button>
                    </div>
                </div>
                <script>
                    function copyUrl() {
                        navigator.clipboard.writeText('${directUrl}');
                        alert('Lien copié !');
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Erreur QR:', error);
        res.status(500).send('Erreur génération QR code');
    }
});

// Export Excel
router.get('/export-excel', verifyToken, isTechnicien, async (req, res) => {
    try {
        const equipements = await prisma.equipement.findMany();
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventaire');
        
        worksheet.columns = [
            { header: 'Code', key: 'code', width: 15 },
            { header: 'Nom', key: 'nom', width: 30 },
            { header: 'Marque', key: 'marque', width: 20 },
            { header: 'Modèle', key: 'modele', width: 20 },
            { header: 'Service', key: 'service', width: 20 },
            { header: 'Statut', key: 'statut', width: 15 }
        ];
        
        equipements.forEach(e => {
            worksheet.addRow({
                code: e.codeInventaire,
                nom: e.nom,
                marque: e.marque,
                modele: e.modele,
                service: e.service,
                statut: e.statut
            });
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=inventaire.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({ message: 'Erreur export' });
    }
});

export default router;