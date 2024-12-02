// frontend/src/AudioCall.js

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const AudioCall = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [peerConnections, setPeerConnections] = useState([]);
  const [remoteAudio, setRemoteAudio] = useState(null);
  const userMediaRef = useRef(null);
  const socketRef = useRef(null);
  const localAudioRef = useRef(null);
  const [peerId, setPeerId] = useState(null); // We'll assume peerId is generated or received

  useEffect(() => {
    socketRef.current = io('https://paletteconnect.onrender.com'); // Connect to the backend server

    // Event listeners
    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);
    socketRef.current.on('user-disconnected', handleUserDisconnected);

    // Request media access (audio)
    getUserMedia();

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Request user media (microphone access)
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      userMediaRef.current = stream;
      localAudioRef.current.srcObject = stream;
      socketRef.current.emit('joinRoom', 'room1'); // Join the room for communication
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  // Handle incoming offer
  const handleOffer = async (offer, callerId) => {
    const peerConnection = new RTCPeerConnection();
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', event.candidate, callerId);
      }
    };

    peerConnection.ontrack = (event) => {
      const audioElement = document.createElement('audio');
      audioElement.srcObject = event.streams[0];
      audioElement.play();
      setRemoteAudio(audioElement);
    };

    // Add user's media tracks to the peer connection
    userMediaRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, userMediaRef.current);
    });

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketRef.current.emit('answer', answer, callerId);
    setPeerConnections((prev) => [...prev, peerConnection]);
  };

  // Handle incoming answer
  const handleAnswer = (answer, calleeId) => {
    const peerConnection = peerConnections.find((pc) => pc.id === calleeId);
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = (candidate, peerId) => {
    const peerConnection = peerConnections.find((pc) => pc.id === peerId);
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // Handle when a user disconnects
  const handleUserDisconnected = (peerId) => {
    const peerConnection = peerConnections.find((pc) => pc.id === peerId);
    if (peerConnection) {
      peerConnection.close();
      setPeerConnections((prev) => prev.filter((pc) => pc.id !== peerId));
    }
  };

  // Start a call (offer)
  const startCall = (receiverId) => {
    const peerConnection = new RTCPeerConnection();
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', event.candidate, receiverId);
      }
    };

    peerConnection.ontrack = (event) => {
      const audioElement = document.createElement('audio');
      audioElement.srcObject = event.streams[0];
      audioElement.play();
      setRemoteAudio(audioElement);
    };

    // Add user's media tracks to the peer connection
    userMediaRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, userMediaRef.current);
    });

    peerConnection.createOffer().then((offer) => {
      return peerConnection.setLocalDescription(offer);
    }).then(() => {
      socketRef.current.emit('offer', peerConnection.localDescription, receiverId);
    });

    setPeerConnections((prev) => [...prev, peerConnection]);
  };

  // Toggle mute
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
      <h1>Audio Call</h1>
      <audio ref={localAudioRef} autoPlay muted></audio>
      {remoteAudio && <audio ref={(audio) => remoteAudio = audio} autoPlay></audio>}
      <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
      <button onClick={() => startCall(peerId)}>Start Call</button>
    </div>
  );
};

export default AudioCall;
