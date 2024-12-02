import React, { useState, useEffect, useRef } from 'react';
import { FaUserPlus, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';

const AudioRoom = ({ roomId }) => {
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const socketRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

    useEffect(() => {
        socketRef.current = io.connect('https://paletteconnect.onrender.com');

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                streamRef.current = stream;

                socketRef.current.emit('join room', roomId);

                socketRef.current.on('all users', (users) => {
                    const newPeers = [];
                    users.forEach((userID) => {
                        const peer = createPeer(userID, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        });
                        newPeers.push({ peerID: userID, peer });
                    });
                    setPeers(newPeers);
                });

                socketRef.current.on('user joined', (payload) => {
                    const existingPeer = peersRef.current.find(
                        (p) => p.peerID === payload.callerID
                    );
                    if (!existingPeer) {
                        const peer = addPeer(
                            payload.signal,
                            payload.callerID,
                            stream
                        );
                        peersRef.current.push({
                            peerID: payload.callerID,
                            peer,
                        });
                        setPeers((users) => [
                            ...users,
                            { peerID: payload.callerID, peer },
                        ]);
                    }
                });

                socketRef.current.on('receiving returned signal', (payload) => {
                    const item = peersRef.current.find((p) => p.peerID === payload.id);
                    if (item) {
                        item.peer.signal(payload.signal);
                    }
                });
            })
            .catch((err) => console.error('Error accessing media devices:', err));

        return () => {
            if (socketRef.current) socketRef.current.disconnect();

            // Cleanup peer connections
            peersRef.current.forEach(({ peer }) => {
                peer.destroy();
            });
            peersRef.current = [];

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [roomId]);

    const toggleMic = () => {
        const audioTracks = streamRef.current.getAudioTracks();
        audioTracks.forEach((track) => {
            track.enabled = !track.enabled;
        });
        setIsMicOn((prev) => !prev);
    };

    const createPeer = (userToSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socketRef.current.emit('sending signal', {
                userToSignal,
                callerID,
                signal,
            });
        });

        return peer;
    };

    const addPeer = (incomingSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socketRef.current.emit('returning signal', {
                signal,
                callerID,
            });
        });

        peer.signal(incomingSignal);

        return peer;
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center justify-center p-6">
            <motion.div
                className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <h2 className="text-xl font-semibold text-center mb-4">
                    Room ID: <span className="text-blue-500">{roomId}</span>
                </h2>
                <div className="flex flex-wrap gap-4 justify-center mb-6">
                    {peers.map((peerObj) => {
                        if (peerObj.peerID === socketRef.current.id) return null;
                        return (
                            <Audio key={peerObj.peerID} peer={peerObj.peer} />
                        );
                    })}
                    {peers.length === 0 && (
                        <p className="text-gray-500">No participants yet...</p>
                    )}
                </div>
                <div className="flex justify-center">
                    <button
                        onClick={toggleMic}
                        className={`py-2 px-4 rounded-full shadow-md text-white ${
                            isMicOn ? 'bg-red-500' : 'bg-green-500'
                        }`}
                    >
                        {isMicOn ? (
                            <>
                                <FaMicrophone className="inline-block mr-2" />
                                Mute
                            </>
                        ) : (
                            <>
                                <FaMicrophoneSlash className="inline-block mr-2" />
                                Unmute
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const Audio = ({ peer }) => {
    const audioRef = useRef();

    useEffect(() => {
        peer.on('stream', (stream) => {
            if (audioRef.current && audioRef.current.srcObject !== stream) {
                audioRef.current.srcObject = stream;
            }
        });

        return () => {
            peer.removeAllListeners('stream');
        };
    }, [peer]);

    return <audio ref={audioRef} autoPlay controls />;
};

export default AudioRoom;
