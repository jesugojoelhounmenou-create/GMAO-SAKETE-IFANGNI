// This file ensures Prisma knows exactly where to look for your schema and DB URL
import 'dotenv/config';

export default {
  schema: './prisma/schema.prisma',
  migrationsPath: './prisma/migrations'
};