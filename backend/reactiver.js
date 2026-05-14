import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reactiver() {
    try {
        const technicien = await prisma.user.update({
            where: { email: 'tech.biomedical@hopital.bj' },
            data: { statut: 'ACTIF' }
        });
        console.log('✅ Technicien réactivé !');
        console.log(`📧 ${technicien.email} - Statut: ${technicien.statut}`);
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

reactiver();