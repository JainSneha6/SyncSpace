const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Middleware for CORS
app.use(
  cors({
    origin: 'http://localhost:3000', // React frontend URL
    methods: ['GET', 'POST'],
  })
);

// Set up Socket.io server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// In-memory storage for drawing data per room
const roomDrawings = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle joining a room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Send existing drawing data to the new participant
    if (roomDrawings[roomId]) {
      socket.emit('loadDrawing', roomDrawings[roomId]);
    } else {
      roomDrawings[roomId] = []; // Initialize room if not already existing
    }

    // Notify others in the room about the new user (for WebRTC)
    socket.to(roomId).emit('user-connected', socket.id);
  });

  // WebRTC signaling for peer-to-peer video connections
  socket.on('signal', ({ roomId, signalData, to }) => {
    socket.to(to).emit('signal', {
      signalData,
      from: socket.id,
    });
  });

  // Handle when a user disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    io.emit('user-disconnected', socket.id);
  });

  // Handle drawing actions and save them to the room's data
  socket.on('drawing', ({ roomId, offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
    if (!roomDrawings[roomId]) roomDrawings[roomId] = [];

    // Save the drawing data
    roomDrawings[roomId].push({ offsetX, offsetY, prevX, prevY, color, brushWidth });

    // Broadcast drawing data to other users in the room
    socket.to(roomId).emit('drawing', { offsetX, offsetY, prevX, prevY, color, brushWidth });
  });

  // Handle clear board event
  socket.on('clearBoard', (roomId) => {
    // Clear the room drawings in memory
    roomDrawings[roomId] = [];
    // Broadcast clear board event to all users in the room
    socket.to(roomId).emit('clearBoard');
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
