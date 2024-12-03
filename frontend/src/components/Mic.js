import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const App = () => {
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [myStream, setMyStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const socketRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    // Connect to the backend via Socket.IO
    socketRef.current = io('http://localhost:5000');

    // Handle incoming offer, answer, and ICE candidates
    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleNewICECandidate);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleJoinRoom = () => {
    socketRef.current.emit('join', roomId);
    setIsInRoom(true);
    setupLocalStream();
  };

  const setupLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMyStream(stream);

      if (peerConnection) {
        peerConnection.addStream(stream);
      }

      // Set up a new RTCPeerConnection for audio call
      const newPeerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
        ],
      });

      newPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', event.candidate, roomId);
        }
      };

      newPeerConnection.onaddstream = (event) => {
        remoteAudioRef.current.srcObject = event.stream;
      };

      newPeerConnection.addStream(stream);
      setPeerConnection(newPeerConnection);
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  const handleOffer = async (offer) => {
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current.emit('answer', answer, roomId);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = (answer) => {
    if (peerConnection) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleNewICECandidate = (candidate) => {
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleCreateOffer = async () => {
    if (!peerConnection) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.emit('offer', offer, roomId);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  return (
    <div>
      {!isInRoom && (
        <div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      )}

      {isInRoom && (
        <div>
          <button onClick={handleCreateOffer}>Start Audio Call</button>
          <audio ref={remoteAudioRef} autoPlay></audio>
        </div>
      )}

      {myStream && <audio srcObject={myStream} autoPlay muted />}
    </div>
  );
};

export default App;
