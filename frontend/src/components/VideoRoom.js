import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus, FaMicrophone, FaMicrophoneSlash, FaPalette } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Chat from './Chat'; // Import the Chat component

const VideoRoom = () => {
    const [roomId, setRoomId] = useState('');
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        socketRef.current = io.connect('https://paletteconnect.onrender.com');

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                streamRef.current = stream;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = stream;
                }

                socketRef.current.emit('join room', roomId);

                socketRef.current.on('all users', users => {
                    const peers = [];
                    users.forEach(userId => {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: userId,
                            peer,
                        });
                        peers.push(peer);
                    });
                    setPeers(peers);
                });

                socketRef.current.on('user joined', payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    });
                    setPeers(users => [...users, peer]);
                });

                socketRef.current.on('receiving returned signal', payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    item.peer.signal(payload.signal);
                });
            })
            .catch(err => {
                console.error("Error accessing media devices:", err);
            });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [roomId]);

    const toggleMic = () => {
        const audioTracks = streamRef.current.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMicOn(prev => !prev);
    };

    const toggleCamera = () => {
        const videoTracks = streamRef.current.getVideoTracks();
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsCameraOn(prev => !prev);
    };

    const createPeer = (userToSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('sending signal', { userToSignal, callerID, signal });
        });

        return peer;
    };

    const addPeer = (incomingSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('returning signal', { signal, callerID });
        });

        peer.signal(incomingSignal);

        return peer;
    };

    const handleRoomCreate = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        setRoomId(newRoomId);
    };

    const handleRoomJoin = (e) => {
        e.preventDefault();
        // Room ID is already set in state
    };

    const goToWhiteboard = () => {
        navigate(`/whiteboard/${roomId}`);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-500 via-gray-200 to-pink-200 p-6">
          <h1 className="text-5xl font-bold mb-8 text-white drop-shadow-xl">SyncSpace</h1>
          
          {!roomId ? (
            <motion.div
              className="bg-white p-8 rounded-lg shadow-xl transform transition-transform duration-300 hover:scale-105 w-full max-w-md"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <div className="flex flex-col items-center space-y-4">
                <button
                  className="bg-pink-600 text-white py-3 px-8 rounded-full w-full transition duration-300 hover:bg-pink-700 shadow-lg transform hover:scale-105 flex items-center justify-center text-lg"
                  onClick={handleRoomCreate}
                >
                  <FaCamera className="mr-2" />
                  Create Room
                </button>
                
                <form onSubmit={handleRoomJoin} className="w-full">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter Room ID"
                    className="border-2 border-gray-300 p-3 rounded-lg mb-4 w-full transition duration-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-300"
                  />
                  <button 
                    type="submit" 
                    className="bg-pink-600 text-white py-3 px-8 rounded-full w-full transition duration-300 hover:bg-pink-700 shadow-lg transform hover:scale-105 flex items-center justify-center text-lg"
                  >
                    <FaUserPlus className="mr-2" />
                    Join Room
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="bg-white p-6 rounded-lg shadow-xl transform transition-transform duration-300 w-full max-w-6xl"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <h2 className="text-2xl mb-4 text-gray-800 text-center">Room ID: {roomId}</h2>
              
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <video 
                      playsInline 
                      muted 
                      ref={userVideoRef} 
                      autoPlay 
                      className="rounded-lg shadow-lg w-full aspect-video object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-pink-600 text-white text-sm font-semibold p-1 rounded-bl-lg">
                      You
                    </div>
                  </div>
                  
                  {peers.length > 0 ? (
                    peers.map((peer, index) => (
                      <Video key={index} peer={peer} />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-48 bg-gray-200 rounded-lg">
                      <p className="text-gray-500">Waiting for a participant...</p>
                    </div>
                  )}
                </div>
                
                <div className="w-full lg:w-1/3 mt-6 lg:mt-0 lg:ml-6">
                  <Chat socketRef={socketRef} roomId={roomId} height={'40px'}/>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center mt-6 space-y-4 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={toggleMic} 
                  className="bg-pink-600 text-white py-3 px-6 rounded-full transition duration-300 hover:bg-pink-700 shadow-lg transform hover:scale-105 flex items-center justify-center"
                >
                  {isMicOn ? <FaMicrophone className="mr-2" /> : <FaMicrophoneSlash className="mr-2" />}
                  {isMicOn ? "Mute" : "Unmute"}
                </button>
                
                <button 
                  onClick={toggleCamera} 
                  className="bg-pink-600 text-white py-3 px-6 rounded-full transition duration-300 hover:bg-pink-700 shadow-lg transform hover:scale-105 flex items-center justify-center"
                >
                  {isCameraOn ? <FaCamera className="mr-2" /> : <FaCamera className="mr-2 opacity-50" />}
                  {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                </button>
              </div>
              
              <div className="flex justify-center mt-6">
                <button 
                  onClick={goToWhiteboard} 
                  className="bg-pink-600 text-white py-3 px-6 rounded-full transition duration-300 hover:bg-pink-600 shadow-lg transform hover:scale-105 flex items-center"
                >
                  <FaPalette className="mr-2" />
                  Go to Whiteboard
                </button>
              </div>
            </motion.div>
          )}
        </div>
      );
    };

const Video = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        });
    }, [peer]);

    return (
        <div className="relative">
            <video
                playsInline
                autoPlay
                ref={ref}
                className="rounded-lg shadow-lg w-full"
            />
            <div className="absolute top-0 left-0 bg-gray-700 text-white text-sm font-semibold p-1 rounded-bl-lg">Participant</div>
        </div>
    );
};

export default VideoRoom;