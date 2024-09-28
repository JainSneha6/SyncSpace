import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus, FaMicrophone, FaMicrophoneSlash, FaPalette } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const VideoRoom = () => {
    const [roomId, setRoomId] = useState('');
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const navigate = useNavigate(); // Initialize useNavigate

    useEffect(() => {
        socketRef.current = io.connect('https://cn-s47u.onrender.com'); // Your backend URL
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                userVideoRef.current.srcObject = stream;
                streamRef.current = stream;
                socketRef.current.emit('join room', roomId);

                socketRef.current.on('all users', users => {
                    const peers = [];
                    users.forEach(userID => {
                        const peer = createPeer(userID, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        });
                        peers.push(peer);
                    });
                    setPeers(peers);
                });

                socketRef.current.on('user joined', userID => {
                    const peer = addPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    });
                    setPeers(users => [...users, peer]);
                });

                socketRef.current.on('receiving returned signal', payload => {
                    const peer = peersRef.current.find(p => p.peerID === payload.id);
                    peer.peer.signal(payload.signal);
                });
            });

        return () => {
            socketRef.current.disconnect();
            streamRef.current.getTracks().forEach(track => track.stop());
        };
    }, [roomId]);

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

    const addPeer = (incomingID, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('returning signal', { signal, callerID });
        });

        peer.signal(incomingID);
        return peer;
    };

    const toggleMic = () => {
        setIsMicOn(prev => !prev);
        streamRef.current.getAudioTracks()[0].enabled = !isMicOn;
    };

    const toggleCamera = () => {
        setIsCameraOn(prev => !prev);
        streamRef.current.getVideoTracks()[0].enabled = !isCameraOn;
    };

    // Button to navigate to whiteboard
    const goToWhiteboard = () => {
        navigate(`/whiteboard/${roomId}`); // Assuming your whiteboard route is /whiteboard/:roomId
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-200 to-gray-300 p-4">
            <h1 className="text-5xl font-bold mb-8 text-pink-600 drop-shadow-lg">PaletteConnect</h1>
            {!roomId ? (
                <div>
                    <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="Enter Room ID"
                        className="border p-2 rounded mb-4"
                    />
                    <button onClick={() => socketRef.current.emit('join room', roomId)} className="bg-pink-500 text-white py-2 px-4 rounded-lg transition duration-300 hover:bg-pink-600">
                        Join Room
                    </button>
                </div>
            ) : (
                <motion.div 
                    className="bg-white p-4 rounded-lg shadow-lg transform transition-transform duration-300 w-full"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                    <h2 className="text-2xl mb-4 text-gray-700 text-center">Room ID: {roomId}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <video playsInline muted ref={userVideoRef} autoPlay className="rounded-lg shadow-md w-full" />
                            <div className="absolute top-0 left-0 bg-pink-500 text-white text-sm font-semibold p-1 rounded-bl-lg">You</div>
                        </div>
                        {peers.length > 0 ? (
                            peers.map((peer, index) => (
                                <Video key={index} peer={peer} />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-48 bg-gray-200 rounded-lg">
                                <p className="text-gray-600">Waiting for a participant...</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center mt-4">
                        <button onClick={toggleMic} className="bg-pink-500 text-white py-2 px-4 rounded-lg mr-4 transition duration-300 hover:bg-pink-600 flex items-center">
                            {isMicOn ? <FaMicrophone className="mr-2" /> : <FaMicrophoneSlash className="mr-2" />}
                            {isMicOn ? "Mute" : "Unmute"}
                        </button>
                        <button onClick={toggleCamera} className="bg-pink-500 text-white py-2 px-4 rounded-lg transition duration-300 hover:bg-pink-600 flex items-center">
                            {isCameraOn ? <FaCamera className="mr-2" /> : <FaCamera className="mr-2 opacity-50" />}
                            {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                        </button>
                    </div>
                    <button onClick={goToWhiteboard} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg transition duration-300 hover:bg-blue-600 flex items-center">
                        <FaPalette className="mr-2" />
                        Go to Whiteboard
                    </button>
                </motion.div>
            )}
        </div>
    );
};

// Video component
const Video = ({ peer }) => {
    const videoRef = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            videoRef.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <div className="relative">
            <video playsInline ref={videoRef} autoPlay className="rounded-lg shadow-md w-full" />
            <div className="absolute top-0 left-0 bg-green-500 text-white text-sm font-semibold p-1 rounded-bl-lg">Participant</div>
        </div>
    );
};

export default VideoRoom;
