import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const VoiceCall = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    // Socket connection
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
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socketRef.current.emit('answer', answer);
    });

    socketRef.current.on('answer', (answer) => {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socketRef.current.on('ice-candidate', (candidate) => {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socketRef.current.disconnect();
      peerConnectionRef.current.close();
    };
  }, []);

  const toggleMic = async () => {
    if (!isMicOn) {
      try {
        // Get audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });

        // Set local stream
        localStreamRef.current.srcObject = stream;

        // Create offer
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socketRef.current.emit('offer', offer);

        setIsMicOn(true);
      } catch (error) {
        console.error('Mic toggle error:', error);
      }
    } else {
      // Stop all tracks
      const tracks = localStreamRef.current.srcObject?.getTracks() || [];
      tracks.forEach(track => track.stop());

      // Remove tracks from peer connection
      peerConnectionRef.current.getSenders().forEach(sender => {
        peerConnectionRef.current.removeTrack(sender);
      });

      localStreamRef.current.srcObject = null;
      setIsMicOn(false);
    }
  };

  return (
    <div className="text-center p-4">
      <button
        onClick={toggleMic}
        className={`bg-[#CE4760] text-white py-3 px-8 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300`}
      >
        {isMicOn ? (
          <>
            <FaMicrophone className="text-lg" />
          </>
        ) : (
          <>
            <FaMicrophoneSlash className="text-lg" />
          </>
        )}
      </button>
      <audio ref={localStreamRef} autoPlay muted />
      <audio ref={remoteStreamRef} autoPlay />
    </div>
  );
};

export default VoiceCall;