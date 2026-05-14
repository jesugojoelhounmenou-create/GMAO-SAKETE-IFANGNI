import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CONFIGURATION CORS ============
const corsOptions = {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dossiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/qrcodes', express.static(path.join(__dirname, 'uploads/qrcodes')));

// Créer les dossiers uploads
const uploadDirs = ['uploads', 'uploads/photos', 'uploads/documents', 'uploads/qrcodes', 'uploads/rapports'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// ============ IMPORTS ROUTES ============
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import equipmentRoutes from './routes/equipements.js';
import maintenanceRoutes from './routes/maintenances.js';
import preventiveRoutes from './routes/preventive.js';
import stockRoutes from './routes/stocks.js';
import chatbotRoutes from './routes/chatbot.js';
import diagnosticRoutes from './routes/diagnostic.js';
import codirRoutes from './routes/codir.js';
import planningRoutes from './routes/planning.js';
import dashboardRoutes from './routes/dashboard.js';
import mobileRoutes from './routes/mobile.js';
import alerteRoutes from './routes/alertes.js';
import fournisseurRoutes from './routes/fournisseurs.js';
import technicienRoutes from './routes/techniciens.js';

// ============ ROUTES API ============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipements', equipmentRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/preventif', preventiveRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/codir', codirRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/alertes', alerteRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/techniciens', technicienRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(), 
    uptime: process.uptime(),
    cors: 'enabled'
  });
});

// Servir le frontend
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'API GMAO Sakété-Ifangni est en ligne' });
  });
}

// Gestion erreurs 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
});