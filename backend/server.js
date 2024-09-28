const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST'],
  },
});

const roomDrawings = {}; // Store drawings for each room

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    // Load existing drawings for the room
    if (roomDrawings[roomId]) {
      socket.emit('loadDrawing', roomDrawings[roomId]);
    }
  });

  socket.on('drawing', ({ roomId, offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
    if (!roomDrawings[roomId]) {
      roomDrawings[roomId] = [];
    }

    // Store the drawing data
    roomDrawings[roomId].push({ offsetX, offsetY, prevX, prevY, color, brushWidth });

    // Broadcast drawing to others in the room
    socket.to(roomId).emit('drawing', { offsetX, offsetY, prevX, prevY, color, brushWidth });
  });

  socket.on('drawingShape', ({ roomId, shapeType, startX, startY, endX, endY, color, brushWidth }) => {
    if (!roomDrawings[roomId]) roomDrawings[roomId] = [];

    // Save the shape data
    roomDrawings[roomId].push({ shapeType, startX, startY, endX, endY, color, brushWidth });

    // Broadcast shape data to other users in the room
    socket.to(roomId).emit('drawingShape', { shapeType, startX, startY, endX, endY, color, brushWidth });
  });

  socket.on('clearBoard', (roomId) => {
    roomDrawings[roomId] = [];
    socket.to(roomId).emit('clearBoard');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
