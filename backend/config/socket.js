// backend/config/socket.js - Configuration Socket.IO pour GMAO Sakété

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;
let connectedClients = new Map();

// ============================================
// AUTHENTIFICATION PAR TOKEN
// ============================================

const authenticateSocket = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gmao-secret-key');
        return decoded;
    } catch (error) {
        console.error('Erreur authentification socket:', error.message);
        return null;
    }
};

// ============================================
// INITIALISATION DU SERVEUR SOCKET
// ============================================

export const initSocket = (server, options = {}) => {
    const defaultOptions = {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    };

    io = new Server(server, { ...defaultOptions, ...options });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            socket.isGuest = true;
            return next();
        }

        const user = authenticateSocket(token);
        if (!user) {
            return next(new Error('Authentication error'));
        }

        socket.user = user;
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
    });

    io.on('connection', (socket) => {
        const userId = socket.userId || 'guest';
        const userRole = socket.userRole || 'guest';
        
        console.log('Client connecte:', socket.id, '(Utilisateur:', userId, ', Role:', userRole, ')');
        
        connectedClients.set(socket.id, {
            id: socket.id,
            userId,
            userRole,
            connectedAt: new Date()
        });

        if (userId !== 'guest') {
            socket.join(`user_${userId}`);
            socket.join(`role_${userRole}`);
            console.log('Utilisateur', userId, 'a rejoint les rooms: user_', userId, ', role_', userRole);
        }

        socket.on('join-room', (roomName) => {
            if (roomName) {
                socket.join(roomName);
                console.log('Socket', socket.id, 'a rejoint la room:', roomName);
                socket.emit('room-joined', { room: roomName });
            }
        });

        socket.on('leave-room', (roomName) => {
            if (roomName) {
                socket.leave(roomName);
                console.log('Socket', socket.id, 'a quitte la room:', roomName);
            }
        });

        socket.on('intervention:start', (data) => {
            console.log('Intervention commencee par', userId, ':', data);
            socket.to('role_TECHNICIEN').emit('intervention:updated', {
                ...data,
                action: 'started',
                startedBy: userId
            });
        });

        socket.on('intervention:complete', (data) => {
            console.log('Intervention terminee par', userId, ':', data);
            if (data.soignantId) {
                io.to(`user_${data.soignantId}`).emit('intervention:completed', data);
            }
            io.to('role_TECHNICIEN').emit('intervention:updated', {
                ...data,
                action: 'completed'
            });
        });

        socket.on('signalement:new', (data) => {
            console.log('Nouveau signalement de', userId, ':', data);
            io.to('role_TECHNICIEN').emit('signalement:received', data);
        });

        socket.on('alert:new', (data) => {
            console.log('Nouvelle alerte:', data);
            
            if (data.criticite === 'CRITIQUE') {
                io.to('role_TECHNICIEN').emit('alert:critical', data);
            } else {
                io.to('role_TECHNICIEN').emit('alert:new', data);
            }
        });

        socket.on('stock:low', (data) => {
            console.log('Stock faible:', data);
            io.to('role_TECHNICIEN').emit('stock:alert', data);
        });

        socket.on('message:private', ({ toUserId, message, type = 'text' }) => {
            console.log('Message prive de', userId, 'a', toUserId);
            io.to(`user_${toUserId}`).emit('message:received', {
                from: userId,
                message,
                type,
                timestamp: new Date()
            });
        });

        socket.on('message:room', ({ room, message }) => {
            console.log('Message dans la room', room, 'de', userId);
            socket.to(room).emit('message:room', {
                from: userId,
                message,
                timestamp: new Date()
            });
        });

        socket.on('typing:start', ({ toUserId }) => {
            if (toUserId) {
                io.to(`user_${toUserId}`).emit('typing:start', { from: userId });
            }
        });

        socket.on('typing:stop', ({ toUserId }) => {
            if (toUserId) {
                io.to(`user_${toUserId}`).emit('typing:stop', { from: userId });
            }
        });

        socket.on('ping', (callback) => {
            const start = Date.now();
            if (typeof callback === 'function') {
                callback({ latency: Date.now() - start });
            } else {
                socket.emit('pong', { latency: Date.now() - start });
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Client deconnecte:', socket.id, '(Raison:', reason, ')');
            connectedClients.delete(socket.id);
        });

        socket.on('error', (error) => {
            console.error('Erreur socket', socket.id, ':', error);
        });
    });

    console.log('Serveur Socket.IO initialise');
    return io;
};

