const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Adjust as needed for your frontend
    methods: ['GET', 'POST'],
  },
});

const PORT = 5000;

// For video call
const rooms = new Map();

// For whiteboard
const roomDrawings = {}; // Store drawings for each room

// For chat
const roomMessages = {}; // Store chat messages for each room

// Video call socket events
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join room', (roomID) => {
    if (rooms.has(roomID)) {
      rooms.get(roomID).push(socket.id);
    } else {
      rooms.set(roomID, [socket.id]);
    }
    const otherUsers = rooms.get(roomID).filter(id => id !== socket.id);
    socket.emit('all users', otherUsers);
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on('returning signal', (payload) => {
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

  // Whiteboard socket events
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    // Load existing drawings for the room
    if (roomDrawings[roomId]) {
      socket.emit('loadDrawing', roomDrawings[roomId]);
    }

    // Load existing chat messages for the room
    if (roomMessages[roomId]) {
      socket.emit('loadMessages', roomMessages[roomId]);
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

  socket.on('clearBoard', (roomId) => {
    roomDrawings[roomId] = [];
    socket.to(roomId).emit('clearBoard');
  });

  // Chat socket events
  socket.on('send message', ({ roomId, message, sender }) => {
    if (!roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }

    // Store the chat message
    const chatMessage = { sender, text: message, time: new Date().toISOString() };
    roomMessages[roomId].push(chatMessage);

    // Broadcast the chat message to others in the room
    io.to(roomId).emit('receive message', chatMessage);
  });

  // Load existing chat messages for the room when a user joins
  socket.on('requestMessages', (roomId) => {
    if (roomMessages[roomId]) {
      socket.emit('loadMessages', roomMessages[roomId]);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
