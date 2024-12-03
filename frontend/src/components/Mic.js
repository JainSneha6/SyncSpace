import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus, FaMicrophone, FaMicrophoneSlash, FaPalette } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';

const AudioRoom = ({roomId}) => {
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const socketRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const audioRef = useRef();

    useEffect(() => {
        socketRef.current = io.connect('https://paletteconnect.onrender.com');

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                streamRef.current = stream;

                if(audioRef.current){
                    audioRef.current.srcObject = stream;
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

    return (
        <div className="min-h-screen bg-white text-[#2F4550] flex flex-col items-center justify-center p-6 relative">
            {/* Background Gradient for Visual Appeal */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#CE4760] via-[#2F4550] to-[#CE4760] opacity-10 pointer-events-none"></div>
                <motion.div
                    className="w-full max-w-7xl bg-white rounded-lg shadow-2xl p-10"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl font-semibold text-center mb-6">
                        Room ID: <span className="text-[#CE4760]">{roomId}</span>
                    </h2>
    
                    {/* Dynamic Layout with Split Screen */}
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Side: Video Section */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md">
                                <audio
                                    playsInline
                                    muted
                                    ref={audioRef}
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