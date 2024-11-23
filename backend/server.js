// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// const app = express();
// app.use(cors());

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: 'http://localhost:3000', // Adjust as needed for your frontend
//     methods: ['GET', 'POST'],
//   },
// });

// const PORT = 5000;

// const rooms = new Map();
// let drawings = [];

// io.on('connection', (socket) => {
//   console.log('A user connected');

//   socket.on('join room', (roomID) => {
//     if (rooms.has(roomID)) {
//       rooms.get(roomID).push(socket.id);
//     } else {
//       rooms.set(roomID, [socket.id]);
//     }

//     const otherUsers = rooms.get(roomID).filter(id => id !== socket.id);
//     socket.emit('all users', otherUsers);
//     if (roomMessages[roomID]) {
//       socket.emit('chatHistory', roomMessages[roomID]);
//     }


//   });

//   socket.on('sending signal', (payload) => {
//     io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
//   });

//   socket.on('returning signal', (payload) => {
//     io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
//   });

//   // Handle chat messages
//   socket.on('sendMessage', ({ roomId, message }) => {
//     if (!roomMessages[roomId]) {
//       roomMessages[roomId] = [];
//     }

//     const chatMessage = { message, id: socket.id };
//     roomMessages[roomId].push(chatMessage);
//     io.in(roomId).emit('receiveMessage', chatMessage);
//   });

//   // Whiteboard socket events
//   socket.on('joinRoom', (roomId) => {
//     socket.join(roomId);
//     console.log(`User joined room: ${roomId}`);

//     socket.emit('loadDrawing', drawings);
//   });

//   socket.on('drawing', (drawingData) => {
//     drawings.push(drawingData);  // Save drawing on the server
//     io.to(drawingData.roomId).emit('drawing', drawingData);  // Broadcast drawing to room
//   });

//   socket.on('clearBoard', (roomId) => {
//     drawings = [];  // Clear stored drawings
//     io.to(roomId).emit('clearBoard');  // Broadcast clear event
//   });


//   socket.on('screenSignal', (payload) => {
//     socket.to(payload.roomId).emit('screenSignal', {
//       signal: payload.signal,
//       callerID: socket.id,
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log('A user disconnected');
//     rooms.forEach((value, key) => {
//       if (value.includes(socket.id)) {
//         rooms.set(key, value.filter(id => id !== socket.id));
//         if (rooms.get(key).length === 0) {
//           rooms.delete(key);
//         }
//       }
//     });
//     socket.broadcast.emit('user left', socket.id);
//   });
// });

// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
  },
});

const rooms = {}; // Store drawing data for each room

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Send existing drawings to the user
    if (rooms[roomId]) {
      socket.emit("loadDrawing", rooms[roomId]);
    } else {
      rooms[roomId] = []; // Initialize room if not present
    }
  });

  socket.on("drawing", (data) => {
    const { roomId, ...drawingData } = data;
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Save drawing data
    rooms[roomId].push(drawingData);

    // Broadcast drawing to others in the room
    socket.to(roomId).emit("drawing", drawingData);
  });

  socket.on("clearBoard", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId] = []; // Clear the drawings for the room
    }
    io.to(roomId).emit("clearBoard"); // Notify all users in the room
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
