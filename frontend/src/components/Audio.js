import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus, FaMicrophone, FaMicrophoneSlash, FaPalette } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Chat from './Chat'; // Import the Chat component
import Canvas from './Whiteboard';

const WhiteBoardVideoRoom = () => {
    const { roomId } = useParams();
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const audioChunksRef = useRef({}); // Store audio chunks for each user
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

                // Listen for audio streams and store the first 30 seconds
                socketRef.current.on('new user audio', ({ userId, stream }) => {
                    const mediaRecorder = new MediaRecorder(stream);
                    audioChunksRef.current[userId] = [];

                    mediaRecorder.ondataavailable = event => {
                        audioChunksRef.current[userId].push(event.data);
                    };

                    mediaRecorder.onstop = () => {
                        console.log(`Stored audio for user ${userId}`);
                    };

                    mediaRecorder.start();

                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, 30000); // Stop recording after 30 seconds
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

    const playAudioForUser = userId => {
        if (audioChunksRef.current[userId]) {
            const audioBlob = new Blob(audioChunksRef.current[userId], { type: 'audio/ogg; codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
        } else {
            console.error(`No audio stored for user ${userId}`);
        }
    };

    return (
        <div className="min-h-screen bg-white text-[#2F4550] flex flex-col items-center justify-center p-6 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#CE4760] via-[#2F4550] to-[#CE4760] opacity-10 pointer-events-none"></div>
            {roomId ? (
                <motion.div className="w-full max-w-7xl bg-white rounded-lg shadow-2xl p-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl font-semibold text-center mb-6">
                        Room ID: <span className="text-[#CE4760]">{roomId}</span>
                    </h2>
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md">
                                <video playsInline muted ref={userVideoRef} autoPlay className="w-full h-full object-cover" />
                                <div className="absolute top-0 left-0 bg-[#CE4760] text-white text-sm font-semibold px-3 py-1 rounded-bl-lg">
                                    You
                                </div>
                            </div>
                            {peers.map((peer, index) => (
                                <div key={index} className="relative">
                                    <Video peer={peer} />
                                    <button onClick={() => playAudioForUser(peersRef.current[index].peerID)} className="absolute bottom-2 right-2 bg-gray-700 text-white text-sm p-2 rounded">
                                        Play Audio
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="w-full lg:w-1/3 bg-[#F5F5F5] rounded-lg shadow-md p-6">
                            <Chat socketRef={socketRef} roomId={roomId} height={'40px'} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-6 justify-center mt-8">
                        <button onClick={toggleMic} className="bg-[#CE4760] text-white py-3 px-6 rounded-full font-medium shadow-lg hover:scale-105 transition-transform duration-300">
                            {isMicOn ? <FaMicrophone className="inline-block mr-2" /> : <FaMicrophoneSlash className="inline-block mr-2" />}
                            {isMicOn ? "Mute" : "Unmute"}
                        </button>
                        <button onClick={toggleCamera} className="bg-[#2F4550] text-white py-3 px-6 rounded-full font-medium shadow-lg hover:scale-105 transition-transform duration-300">
                            {isCameraOn ? <FaCamera className="inline-block mr-2" /> : <FaCamera className="inline-block mr-2 opacity-50" />}
                            {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                        </button>
                    </div>
                    <Canvas roomId={roomId} />
                </motion.div>
            ) : (
                <motion.div className="w-full max-w-lg bg-gradient-to-br from-white to-[#F5F5F5] rounded-lg shadow-2xl p-10" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <h2 className="text-3xl font-semibold text-center mb-6 text-[#2F4550]">Create or Join a Room</h2>
                    <div className="flex flex-col gap-6">
                        <button className="w-full bg-[#CE4760] text-white py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform duration-300">
                            Create Room
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

    return <video playsInline autoPlay ref={ref} className="rounded-lg shadow-lg w-full" />;
};

export default WhiteBoardVideoRoom;
