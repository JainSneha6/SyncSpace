const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join room', (roomID) => {
    if (rooms.has(roomID)) {
      rooms.get(roomID).push(socket.id);
    } else {
      rooms.set(roomID, [socket.id]);
    }
    const otherUsers = rooms.get(roomID).filter(id => id !== socket.id);
    socket.emit('all users', otherUsers);
  });

  socket.on('sending signal', payload => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on('returning signal', payload => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
  });

  socket.on('disconnect', () => {
    rooms.forEach((value, key) => {
      if (value.includes(socket.id)) {
        rooms.set(key, value.filter(id => id !== socket.id));
        if (rooms.get(key).length === 0) {
          rooms.delete(key);
        }
      }
    });
    socket.broadcast.emit('user left', socket.id);
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));