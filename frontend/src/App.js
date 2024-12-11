import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Whiteboard from './components/Whiteboard';
import VideoRoom from './components/VideoRoom';
import AudioRoom from './components/Mic';
import PptViewer from './components/PptViewer';
import WhiteBoardVideoRoom from './components/WhiteboardVideoRoom';
import HomePage from './components/HomePage';
import VideoRoomPPT from './components/VideoRoomPPT';
import Audio from './components/Audio';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/video-call-whiteboard" element={<WhiteBoardVideoRoom />} />
        <Route path="/video-call-ppt-viewer" element={<VideoRoomPPT />} />
        <Route path="/whiteboard/:roomId" element={<Whiteboard />} />
        <Route path="/mic" element={<AudioRoom />} />
        <Route path="/ppt/:roomId" element={<PptViewer />} />
        <Route path='/whiteboardvideo/:roomId' element={<WhiteBoardVideoRoom />} />
        <Route path='/audio' element={<Audio />} />
        <Route path='/video' element={<VideoRoom/>} />
      </Routes >
    </Router >
  );
}

export default App;