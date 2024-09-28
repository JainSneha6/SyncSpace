import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus } from 'react-icons/fa'; // Importing React icons
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';

const VideoRoom = () => {
    const [roomId, setRoomId] = useState('');
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

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

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('sending signal', { userToSignal, callerID, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
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
    }

    const handleRoomCreate = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        setRoomId(newRoomId);
    };

    const handleRoomJoin = (e) => {
        e.preventDefault();
        // Room ID is already set in state
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-200 to-gray-300">
            <h1 className="text-5xl font-bold mb-8 text-pink-600 drop-shadow-lg">PaletteConnect</h1>
            {!roomId ? (
                <motion.div 
                    className="bg-white p-8 rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                    <div className="flex flex-col items-center">
                        <button 
                            className="bg-pink-500 text-white py-2 px-6 rounded-lg mb-4 transition duration-300 hover:bg-pink-600 transform hover:scale-105 flex items-center"
                            onClick={handleRoomCreate}>
                            <FaCamera className="mr-2" />
                            Create Room
                        </button>
                        <form onSubmit={handleRoomJoin} className="w-full">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter Room ID"
                                className="border-2 border-gray-300 p-3 rounded-lg mb-4 w-full transition duration-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                            />
                            <button type="submit" className="bg-pink-500 text-white py-2 px-6 rounded-lg transition duration-300 hover:bg-pink-600 transform hover:scale-105 flex items-center justify-center">
                                <FaUserPlus className="mr-2" />
                                Join Room
                            </button>
                        </form>
                    </div>
                </motion.div>
            ) : (
                <motion.div 
                    className="bg-white p-8 rounded-lg shadow-lg transform transition-transform duration-300"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                    <h2 className="text-2xl mb-4 text-gray-700">Room ID: {roomId}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <video playsInline muted ref={userVideoRef} autoPlay className="rounded-lg shadow-md" />
                        {peers.map((peer, index) => (
                            <Video key={index} peer={peer} />
                        ))}
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
        <video 
            playsInline 
            autoPlay 
            ref={ref} 
            className="rounded-lg shadow-md transition-transform duration-500 hover:scale-105" 
        />
    );
};

export default VideoRoom;
