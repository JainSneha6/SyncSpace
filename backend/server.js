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

const rooms = {}; // Track users in each room
const roomDrawings = {}; // Store drawings for each room

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    // Notify existing users in the room
    socket.to(roomId).emit('user joined', { userId: socket.id });

    // Send existing peers' signals to the newly joined user
    const existingUsers = [...io.sockets.adapter.rooms.get(roomId)];
    existingUsers.forEach((userId) => {
      if (userId !== socket.id) {
        // Inform the new user of existing peers
        socket.emit('user joined', { userId });
      }
    });

    // Load existing drawings for the room
    if (roomDrawings[roomId]) {
      socket.emit('load drawing', roomDrawings[roomId]);
    }
  });

  // Handle drawing data
  socket.on('drawing', ({ roomId, offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
    if (!roomDrawings[roomId]) {
      roomDrawings[roomId] = [];
    }

    // Store the drawing data
    roomDrawings[roomId].push({ offsetX, offsetY, prevX, prevY, color, brushWidth });

    // Broadcast drawing to others in the room
    socket.to(roomId).emit('drawing', { offsetX, offsetY, prevX, prevY, color, brushWidth });
  });

  // Handle shape drawing
  socket.on('drawingShape', ({ roomId, shapeType, startX, startY, endX, endY, color, brushWidth }) => {
    if (!roomDrawings[roomId]) roomDrawings[roomId] = [];

    // Save the shape data
    roomDrawings[roomId].push({ shapeType, startX, startY, endX, endY, color, brushWidth });

    // Broadcast shape data to other users in the room
    socket.to(roomId).emit('drawingShape', { shapeType, startX, startY, endX, endY, color, brushWidth });
  });

  // Clear board event
  socket.on('clear board', (roomId) => {
    roomDrawings[roomId] = [];
    socket.to(roomId).emit('clearBoard');
  });

  // Handle signaling for video calls
  socket.on('sending signal', ({ userToSignal, callerID, signal }) => {
    socket.to(userToSignal).emit('user joined', { signal, callerID });
  });

  socket.on('returning signal', ({ signal, callerID }) => {
    socket.to(callerID).emit('receiving returned signal', { signal, id: socket.id });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    // Optionally, handle user removal from rooms
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
