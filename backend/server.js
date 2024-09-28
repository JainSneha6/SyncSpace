const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('create-room', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set([socket.id]));
      socket.join(roomId);
      socket.emit('room-created', roomId);
    } else {
      socket.emit('room-exists');
    }
  });

  socket.on('join-room', (roomId) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).add(socket.id);
      socket.join(roomId);
      socket.emit('room-joined', roomId);
      socket.to(roomId).emit('user-joined', socket.id);
    } else {
      socket.emit('room-not-found');
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((participants, roomId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        if (participants.size === 0) {
          rooms.delete(roomId);
        } else {
          socket.to(roomId).emit('user-left', socket.id);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));