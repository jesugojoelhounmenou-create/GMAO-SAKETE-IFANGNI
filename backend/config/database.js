// backend/config/database.js
import { PrismaClient } from '@prisma/client';

// ============================================
// CONFIGURATION PRISMA
// ============================================

const getLogOptions = () => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
        case 'development':
            return ['query', 'info', 'warn', 'error'];
        case 'test':
            return ['error'];
        case 'production':
            return ['error', 'warn'];
        default:
            return ['error'];
    }
};

const prisma = new PrismaClient({
    log: getLogOptions(),
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal'
});

// ============================================
// GESTION DES CONNEXIONS
// ============================================

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) {
        console.log('Base de donnees deja connectee');
        return true;
    }

    try {
        await prisma.$connect();
        isConnected = true;
        console.log('Base de donnees connectee avec succes');
        return true;
    } catch (error) {
        console.error('Erreur de connexion a la base de donnees:', error.message);
        return false;
    }
};

export const disconnectDB = async () => {
    if (!isConnected) return;

    try {
        await prisma.$disconnect();
        isConnected = false;
        console.log('Base de donnees deconnectee');
    } catch (error) {
        console.error('Erreur lors de la deconnexion:', error.message);
    }
};

export const isDatabaseConnected = () => isConnected;

export const testConnection = async () => {
    try {
        await prisma.$queryRaw`SELECT 1 as connected`;
        return {
            success: true,
            message: 'Connexion a la base de donnees etablie',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

export const ensureDatabaseConnection = async (req, res, next) => {
    if (!isConnected) {
        const connected = await connectDB();
        if (!connected) {
            return res.status(503).json({
                success: false,
                error: 'Service de base de donnees temporairement indisponible'
            });
        }
    }
    next();
};

export const runTransaction = async (callback) => {
    try {
        return await prisma.$transaction(async (tx) => {
            return await callback(tx);
        });
    } catch (error) {
        console.error('Erreur de transaction:', error);
        throw error;
    }
};

export const getDatabaseHealth = async () => {
    try {
        const startTime = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        return {
            status: 'healthy',
            connected: isConnected,
            latency: `${latency}ms`,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

export const paginate = async (model, options = {}) => {
    const {
        page = 1,
        limit = 10,
        where = {},
        orderBy = { id: 'desc' },
        include = {},
        select = null
    } = options;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
        model.findMany({
            where,
            skip,
            take,
            orderBy,
            include,
            ...(select && { select })
        }),
        model.count({ where })
    ]);

    return {
        data,
        pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
            hasNext: page * take < total,
            hasPrev: page > 1
        }
    };
};

export const findOrFail = async (model, where, errorMessage = 'Ressource non trouvee') => {
    const record = await model.findUnique({ where });
    if (!record) {
        const error = new Error(errorMessage);
        error.status = 404;
        throw error;
    }
    return record;
};

export const upsertRecord = async (model, where, createData, updateData) => {
    return model.upsert({
        where,
        create: createData,
        update: updateData
    });
};

if (process.env.NODE_ENV !== 'test') {
    connectDB().catch(console.error);
}

process.on('beforeExit', async () => {
    await disconnectDB();
});

process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
});

export default prisma;
