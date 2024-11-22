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

const rooms = new Map();
const roomDrawings = {}; // Store drawings for each room

const roomMessages = {}; // Store chat messages for each room

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

    // Send chat history to the new user
    if (roomMessages[roomID]) {
      socket.emit('chatHistory', roomMessages[roomID]);
    }
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
  });

  // Handle chat messages
  socket.on('sendMessage', ({ roomId, message }) => {
    if (!roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }

    const chatMessage = { message, id: socket.id };
    roomMessages[roomId].push(chatMessage);

    // Emit the message to everyone in the room, including the sender
    io.in(roomId).emit('receiveMessage', chatMessage);
  });

  // Whiteboard socket events
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    // Load existing drawings for the room
    if (roomDrawings[roomId]) {
      socket.emit('loadDrawing', roomDrawings[roomId]);
    }

    // Load existing shapes for the room

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
    roomDrawings[roomId] = []; // Clear drawings on the server
    socket.to(roomId).emit('clearBoard'); // Notify all users in the room to clear their boards
  });


  // Screen sharing events


  socket.on('screenSignal', (payload) => {
    socket.to(payload.roomId).emit('screenSignal', {
      signal: payload.signal,
      callerID: socket.id,
    });
  });

  socket.on('addText', ({ roomId, text, x, y, color, fontSize }) => {
    if (!roomDrawings[roomId]) {
      roomDrawings[roomId] = [];
    }

    // Save text data for the room
    roomDrawings[roomId].push({ type: 'text', text, x, y, color, fontSize });

    // Broadcast the text addition to others in the room
    socket.to(roomId).emit('addText', { text, x, y, color, fontSize });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
