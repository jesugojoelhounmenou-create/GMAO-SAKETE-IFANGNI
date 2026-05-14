import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed...');

  // Nettoyer la base (optionnel)
  // await prisma.message.deleteMany();
  // await prisma.conversation.deleteMany();
  // await prisma.alerte.deleteMany();
  // await prisma.intervention.deleteMany();
  // await prisma.signalement.deleteMany();
  // await prisma.maintenancePreventive.deleteMany();
  // await prisma.mouvementStock.deleteMany();
  // await prisma.piece.deleteMany();
  // await prisma.planningGarde.deleteMany();
  // await prisma.equipement.deleteMany();
  // await prisma.user.deleteMany();

  // 1. Créer le technicien biomédical
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const technicien = await prisma.user.upsert({
    where: { email: 'tech.biomedical@hopital.bj' },
    update: {},
    create: {
      matricule: 'TECH-001',
      nom: 'ADJOVI',
      prenom: 'Jean',
      email: 'tech.biomedical@hopital.bj',
      password: hashedPassword,
      telephone: '+229 97 12 34 56',
      service: 'AUTRE',
      role: 'TECHNICIEN',
      statut: 'ACTIF',
      dateValidation: new Date()
    }
  });
  console.log(`✅ Technicien créé: ${technicien.nom} ${technicien.prenom}`);

  // 2. Créer un soignant de test
  const soignant = await prisma.user.upsert({
    where: { email: 'infirmier.urgences@hopital.bj' },
    update: {},
    create: {
      matricule: 'SOIN-001',
      nom: 'DOSSOU',
      prenom: 'Paul',
      email: 'infirmier.urgences@hopital.bj',
      password: hashedPassword,
      telephone: '+229 98 76 54 32',
      service: 'URGENCES',
      role: 'SOIGNANT',
      statut: 'ACTIF',
      valideParId: technicien.id,
      dateValidation: new Date()
    }
  });
  console.log(`✅ Soignant créé: ${soignant.nom} ${soignant.prenom}`);

  // 3. Créer des équipements
  const equipements = [
    {
      codeInventaire: 'RES-001',
      nom: 'Respirateur Siemens Servo-i',
      marque: 'Siemens',
      modele: 'Servo-i',
      numeroSerie: 'SN-SERVO-001',
      typeMedical: 'RESPIRATION',
      criticite: 'CRITIQUE',
      service: 'BLOC_OPERATOIRE',
      batiment: 'A',
      salle: 'Bloc opératoire 2',
      etage: 1,
      latitude: 6.7367,
      longitude: 2.6586,
      dateMiseService: new Date('2023-01-15'),
      garantieFin: new Date('2025-01-15'),
      statut: 'FONCTIONNEL'
    },
    {
      codeInventaire: 'ECH-001',
      nom: 'Échographe GE Healthcare',
      marque: 'GE Healthcare',
      modele: 'Voluson S8',
      numeroSerie: 'SN-ECHO-001',
      typeMedical: 'IMAGERIE',
      criticite: 'HAUTE',
      service: 'RADIOLOGIE',
      batiment: 'A',
      salle: 'Salle échographie 1',
      etage: 0,
      latitude: 6.7360,
      longitude: 2.6580,
      dateMiseService: new Date('2024-02-10'),
      statut: 'FONCTIONNEL'
    },
    {
      codeInventaire: 'MON-001',
      nom: 'Moniteur patient Philips',
      marque: 'Philips',
      modele: 'IntelliVue MX450',
      numeroSerie: 'SN-MON-001',
      typeMedical: 'MONITORING',
      criticite: 'HAUTE',
      service: 'URGENCES',
      batiment: 'B',
      salle: 'Urgences 3',
      etage: 0,
      latitude: 6.7372,
      longitude: 2.6578,
      dateMiseService: new Date('2023-06-20'),
      statut: 'EN_PANNE'
    },
    {
      codeInventaire: 'LAB-001',
      nom: 'Analyseur biochimie',
      marque: 'Roche',
      modele: 'Cobas c311',
      numeroSerie: 'SN-LAB-001',
      typeMedical: 'LABORATOIRE',
      criticite: 'MOYENNE',
      service: 'LABORATOIRE',
      batiment: 'D',
      salle: 'Biochimie',
      etage: 0,
      dateMiseService: new Date('2022-11-05'),
      garantieFin: new Date('2024-11-05'),
      statut: 'FONCTIONNEL'
    },
    {
      codeInventaire: 'STER-001',
      nom: 'Autoclave stérilisation',
      marque: 'Tuttnauer',
      modele: '3870EA',
      numeroSerie: 'SN-STER-001',
      typeMedical: 'STERILISATION',
      criticite: 'HAUTE',
      service: 'BLOC_OPERATOIRE',
      batiment: 'A',
      salle: 'Stérilisation',
      etage: 0,
      dateMiseService: new Date('2023-09-12'),
      statut: 'EN_MAINTENANCE'
    },
    {
      codeInventaire: 'PED-001',
      nom: 'Couveuse néonatale',
      marque: 'Draeger',
      modele: 'Babyleo TN500',
      numeroSerie: 'SN-PED-001',
      typeMedical: 'REANIMATION',
      criticite: 'CRITIQUE',
      service: 'PEDIATRIE',
      batiment: 'C',
      salle: 'Néonatologie',
      etage: 1,
      dateMiseService: new Date('2024-01-20'),
      statut: 'FONCTIONNEL'
    }
  ];

  for (const eq of equipements) {
    await prisma.equipement.upsert({
      where: { codeInventaire: eq.codeInventaire },
      update: {},
      create: eq
    });
  }
  console.log(`✅ ${equipements.length} équipements créés`);

  // 4. Créer un signalement (panne en cours)
  const equipementPanne = await prisma.equipement.findUnique({
    where: { codeInventaire: 'MON-001' }
  });

  if (equipementPanne) {
    const signalement = await prisma.signalement.create({
      data: {
        equipementId: equipementPanne.id,
        signaleParId: soignant.id,
        description: 'L\'écran clignote et la mesure de saturation est inexacte. Parfois l\'alarme se déclenche sans raison.',
        priorite: 'HAUTE',
        dateSignalement: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 heures avant
        traite: false
      }
    });
    console.log(`✅ Signalement créé: #${signalement.id}`);

    // Intervention associée
    await prisma.intervention.create({
      data: {
        signalementId: signalement.id,
        equipementId: equipementPanne.id,
        type: 'CORRECTIF',
        statut: 'EN_ATTENTE',
        diagnostic: signalement.description,
        dateDebut: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    });
    console.log(`✅ Intervention créée pour le signalement`);

    // Alerte
    await prisma.alerte.create({
      data: {
        type: 'PANNE_URGENTE',
        niveau: 'ATTENTION',
        message: `Panne sur ${equipementPanne.nom} - ${signalement.description.substring(0, 100)}`,
        equipementId: equipementPanne.id,
      }
    });
  }

  // 5. Créer des pièces de rechange
  const pieces = [
    { code: 'SONDE-O2-01', designation: 'Sonde SpO2', categorie: 'SONDE', prixUnitaire: 45000, quantiteStock: 12, seuilAlerte: 5, emplacement: 'Etagère A3' },
    { code: 'CABLE-ECG-01', designation: 'Câble ECG 3 voies', categorie: 'CABLE', prixUnitaire: 25000, quantiteStock: 8, seuilAlerte: 3, emplacement: 'Etagère B2' },
    { code: 'FILTRE-AB-01', designation: 'Filtre antibactérien', categorie: 'CONSOMMABLE', prixUnitaire: 5500, quantiteStock: 45, seuilAlerte: 10, emplacement: 'Etagère C1' },
    { code: 'BATTERIE-LIT-01', designation: 'Batterie lit médicalisé', categorie: 'BATTERIE', prixUnitaire: 125000, quantiteStock: 3, seuilAlerte: 2, emplacement: 'Etagère A5' },
    { code: 'CAPTEUR-PR-01', designation: 'Capteur de pression', categorie: 'CAPTEUR', prixUnitaire: 89000, quantiteStock: 5, seuilAlerte: 2, emplacement: 'Etagère B4' },
    { code: 'CARTE-MERE-01', designation: 'Carte mère respirateur', categorie: 'CARTE_MERE', prixUnitaire: 450000, quantiteStock: 1, seuilAlerte: 1, emplacement: 'Armoire sécurisée' },
    { code: 'VENTIL-01', designation: 'Ventilateur de refroidissement', categorie: 'ELECTRONIQUE', prixUnitaire: 32000, quantiteStock: 4, seuilAlerte: 2, emplacement: 'Etagère D2' },
    { code: 'ECRAN-LCD-01', designation: 'Écran LCD 7 pouces', categorie: 'ELECTRONIQUE', prixUnitaire: 185000, quantiteStock: 2, seuilAlerte: 1, emplacement: 'Etagère D4' }
  ];

  for (const piece of pieces) {
    await prisma.piece.upsert({
      where: { code: piece.code },
      update: {},
      create: piece
    });
  }
  console.log(`✅ ${pieces.length} pièces créées`);

  // 6. Créer des maintenances préventives
  const respirateur = await prisma.equipement.findUnique({
    where: { codeInventaire: 'RES-001' }
  });
  const echographe = await prisma.equipement.findUnique({
    where: { codeInventaire: 'ECH-001' }
  });

  if (respirateur) {
    await prisma.maintenancePreventive.create({
      data: {
        equipementId: respirateur.id,
        type: 'MENSUELLE',
        periodicite: 30,
        prochaineRealisation: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        checklist: {
          "verifications": [
            "Vérifier les alarmes",
            "Tester les capteurs O2",
            "Nettoyer les filtres",
            "Vérifier la batterie de secours",
            "Calibrer les capteurs de pression"
          ]
        },
        instructions: "Suivre la procédure standard de maintenance respirateur Siemens Servo-i",
        statut: 'PREVU'
      }
    });
    console.log(`✅ Maintenance préventive respirateur planifiée`);
  }

  if (echographe) {
    await prisma.maintenancePreventive.create({
      data: {
        equipementId: echographe.id,
        type: 'TRIMESTRIELLE',
        periodicite: 90,
        prochaineRealisation: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        checklist: {
          "verifications": [
            "Nettoyer la sonde",
            "Vérifier l'usure du câble",
            "Calibrer l'image",
            "Tester les différents modes",
            "Mettre à jour le logiciel"
          ]
        },
        instructions: "Maintenance trimestrielle échographe GE Voluson S8",
        statut: 'PREVU'
      }
    });
    console.log(`✅ Maintenance préventive échographe planifiée`);
  }

  // 7. Créer un planning de garde
  const planningDates = [
    { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), type: 'JOUR' },
    { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), type: 'JOUR' },
    { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), type: 'NUIT' },
    { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), type: 'ASTREINTE' },
    { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), type: 'JOUR' },
  ];

  for (const plan of planningDates) {
    await prisma.planningGarde.create({
      data: {
        technicienId: technicien.id,
        date: plan.date,
        typeGarde: plan.type,
        heureDebut: plan.type === 'NUIT' ? '20:00' : '08:00',
        heureFin: plan.type === 'NUIT' ? '08:00' : '17:00',
        valide: true
      }
    });
  }
  console.log(`✅ ${planningDates.length} gardes planifiées`);

  // 8. Créer des configurations par défaut
  const configs = [
    { cle: 'SITE_NAME', valeur: 'Hôpital Zone Sakété-Ifangni', type: 'STRING', description: 'Nom du site' },
    { cle: 'SITE_LAT', valeur: '6.7367', type: 'STRING', description: 'Latitude GPS' },
    { cle: 'SITE_LNG', valeur: '2.6586', type: 'STRING', description: 'Longitude GPS' },
    { cle: 'ALERTE_EMAIL', valeur: 'true', type: 'BOOLEAN', description: 'Activer alertes email' },
    { cle: 'ALERTE_SMS', valeur: 'false', type: 'BOOLEAN', description: 'Activer alertes SMS' },
    { cle: 'MAINTENANCE_HOURS', valeur: '48', type: 'INT', description: 'Délai SLA maintenance (heures)' },
  ];

  for (const config of configs) {
    await prisma.configuration.upsert({
      where: { cle: config.cle },
      update: {},
      create: config
    });
  }
  console.log(`✅ ${configs.length} configurations créées`);

  console.log('\n🌱 Seed terminé avec succès !');
  console.log('\n📝 Identifiants de test:');
  console.log('   Technicien: tech.biomedical@hopital.bj / admin123');
  console.log('   Soignant: infirmier.urgences@hopital.bj / admin123');
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });