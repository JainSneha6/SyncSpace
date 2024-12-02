import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaUserPlus } from 'react-icons/fa';  // Keep only audio-related icons
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Chat from './Chat'; // Import the Chat component

const AudioRoom = () => {
    const [roomId, setRoomId] = useState('');
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const socketRef = useRef();
    const userAudioRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        socketRef.current = io.connect('https://paletteconnect.onrender.com');

        // Only request audio stream, no video
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                streamRef.current = stream;
                if (userAudioRef.current) {
                    userAudioRef.current.srcObject = stream;
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
        <div className="min-h-screen bg-white text-[#2F4550] flex flex-col items-center justify-center p-6 relative">
            {/* Background Gradient for Visual Appeal */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#CE4760] via-[#2F4550] to-[#CE4760] opacity-10 pointer-events-none"></div>
    
            {/* Main Header Section */}
            <header className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center mb-12 z-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#CE4760] to-[#2F4550] tracking-wide mb-4 md:mb-0">
                    SyncSpace
                </h1>
            </header>
    
            {/* Room Creation or Join Section */}
            {!roomId ? (
                <motion.div
                    className="w-full max-w-lg bg-gradient-to-br from-white to-[#F5F5F5] rounded-lg shadow-2xl p-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}>
                    <h2 className="text-3xl font-semibold text-center mb-6 text-[#2F4550]">
                        Create or Join a Room
                    </h2>
    
                    <div className="flex flex-col gap-6">
                        <button
                            onClick={handleRoomCreate}
                            className="w-full bg-[#CE4760] text-white py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform duration-300">
                            Create Room
                        </button>
                        <form onSubmit={handleRoomJoin} className="flex flex-col gap-6">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter Room ID"
                                className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#CE4760] text-lg"
                            />
                            <button
                                type="submit"
                                className="w-full bg-[#2F4550] text-white py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform duration-300">
                                Join Room
                            </button>
                        </form>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    className="w-full max-w-7xl bg-white rounded-lg shadow-2xl p-10"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl font-semibold text-center mb-6">
                        Room ID: <span className="text-[#CE4760]">{roomId}</span>
                    </h2>
    
                    {/* Audio Section */}
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Side: Audio Section */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md">
                                <audio
                                    playsInline
                                    muted
                                    ref={userAudioRef}
                                    autoPlay
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0 left-0 bg-[#CE4760] text-white text-sm font-semibold px-3 py-1 rounded-bl-lg">
                                    You
                                </div>
                            </div>
                            {peers.length > 0 ? (
                                peers.map((peer, index) => (
                                    <Audio key={index} peer={peer} />
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg shadow-inner">
                                    <p className="text-gray-500">Waiting for participants...</p>
                                </div>
                            )}
                        </div>
    
                        {/* Right Side: Chat Section */}
                        <div className="w-full lg:w-1/3 bg-[#F5F5F5] rounded-lg shadow-md p-6">
                            <Chat socketRef={socketRef} roomId={roomId} height={'40px'} />
                        </div>
                    </div>
    
                    {/* Controls */}
                    <div className="flex flex-wrap gap-6 justify-center mt-8">
                        <button
                            onClick={toggleMic}
                            className="bg-[#CE4760] text-white py-3 px-6 rounded-full font-medium shadow-lg hover:scale-105 transition-transform duration-300">
                            {isMicOn ? <FaMicrophone className="inline-block mr-2" /> : <FaMicrophoneSlash className="inline-block mr-2" />}
                            {isMicOn ? "Mute" : "Unmute"}
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const Audio = ({ peer }) => {
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
            <audio
                playsInline
                autoPlay
                ref={ref}
                className="rounded-lg shadow-lg w-full"
            />
            <div className="absolute top-0 left-0 bg-gray-700 text-white text-sm font-semibold p-1 rounded-bl-lg">Participant</div>
        </div>
    );
};

export default AudioRoom;
