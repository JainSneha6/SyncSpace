import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Whiteboard from './components/Whiteboard';
import VideoRoom from './components/VideoRoom';
import VoiceChat from './components/Mic';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoRoom/>} />
        <Route path="/whiteboard/:roomId" element={<Whiteboard />} />
        <Route path='/mic' element={<VoiceChat/>} />
      </Routes>
    </Router>
  );
}

export default App;