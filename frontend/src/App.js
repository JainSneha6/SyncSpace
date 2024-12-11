import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Whiteboard from './components/Whiteboard';
import VideoRoom from './components/VideoRoom';
import AudioRoom from './components/Mic';
import PptViewer from './components/PptViewer';
import WhiteBoardVideoRoom from './components/WhiteboardVideoRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoRoom />} />
        <Route path="/whiteboard/:roomId" element={<Whiteboard />} />
        <Route path="/mic" element={<AudioRoom />} />
        <Route path="/ppt/:roomId" element={<PptViewer />} />
        <Route path='/whiteboardvideo/:roomId' element={<WhiteBoardVideoRoom />} />
        <Route path='/audio' element={<Audio />} />
      </Routes>
    </Router>
  );
}

export default App;