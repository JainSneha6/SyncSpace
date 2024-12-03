import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const VoiceCall = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const localTrackRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://paletteconnect.onrender.com');
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    return () => {
      socketRef.current.disconnect();
      peerConnectionRef.current.close();
    };
  }, []);

  const toggleMic = async () => {
    if (!isMicOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current.srcObject = stream;
        localTrackRef.current = stream.getAudioTracks()[0];
        peerConnectionRef.current.addTrack(localTrackRef.current, stream);
        setIsMicOn(true);
      } catch (error) {
        console.error('Mic error:', error);
      }
    } else {
      if (localTrackRef.current) {
        localTrackRef.current.stop();
        peerConnectionRef.current.removeTrack(
          peerConnectionRef.current.getSenders().find(
            sender => sender.track === localTrackRef.current
          )
        );
        localStreamRef.current.srcObject = null;
        setIsMicOn(false);
      }
    }
  };

  return (
    <div className="text-center p-4">
      <button 
        onClick={toggleMic}
        className={`px-4 py-2 rounded text-white ${
          isMicOn ? 'bg-red-500' : 'bg-green-500'
        }`}
      >
        {isMicOn ? 'Turn Off Mic' : 'Turn On Mic'}
      </button>
      <audio ref={localStreamRef} autoPlay muted />
    </div>
  );
};

export default VoiceCall;