import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoomSelection from './components/RoomSelection';
import Whiteboard from './components/Whiteboard';
import VideoRoom from './components/VideoRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoRoom />} />
        <Route path="/video/:roomId" element={<VideoRoom />} />
        <Route path="/room/:roomId" element={<Whiteboard />} />
      </Routes>
    </Router>
  );
}

export default App;