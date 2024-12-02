// src/AudioCall.js
import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const AudioCall = () => {
  const [peerConnections, setPeerConnections] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const socketRef = useRef(null);
  const userMediaRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomId = "room1"; // You can dynamically pass this based on route or params

  useEffect(() => {
    socketRef.current = io("https://paletteconnect.onrender.com");

    socketRef.current.emit("joinRoom", roomId);

    socketRef.current.on('receiveOffer', (data) => {
      handleReceiveOffer(data);
    });

    socketRef.current.on('receiveAnswer', (data) => {
      handleReceiveAnswer(data);
    });

    socketRef.current.on('receiveIceCandidate', (data) => {
      handleReceiveIceCandidate(data);
    });

    // Get local media (audio)
    getUserMedia();

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      userMediaRef.current = stream;
      localStreamRef.current = stream;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log("Got Audio Stream");
      }
      // Play local stream
      const localAudio = document.createElement('audio');
      localAudio.srcObject = stream;
      localAudio.play();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const handleReceiveOffer = async ({ offer, from }) => {
    const peerConnection = new RTCPeerConnection();
    peerConnections[from] = peerConnection;

    // Add local media stream to the peer connection
    localStreamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create an answer and send it back
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketRef.current.emit('sendAnswer', {
      answer: answer,
      target: from,
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('sendIceCandidate', {
          candidate: event.candidate,
          target: from,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteAudio = document.createElement('audio');
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play();
    };
  };

  const handleReceiveAnswer = ({ answer, from }) => {
    const peerConnection = peerConnections[from];
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleReceiveIceCandidate = ({ candidate, from }) => {
    const peerConnection = peerConnections[from];
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const createOffer = async () => {
    const peerConnection = new RTCPeerConnection();

    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        socketRef.current.emit('sendIceCandidate', {
          candidate: event.candidate,
          target: roomId, // Send candidate to all peers
        });
      }
    });

    // Add local stream tracks
    localStreamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketRef.current.emit('sendOffer', {
      offer: offer,
      target: roomId, // Send offer to all peers
    });

    peerConnections[roomId] = peerConnection;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    localStreamRef.current.getTracks().forEach(track => {
      if (track.kind === "audio") {
        track.enabled = !track.enabled;
      }
    });
  };

  return (
    <div>
      <h1>Audio Call</h1>
      <button onClick={createOffer}>Start Call</button>
      <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
    </div>
  );
};

export default AudioCall;
