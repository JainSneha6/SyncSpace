import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('https://paletteconnect.onrender.com');

function App() {
  const [roomId, setRoomId] = useState('');
  const [peers, setPeers] = useState([]);
  const [stream, setStream] = useState(null);
  const userVideo = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        userVideo.current.srcObject = stream;
      });

    socket.on('user-joined', userId => {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
      });

      peer.on('signal', signal => {
        socket.emit('sending-signal', { userToSignal: userId, callerID: socket.id, signal });
      });

      setPeers(peers => [...peers, peer]);
    });

    socket.on('user-left', userId => {
      setPeers(peers => peers.filter(peer => peer.peerID !== userId));
    });

    socket.on('receiving-signal', ({ signal, callerID }) => {
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
      });

      peer.on('signal', signal => {
        socket.emit('returning-signal', { signal, callerID });
      });

      peer.signal(signal);
      setPeers(peers => [...peers, peer]);
    });
  }, []);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    setRoomId(newRoomId);
    socket.emit('create-room', newRoomId);
  };

  const joinRoom = () => {
    socket.emit('join-room', roomId);
  };

  return (
    <div>
      <h1>Video Calling App</h1>
      <div>
        <button onClick={createRoom}>Create Room</button>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter Room ID"
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>
      <div>
        <video playsInline muted ref={userVideo} autoPlay />
        {peers.map((peer, index) => (
          <Video key={index} peer={peer} />
        ))}
      </div>
    </div>
  );
}

const Video = ({ peer }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on('stream', stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);

  return <video playsInline autoPlay ref={ref} />;
};

export default App;