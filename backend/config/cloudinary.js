// config/cloudinary.js - Configuration Cloudinary pour GMAO Sakété

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('Variables d\'environnement Cloudinary manquantes:', missingEnvVars.join(', '));
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`Cloudinary configuration missing: ${missingEnvVars.join(', ')}`);
    }
}

// ============================================
// CONFIGURATION CLOUDINARY
// ============================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 60000
});

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

export const isCloudinaryConfigured = () => {
    return !!(process.env.CLOUDINARY_CLOUD_NAME &&
              process.env.CLOUDINARY_API_KEY &&
              process.env.CLOUDINARY_API_SECRET);
};

export const uploadToCloudinary = async (file, options = {}) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary non configure');
    }

    const defaultOptions = {
        folder: 'gmao-sakete',
        resource_type: 'auto',
        quality: 'auto:good',
        secure: true
    };

    const uploadOptions = { ...defaultOptions, ...options };

    try {
        const result = await cloudinary.uploader.upload(file, uploadOptions);
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
            createdAt: result.created_at
        };
    } catch (error) {
        console.error('Erreur upload Cloudinary:', error);
        throw new Error(`Upload echoue: ${error.message}`);
    }
};

export const uploadFromUrl = async (url, options = {}) => {
    return uploadToCloudinary(url, options);
};

export const uploadFromBase64 = async (base64String, options = {}) => {
    return uploadToCloudinary(base64String, options);
};

export const deleteFromCloudinary = async (publicId) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary non configure');
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Erreur suppression Cloudinary:', error);
        throw new Error(`Suppression echouee: ${error.message}`);
    }
};

export const getOptimizedUrl = (publicId, transformations = {}) => {
    if (!publicId) return null;

    const defaultTransformations = {
        quality: 'auto',
        fetch_format: 'auto',
        crop: 'limit'
    };

    const finalTransforms = { ...defaultTransformations, ...transformations };

    return cloudinary.url(publicId, {
        secure: true,
        ...finalTransforms
    });
};

export const generateQrCodeUrl = async (data) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary non configure');
    }

    try {
        const result = await cloudinary.uploader.upload(data, {
            folder: 'gmao-sakete/qrcodes',
            resource_type: 'auto',
            transformation: [
                { width: 300, height: 300, crop: 'limit' },
                { quality: 'auto' }
            ]
        });
        return result.secure_url;
    } catch (error) {
        console.error('Erreur generation QR code:', error);
        throw new Error(`Generation QR code echouee: ${error.message}`);
    }
};

export const uploadDocument = async (fileBuffer, originalName, options = {}) => {
    const defaultOptions = {
        folder: 'gmao-sakete/documents',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: originalName
    };

    return uploadToCloudinary(fileBuffer, { ...defaultOptions, ...options });
};

export const uploadEquipmentImage = async (fileBuffer, equipementId) => {
    const options = {
        folder: `gmao-sakete/equipements/${equipementId}`,
        transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto:good' }
        ]
    };
    return uploadToCloudinary(fileBuffer, options);
};

export const uploadInterventionPhoto = async (fileBuffer, interventionId) => {
    const options = {
        folder: `gmao-sakete/interventions/${interventionId}`,
        transformation: [
            { width: 1200, height: 900, crop: 'limit' },
            { quality: 'auto:good' }
        ]
    };
    return uploadToCloudinary(fileBuffer, options);
};

export const getCloudinaryStats = async () => {
    if (!isCloudinaryConfigured()) {
        return { configured: false };
    }

    try {
        const usage = await cloudinary.api.usage();
        return {
            configured: true,
            usage: {
                storage: usage.storage,
                bandwidth: usage.bandwidth,
                requests: usage.requests,
                resources: usage.resources
            }
        };
    } catch (error) {
        console.error('Erreur recuperation stats Cloudinary:', error);
        return {
            configured: true,
            error: error.message
        };
    }
};

export const generateUploadSignature = (options = {}) => {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
        timestamp,
        folder: 'gmao-sakete',
        ...options
    };

    const signature = cloudinary.utils.api_sign_request(
        params,
        process.env.CLOUDINARY_API_SECRET
    );

    return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
    };
};

export const checkCloudinaryConfig = (req, res, next) => {
    if (!isCloudinaryConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'Service de stockage temporairement indisponible'
        });
    }
    next();
};

if (isCloudinaryConfigured()) {
    console.log('Cloudinary configure avec succes');
    console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
    console.warn('Cloudinary non configure - les fonctionnalites de stockage seront limitees');
}

export default cloudinary;
