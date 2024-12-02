import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const VoiceChat = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [peerConnections, setPeerConnections] = useState([]);
  const userMediaRef = useRef(null);
  const socketRef = useRef(null);
  const localAudioRef = useRef(null);

  // Setup socket connection
  useEffect(() => {
    socketRef.current = io('https://paletteconnect.onrender.com');
    socketRef.current.on('userJoined', handleUserJoined);
    socketRef.current.on('receiveAudio', handleReceiveAudio);

    // Request media access (audio)
    getUserMedia();

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      userMediaRef.current = stream;
      localAudioRef.current.srcObject = stream;
      socketRef.current.emit('joinRoom', 'room1'); // Assume room name is 'room1'
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  const handleUserJoined = (peerId) => {
    createPeerConnection(peerId);
  };

  const handleReceiveAudio = (peerId, audioStream) => {
    addAudioStream(peerId, audioStream);
  };

  const createPeerConnection = (peerId) => {
    const peerConnection = new RTCPeerConnection();
    peerConnection.ontrack = (event) => {
      addAudioStream(peerId, event.streams[0]);
    };

    // Add user's media stream to peer connection
    userMediaRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, userMediaRef.current);
    });

    peerConnection.createOffer().then((offer) => {
      peerConnection.setLocalDescription(offer);
      socketRef.current.emit('offer', { peerId, offer });
    });

    setPeerConnections((prev) => [...prev, peerConnection]);
  };

  const addAudioStream = (peerId, stream) => {
    const audioElement = document.createElement('audio');
    audioElement.srcObject = stream;
    audioElement.play();
    audioElement.id = peerId;
    document.body.appendChild(audioElement); // Add audio to the page
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    userMediaRef.current.getTracks().forEach((track) => {
      if (track.kind === 'audio') {
        track.enabled = !track.enabled;
      }
    });
  };

  return (
    <div>
      <h1>Voice Chat</h1>
      <button onClick={toggleMute}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <audio ref={localAudioRef} autoPlay muted></audio>
    </div>
  );
};

export default VoiceChat;