// ============================================
// FONCTIONS D'ENVOI DE NOTIFICATIONS
// ============================================

export const sendNotification = (userId, data) => {
    if (!io) {
        console.warn('Socket.IO non initialise');
        return false;
    }

    const room = `user_${userId}`;
    const notificationData = {
        ...data,
        timestamp: new Date(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    io.to(room).emit('notification', notificationData);
    console.log('Notification envoyee a l\'utilisateur', userId);
    return true;
};

export const sendNotificationToRole = (role, data) => {
    if (!io) {
        console.warn('Socket.IO non initialise');
        return false;
    }

    const room = `role_${role}`;
    const notificationData = {
        ...data,
        timestamp: new Date(),
        role: role,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    io.to(room).emit('notification', notificationData);
    console.log('Notification envoyee au role', role);
    return true;
};

export const sendBroadcast = (data) => {
    if (!io) {
        console.warn('Socket.IO non initialise');
        return false;
    }

    const broadcastData = {
        ...data,
        timestamp: new Date(),
        broadcast: true
    };

    io.emit('broadcast', broadcastData);
    console.log('Broadcast envoye a tous les clients');
    return true;
};

// ============================================
// NOTIFICATIONS SPECIFIQUES
// ============================================

export const notifyNewIntervention = (intervention, techniciens) => {
    const notificationData = {
        type: 'NEW_INTERVENTION',
        title: 'Nouvelle intervention',
        body: `${intervention.equipement?.nom} - ${intervention.signalement?.priorite || 'Panne'}`,
        data: intervention,
        action: 'view_intervention',
        actionId: intervention.id
    };

    sendNotificationToRole('TECHNICIEN', notificationData);
};

export const notifyInterventionCompleted = (intervention, soignant) => {
    const notificationData = {
        type: 'INTERVENTION_COMPLETED',
        title: 'Panne resolue',
        body: `L'equipement ${intervention.equipement?.nom} est a nouveau fonctionnel`,
        data: intervention,
        action: 'view_historique'
    };

    sendNotification(soignant.id, notificationData);
};

export const notifyNewAlert = (alerte) => {
    const notificationData = {
        type: 'NEW_ALERT',
        title: alerte.niveau === 'CRITIQUE' ? 'Alerte critique' : 'Nouvelle alerte',
        body: alerte.message,
        data: alerte,
        action: 'view_alert',
        actionId: alerte.id
    };

    sendNotificationToRole('TECHNICIEN', notificationData);
};

export const notifyLowStock = (piece) => {
    const notificationData = {
        type: 'LOW_STOCK',
        title: 'Stock faible',
        body: `La piece ${piece.designation} n'a plus que ${piece.quantiteStock} unites`,
        data: piece,
        action: 'view_stock'
    };

    sendNotificationToRole('TECHNICIEN', notificationData);
};

// ============================================
// UTILITAIRES
// ============================================

export const getConnectedClientsCount = () => {
    return connectedClients.size;
};

export const getConnectedClients = () => {
    return Array.from(connectedClients.values());
};

export const isUserOnline = (userId) => {
    for (const client of connectedClients.values()) {
        if (client.userId === userId) {
            return true;
        }
    }
    return false;
};

export const disconnectClient = (socketId) => {
    const socket = io?.sockets?.sockets?.get(socketId);
    if (socket) {
        socket.disconnect();
        console.log('Client', socketId, 'deconnecte manuellement');
    }
};

export const closeSocket = async () => {
    if (io) {
        await io.close();
        io = null;
        connectedClients.clear();
        console.log('Serveur Socket.IO ferme');
    }
};

export default {
    initSocket,
    sendNotification,
    sendNotificationToRole,
    sendBroadcast,
    notifyNewIntervention,
    notifyInterventionCompleted,
    notifyNewAlert,
    notifyLowStock,
    getConnectedClientsCount,
    getConnectedClients,
    isUserOnline,
    disconnectClient,
    closeSocket
};
