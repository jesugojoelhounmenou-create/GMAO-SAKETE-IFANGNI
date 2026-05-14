-- CreateTable
CREATE TABLE "TechnicienDepart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicienId" INTEGER NOT NULL,
    "dateDepart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nouveauHopital" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "archiveInterventions" BOOLEAN NOT NULL DEFAULT true,
    "rapport" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicienDepart_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
