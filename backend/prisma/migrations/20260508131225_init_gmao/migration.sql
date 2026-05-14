/*
  Warnings:

  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `qrCode` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `cout` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `piece` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `motDePasse` on the `User` table. All the data in the column will be lost.
  - Added the required column `marque` to the `Equipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `article` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastUpdate` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prixUnitaire` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Document";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT,
    "codeInventaire" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'FONCTIONNEL',
    "dateAcquisition" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Equipment" ("codeInventaire", "id", "nom", "service", "statut") SELECT "codeInventaire", "id", "nom", "service", "statut" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE UNIQUE INDEX "Equipment_codeInventaire_key" ON "Equipment"("codeInventaire");
CREATE TABLE "new_Intervention" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" DATETIME,
    "description" TEXT NOT NULL,
    "causeRacine" TEXT,
    "coutTotal" REAL,
    "technicien" TEXT NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    CONSTRAINT "Intervention_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Intervention" ("description", "equipmentId", "id", "technicien", "type") SELECT "description", "equipmentId", "id", "technicien", "type" FROM "Intervention";
DROP TABLE "Intervention";
ALTER TABLE "new_Intervention" RENAME TO "Intervention";
CREATE TABLE "new_Stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 5,
    "prixUnitaire" REAL NOT NULL,
    "emplacement" TEXT,
    "lastUpdate" DATETIME NOT NULL
);
INSERT INTO "new_Stock" ("id", "quantite", "seuilAlerte") SELECT "id", "quantite", "seuilAlerte" FROM "Stock";
DROP TABLE "Stock";
ALTER TABLE "new_Stock" RENAME TO "Stock";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("id", "nom", "role") SELECT "id", "nom", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
