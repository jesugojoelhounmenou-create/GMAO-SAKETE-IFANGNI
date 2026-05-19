import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Générer QR code en Base64
export const generateQRCodeBase64 = async (data) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    const qrBase64 = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300
    });
    return qrBase64;
  } catch (error) {
    console.error('Erreur génération QR:', error);
    throw error;
  }
};

// Générer QR code et sauvegarder en fichier
export const generateQRCodeFile = async (data, filename) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    const outputPath = path.join(__dirname, '../uploads/qrcodes/', filename);
    
    await QRCode.toFile(outputPath, qrData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300
    });
    
    return `/uploads/qrcodes/${filename}`;
  } catch (error) {
    console.error('Erreur sauvegarde QR:', error);
    throw error;
  }
};

// Générer QR code pour un équipement
export const generateEquipmentQR = async (equipment) => {
  const qrContent = {
    id: equipment.id,
    code: equipment.codeInventaire,
    nom: equipment.nom,
    marque: equipment.marque,
    modele: equipment.modele,
    service: equipment.service,
    url: `/equipement/${equipment.id}`
  };
  
  return generateQRCodeBase64(qrContent);
};