/*
  Warnings:

  - You are about to drop the `Equipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Stock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `causeRacine` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `coutTotal` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `equipmentId` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `technicien` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - Added the required column `equipementId` to the `Intervention` table without a default value. This is not possible if the table is not empty.
  - Added the required column `technicienId` to the `Intervention` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Intervention` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matricule` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Equipment_codeInventaire_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Equipment";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Stock";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Equipement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeInventaire" TEXT NOT NULL,
    "codeBarres" TEXT,
    "nom" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "numeroSerie" TEXT,
    "fabricant" TEXT,
    "paysFabrication" TEXT,
    "anneeFabrication" INTEGER,
    "typeMedical" TEXT NOT NULL,
    "criticite" TEXT NOT NULL,
    "classeRisque" TEXT,
    "famille" TEXT,
    "service" TEXT NOT NULL,
    "batiment" TEXT,
    "salle" TEXT,
    "etage" INTEGER,
    "emplacementPrecis" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "tension" TEXT,
    "puissance" TEXT,
    "frequence" TEXT,
    "consommation" TEXT,
    "dimensions" TEXT,
    "poids" REAL,
    "specifications" TEXT,
    "manuelUtilisateur" TEXT,
    "manuelTechnique" TEXT,
    "schemaElectrique" TEXT,
    "certificatConformite" TEXT,
    "photoPrincipale" TEXT,
    "fournisseurId" INTEGER,
    "dateAcquisition" DATETIME,
    "dateMiseService" DATETIME,
    "garantieFin" DATETIME,
    "contratMaintenanceId" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'FONCTIONNEL',
    "disponibilite" REAL,
    "dateDernierePanne" DATETIME,
    "dateProchainePreventive" DATETIME,
    "mtbf" REAL,
    "mttr" REAL,
    "nombrePannes" INTEGER NOT NULL DEFAULT 0,
    "coutMaintenanceTotal" REAL NOT NULL DEFAULT 0,
    "qrcode" TEXT,
    "qrcodeUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipement_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipement_contratMaintenanceId_fkey" FOREIGN KEY ("contratMaintenanceId") REFERENCES "ContratMaintenance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signalement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipementId" INTEGER NOT NULL,
    "signaleParId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priorite" TEXT NOT NULL DEFAULT 'MOYENNE',
    "photo" TEXT,
    "dateSignalement" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite" BOOLEAN NOT NULL DEFAULT false,
    "dateTraitement" DATETIME,
    "conversationId" INTEGER,
    CONSTRAINT "Signalement_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Signalement_signaleParId_fkey" FOREIGN KEY ("signaleParId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Signalement_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenancePreventive" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipementId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MENSUELLE',
    "periodicite" INTEGER NOT NULL,
    "derniereRealisation" DATETIME,
    "prochaineRealisation" DATETIME NOT NULL,
    "checklist" TEXT,
    "instructions" TEXT,
    "dureePrevue" INTEGER,
    "responsableId" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'PREVU',
    "dateRealisation" DATETIME,
    "rapport" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenancePreventive_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenancePreventive_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Piece" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT,
    "fournisseurId" INTEGER,
    "prixUnitaire" REAL NOT NULL DEFAULT 0,
    "quantiteStock" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 5,
    "emplacement" TEXT,
    "delaiLivraison" INTEGER,
    "compatibleAvec" TEXT,
    "derniereEntree" DATETIME,
    "derniereSortie" DATETIME,
    "quantiteUtiliseeTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Piece_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PieceUtilisee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pieceId" INTEGER NOT NULL,
    "equipementId" INTEGER NOT NULL,
    "interventionId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" REAL NOT NULL,
    "dateUtilisation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PieceUtilisee_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PieceUtilisee_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PieceUtilisee_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pieceId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" REAL,
    "interventionId" INTEGER,
    "commandeId" INTEGER,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    CONSTRAINT "MouvementStock_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MouvementStock_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "siteWeb" TEXT,
    "type" TEXT NOT NULL DEFAULT 'EQUIPEMENT',
    "note" REAL,
    "delaiMoyen" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ContratMaintenance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fournisseurId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "numeroContrat" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "montant" REAL NOT NULL,
    "couverture" TEXT,
    "conditions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContratMaintenance_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanningGarde" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicienId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "typeGarde" TEXT NOT NULL,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "observateur" TEXT,
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanningGarde_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "equipementId" INTEGER,
    "interventionId" INTEGER,
    "pieceId" INTEGER,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateResolution" DATETIME,
    "resolueParId" INTEGER,
    "commentaire" TEXT,
    "resolue" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Alerte_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alerte_resolueParId_fkey" FOREIGN KEY ("resolueParId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utilisateurId" INTEGER NOT NULL,
    "equipementId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'SIMPLE',
    "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" DATETIME,
    CONSTRAINT "Conversation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" INTEGER NOT NULL,
    "auteur" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "typeMessage" TEXT,
    "donnees" TEXT,
    "dateEnvoi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RapportCoDIR" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mois" DATETIME NOT NULL,
    "dateGeneration" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "genereParId" INTEGER NOT NULL,
    "indicateurs" TEXT NOT NULL,
    "resume" TEXT,
    "graphiquePdf" TEXT,
    "excelUrl" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'PROVISOIRE',
    "valideParId" INTEGER,
    "dateValidation" DATETIME,
    CONSTRAINT "RapportCoDIR_genereParId_fkey" FOREIGN KEY ("genereParId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RapportCoDIR_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "equipementId" INTEGER,
    "interventionId" INTEGER,
    "taille" INTEGER,
    "tags" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dateUpload" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utilisateurId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT,
    "entiteId" INTEGER,
    "details" TEXT,
    "adresseIp" TEXT,
    "userAgent" TEXT,
    "dateAction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatistiqueJournaliere" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "totalEquipements" INTEGER NOT NULL,
    "equipementsFonctionnels" INTEGER NOT NULL,
    "equipementsPanne" INTEGER NOT NULL,
    "equipementsMaintenance" INTEGER NOT NULL,
    "nvxSignalements" INTEGER NOT NULL,
    "interventionsRealisees" INTEGER NOT NULL,
    "interventionsEnCours" INTEGER NOT NULL,
    "tempsMoyenIntervention" INTEGER NOT NULL,
    "tauxDisponibilite" REAL NOT NULL,
    "piecesUtilisees" INTEGER NOT NULL,
    "coutMaintenanceJour" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Intervention" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "signalementId" INTEGER,
    "equipementId" INTEGER NOT NULL,
    "technicienId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CORRECTIF',
    "diagnostic" TEXT,
    "actionsRealisees" TEXT,
    "rapportFinal" TEXT,
    "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" DATETIME,
    "dureeMinutes" INTEGER,
    "tempsReponseMinutes" INTEGER,
    "piecesUtilisees" TEXT,
    "coutPieces" REAL,
    "coutMainOeuvre" REAL,
    "photosAvant" TEXT,
    "photosApres" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "satisfaction" INTEGER,
    "commentaireSoignant" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Intervention_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Intervention_signalementId_fkey" FOREIGN KEY ("signalementId") REFERENCES "Signalement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Intervention" ("dateDebut", "dateFin", "id", "type") SELECT "dateDebut", "dateFin", "id", "type" FROM "Intervention";
DROP TABLE "Intervention";
ALTER TABLE "new_Intervention" RENAME TO "Intervention";
CREATE UNIQUE INDEX "Intervention_signalementId_key" ON "Intervention"("signalementId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telephone" TEXT,
    "service" TEXT,
    "role" TEXT NOT NULL DEFAULT 'SOIGNANT',
    "photo" TEXT,
    "specialite" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "valideParId" INTEGER,
    "dateValidation" DATETIME,
    "derniereLatitude" REAL,
    "derniereLongitude" REAL,
    "dernierePositionAt" DATETIME,
    "pushToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dernierConnexion" DATETIME,
    CONSTRAINT "User_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "id", "nom", "password", "role") SELECT "createdAt", "id", "nom", "password", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_matricule_key" ON "User"("matricule");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Equipement_codeInventaire_key" ON "Equipement"("codeInventaire");

-- CreateIndex
CREATE UNIQUE INDEX "Equipement_codeBarres_key" ON "Equipement"("codeBarres");

-- CreateIndex
CREATE UNIQUE INDEX "Equipement_numeroSerie_key" ON "Equipement"("numeroSerie");

-- CreateIndex
CREATE UNIQUE INDEX "Piece_code_key" ON "Piece"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ContratMaintenance_numeroContrat_key" ON "ContratMaintenance"("numeroContrat");

-- CreateIndex
CREATE UNIQUE INDEX "StatistiqueJournaliere_date_key" ON "StatistiqueJournaliere"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_cle_key" ON "Configuration"("cle");
