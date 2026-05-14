import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 Nouveau client connecté:', socket.id);

    socket.on('join-room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`📱 Utilisateur ${userId} a rejoint sa room`);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Client déconnecté:', socket.id);
    });
  });

  return io;
};

export const sendNotification = (userId, data) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', data);
  }
};