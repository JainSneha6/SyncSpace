import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('https://paletteconnect.onrender.com');

function App() {
  const [meetingId, setMeetingId] = useState('');
  const [peers, setPeers] = useState({});
  const [stream, setStream] = useState(null);
  const [inMeeting, setInMeeting] = useState(false);
  const userVideo = useRef();
  const peersRef = useRef({});

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });
  }, []);

  useEffect(() => {
    if (!stream) return;

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream);
    });

    socket.on('user-disconnected', userId => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
      }
      setPeers(peers => {
        const newPeers = { ...peers };
        delete newPeers[userId];
        return newPeers;
      });
    });

    socket.on('existing-users', users => {
      users.forEach(userId => connectToNewUser(userId, stream));
    });

    return () => {
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('existing-users');
    };
  }, [stream]);

  const connectToNewUser = (userId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socket.emit('send-signal', { userToSignal: userId, callerID: socket.id, signal });
    });

    socket.on('user-joined', ({ signal, callerID }) => {
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream,
      });

      peer.on('signal', signal => {
        socket.emit('return-signal', { signal, callerID });
      });

      peer.signal(signal);

      peersRef.current[callerID] = peer;
      setPeers(peers => ({ ...peers, [callerID]: peer }));
    });

    socket.on('receiving-returned-signal', ({ id, signal }) => {
      peersRef.current[id].signal(signal);
    });

    peersRef.current[userId] = peer;
    setPeers(peers => ({ ...peers, [userId]: peer }));
  };

  const createMeeting = () => {
    const newMeetingId = Math.random().toString(36).substr(2, 9);
    setMeetingId(newMeetingId);
    joinMeeting(newMeetingId);
  };

  const joinMeeting = (id) => {
    setMeetingId(id);
    setInMeeting(true);
    socket.emit('join-room', id);
  };

  const renderMeetingCreation = () => (
    <div>
      <h1>Video Calling App</h1>
      <button onClick={createMeeting}>Create New Meeting</button>
      <div>
        <input
          type="text"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
          placeholder="Enter Meeting ID"
        />
        <button onClick={() => joinMeeting(meetingId)}>Join Meeting</button>
      </div>
    </div>
  );

  const renderMeetingRoom = () => (
    <div>
      <h2>Meeting ID: {meetingId}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <video playsInline muted ref={userVideo} autoPlay style={{ width: '300px', margin: '5px' }} />
        {Object.values(peers).map((peer, index) => (
          <Video key={index} peer={peer} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {inMeeting ? renderMeetingRoom() : renderMeetingCreation()}
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

  return <video playsInline autoPlay ref={ref} style={{ width: '300px', margin: '5px' }} />;
};

export default App;