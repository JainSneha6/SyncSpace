import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const AudioCall = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const socket = useRef(null);
  const peerConnection = useRef(null);
  const stream = useRef(null);

  useEffect(() => {
    // Connect to the socket.io server
    socket.current = io();

    socket.current.on('offer', handleOffer);
    socket.current.on('answer', handleAnswer);
    socket.current.on('candidate', handleCandidate);

    // Clean up when component is unmounted
    return () => {
      socket.current.disconnect();
    };
  }, []);

  // Start the call
  const startCall = async () => {
    try {
      // Get user media (audio)
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Display local audio
      localAudioRef.current.srcObject = stream.current;

      // Create peer connection
      peerConnection.current = new RTCPeerConnection();

      // Add tracks to peer connection
      stream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream.current);
      });

      // Create offer and send it to the server
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.current.emit('offer', offer);

      setIsCalling(true);
    } catch (err) {
      console.error("Error starting the call:", err);
    }
  };

  // Handle the incoming offer
  const handleOffer = async (offer) => {
    if (!peerConnection.current) {
      peerConnection.current = new RTCPeerConnection();
    }

    // Set remote description from the incoming offer
    await peerConnection.current.setRemoteDescription(offer);

    // Create answer and send it back to the server
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.current.emit('answer', answer);
  };

  // Handle the incoming answer
  const handleAnswer = (answer) => {
    peerConnection.current.setRemoteDescription(answer);
    setIsConnected(true);
  };

  // Handle ICE candidates (network traversal)
  const handleCandidate = (candidate) => {
    peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // Handle ICE candidate collection
  if (peerConnection.current) {
    peerConnection.current.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.current.emit('candidate', candidate);
      }
    };
  }

  return (
    <div>
      <h2>Audio Call</h2>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />

      {isCalling && !isConnected && <p>Connecting...</p>}
      {!isCalling && <button onClick={startCall}>Start Call</button>}
    </div>
  );
};

export default AudioCall;
