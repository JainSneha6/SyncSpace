import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io.connect('https://paletteconnect.onrender.com');

function AudioCall() {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    // Initialize local media stream
    const getMedia = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      localVideoRef.current.srcObject = stream;
    };

    getMedia();

    socket.on('call-offer', handleCallOffer);
    socket.on('call-answer', handleCallAnswer);
    socket.on('new-ice-candidate', handleNewIceCandidate);

    return () => {
      socket.off('call-offer', handleCallOffer);
      socket.off('call-answer', handleCallAnswer);
      socket.off('new-ice-candidate', handleNewIceCandidate);
    };
  }, []);

  const handleCallOffer = async (data) => {
    peerConnectionRef.current = new RTCPeerConnection();
    peerConnectionRef.current.addEventListener('icecandidate', handleIceCandidate);
    peerConnectionRef.current.addEventListener('track', handleTrackEvent);

    // Add local stream to peer connection
    localStream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, localStream));

    // Set remote offer
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));

    // Create an answer
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    socket.emit('call-answer', {
      to: data.from,
      answer: answer,
    });
  };

  const handleCallAnswer = (data) => {
    peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
  };

  const handleIceCandidate = (event) => {
    if (event.candidate) {
      socket.emit('new-ice-candidate', {
        to: peerConnectionRef.current.remoteDescription ? peerConnectionRef.current.remoteDescription.from : null,
        candidate: event.candidate,
      });
    }
  };

  const handleNewIceCandidate = (data) => {
    peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
  };

  const handleTrackEvent = (event) => {
    setRemoteStream(event.streams[0]);
    remoteVideoRef.current.srcObject = event.streams[0];
  };

  const startCall = (to) => {
    peerConnectionRef.current = new RTCPeerConnection();
    peerConnectionRef.current.addEventListener('icecandidate', handleIceCandidate);
    peerConnectionRef.current.addEventListener('track', handleTrackEvent);

    // Add local stream to peer connection
    localStream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, localStream));

    // Create offer
    peerConnectionRef.current.createOffer()
      .then((offer) => peerConnectionRef.current.setLocalDescription(offer))
      .then(() => {
        socket.emit('call-offer', {
          to: to,
          offer: peerConnectionRef.current.localDescription,
        });
      });
  };

  const stopCall = () => {
    peerConnectionRef.current.close();
    setRemoteStream(null);
    setIsCallInProgress(false);
  };

  return (
    <div>
      <h1>Voice Call App</h1>
      <div>
        <video ref={localVideoRef} autoPlay muted />
        {remoteStream && <video ref={remoteVideoRef} autoPlay />}
      </div>
      {!isCallInProgress ? (
        <button onClick={() => startCall('peerSocketId')}>Start Call</button>
      ) : (
        <button onClick={stopCall}>End Call</button>
      )}
    </div>
  );
}

export default AudioCall;
