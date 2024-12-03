import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const VoiceCall = () => {
  const [callStatus, setCallStatus] = useState('Disconnected');
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    // Socket.io connection
    socketRef.current = io('https://paletteconnect.onrender.com');

    // WebRTC configuration
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    // Create peer connection
    peerConnectionRef.current = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      remoteStreamRef.current.srcObject = event.streams[0];
    };

    // Socket event listeners
    socketRef.current.on('offer', async (offer) => {
      await peerConnectionRef.current.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socketRef.current.emit('answer', answer);
    });

    socketRef.current.on('answer', (answer) => {
      peerConnectionRef.current.setRemoteDescription(answer);
    });

    socketRef.current.on('ice-candidate', (candidate) => {
      peerConnectionRef.current.addIceCandidate(candidate);
    });

    return () => {
      socketRef.current.disconnect();
      peerConnectionRef.current.close();
    };
  }, []);

  const startCall = async () => {
    try {
      // Get local audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current.srcObject = stream;
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Create offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socketRef.current.emit('offer', offer);

      setCallStatus('Calling');
    } catch (error) {
      console.error('Call start error:', error);
    }
  };

  const endCall = () => {
    // Close connections and reset state
    peerConnectionRef.current.close();
    localStreamRef.current.srcObject = null;
    remoteStreamRef.current.srcObject = null;
    setCallStatus('Disconnected');
  };

  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl mb-4">WebRTC Voice Call</h1>
      <div className="mb-4">Status: {callStatus}</div>
      <div className="flex justify-center space-x-4">
        <button 
          onClick={startCall}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Start Call
        </button>
        <button 
          onClick={endCall}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          End Call
        </button>
      </div>
      <audio ref={localStreamRef} autoPlay muted />
      <audio ref={remoteStreamRef} autoPlay />
    </div>
  );
};

export default VoiceCall;