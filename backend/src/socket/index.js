import { Server } from 'socket.io';

let ioInstance = null;

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-job', ({ jobId }) => {
      if (jobId) {
        socket.join(jobId);
        console.log(`Socket ${socket.id} joined room/jobId: ${jobId}`);
        socket.emit('joined', { jobId, status: 'listening' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketIO = () => {
  return ioInstance;
};

export const emitJobEvent = (jobId, event, payload) => {
  if (!ioInstance) {
    console.warn(`Attempted to emit socket event ${event} but Socket.io is not initialized.`);
    return;
  }
  
  const formattedPayload = {
    timestamp: new Date().toISOString(),
    ...payload
  };

  ioInstance.to(jobId).emit(event, formattedPayload);
};
