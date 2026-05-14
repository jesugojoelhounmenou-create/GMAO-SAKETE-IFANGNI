// This file ensures Prisma knows exactly where to look for your schema and DB URL
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Chemin vers ton schéma (Module 1 : Inventaire)
  schema: "prisma/schema.prisma",
  
  // Localisation des migrations (Historique de structure)
  migrations: {
    path: "prisma/migrations",
  },
  
  // Utilisation de la variable d'environnement définie dans ton .env
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});