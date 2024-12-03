const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data'); // Ensure FormData is imported
const axios = require('axios')

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Adjust as needed for your frontend
    methods: ['GET', 'POST'],
  },
});

const storage = multer.memoryStorage();  // Store the file in memory (you can configure this to save to disk)
const upload = multer({ storage: storage });

const PORT = 5001;

const rooms = new Map();
const drawingrooms = {};
const roomMessages = {};
const stickyNotesPerRoom = {};
let stickyNotes = [];
let pptData = {};

// Route to handle PPT uploads
app.post('/uploadPpt', upload.single('file'), async (req, res) => {
  const { roomId } = req.body; // Extract roomId from the request body
  const pptFile = req.file; // Access the uploaded file
  console.log('Hello')
  if (!pptFile) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    // Prepare FormData to send to Flask backend
    const formData = new FormData();
    formData.append('file', pptFile.buffer, pptFile.originalname); // Attach file buffer with original name

    // Send the file to Flask backend for processing
    const response = await axios.post('http://localhost:5000/upload', formData, {
      headers: formData.getHeaders(),
    });

    const { slides, folder, pdf } = response.data;

    // Store the slides data for the room
    pptData[roomId] = { slides, folder, pdf };

    // Notify all users in the room about the new slides
    io.to(roomId).emit('pptUploaded', pptData[roomId]);

    res.status(200).json({ slides, folder, pdf });
  } catch (error) {
    console.error('Error uploading PPT:', error.message);
    res.status(500).json({ error: 'Failed to upload PPT' });
  }
});

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

  socket.on('sendMessage', ({ roomId, message }) => {
    if (!roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }

    const chatMessage = { message, id: socket.id };
    roomMessages[roomId].push(chatMessage);
    io.in(roomId).emit('receiveMessage', chatMessage);
  });

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
    io.to(roomId).emit('syncStickyNotes', stickyNotes);

    if (drawingrooms[roomId]) {
      socket.emit("loadDrawing", drawingrooms[roomId]);
    } else {
      drawingrooms[roomId] = [];
    }

    if (stickyNotesPerRoom[roomId]) {
      socket.emit('syncStickyNotes', stickyNotesPerRoom[roomId]);
    } else {
      stickyNotesPerRoom[roomId] = []; // Initialize if not present
    }

    if (pptData[roomId]) {
      socket.emit('pptUploaded', pptData[roomId]);
    }
  });

  socket.on('uploadPpt', (pptData) => {
    const { roomId, pptFileData } = pptData;

    // Broadcast the ppt data to all clients in the room
    io.to(roomId).emit('pptUploaded', pptFileData);
  });

  socket.on('slideChanged', ({ roomId, currentIndex }) => {
    // Broadcast to other clients in the same room
    socket.to(roomId).emit('slideUpdated', currentIndex);
  });

  socket.on('drawing', (data) => {
    const { roomId, ...drawingData } = data;
    if (!drawingrooms[roomId]) {
      drawingrooms[roomId] = [];
    }
    drawingrooms[roomId].push(drawingData);

    // Broadcast drawing to others in the room
    socket.to(roomId).emit("drawing", drawingData);
  });

  socket.on("clearBoard", (roomId) => {
    if (drawingrooms[roomId]) {
      drawingrooms[roomId] = []; // Clear the drawings for the room
    }
    io.to(roomId).emit("clearBoard"); // Notify all users in the room
  });

  socket.on('createStickyNote', (noteData) => {
    const { roomId, note } = noteData;

    // If the room doesn't have sticky notes, initialize it
    if (!stickyNotesPerRoom[roomId]) {
      stickyNotesPerRoom[roomId] = [];
    }

    // Add the new sticky note to the room
    stickyNotesPerRoom[roomId].push(note);

    // Broadcast the new sticky note to all users in the room
    io.to(roomId).emit('syncStickyNotes', stickyNotesPerRoom[roomId]);
  });


  // Handle sticky note updates (e.g., moving or editing a note)
  socket.on('updateStickyNote', ({ roomId, note }) => {
    const notesInRoom = stickyNotesPerRoom[roomId] || [];
    const index = notesInRoom.findIndex(n => n.id === note.id);
    if (index !== -1) {
      notesInRoom[index] = note; // Update the sticky note
      io.to(roomId).emit('syncStickyNotes', notesInRoom);
    }
  });

  socket.on('deleteStickyNote', ({ roomId, noteId }) => {
    const notesInRoom = stickyNotesPerRoom[roomId] || [];
    const updatedNotes = notesInRoom.filter(note => note.id !== noteId);
    stickyNotesPerRoom[roomId] = updatedNotes;
    io.to(roomId).emit('syncStickyNotes', updatedNotes);
  });

  socket.on('screenSignal', (payload) => {
    socket.to(payload.roomId).emit('screenSignal', {
      signal: payload.signal,
      callerID: socket.id,
    });
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
