import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const AudioRoom = ({ roomId }) => {
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const socketRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

    useEffect(() => {
        socketRef.current = io.connect('https://paletteconnect.onrender.com');

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                streamRef.current = stream;

                socketRef.current.emit('join room', roomId);

                // Handle existing users
                socketRef.current.on('all users', (users) => {
                    const newPeers = users.map((userId) => {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        peersRef.current.push({ peerID: userId, peer });
                        return { peerID: userId, peer };
                    });
                    setPeers(newPeers);
                });

                // Handle new user joining
                socketRef.current.on('user joined', (payload) => {
                    const peerExists = peersRef.current.find(
                        (p) => p.peerID === payload.callerID
                    );
                    if (!peerExists) {
                        const peer = addPeer(payload.signal, payload.callerID, stream);
                        peersRef.current.push({ peerID: payload.callerID, peer });
                        setPeers((prev) => [...prev, { peerID: payload.callerID, peer }]);
                    }
                });

                // Handle signal from existing peer
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
            peersRef.current.forEach(({ peer }) => peer.destroy());
            peersRef.current = [];
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [roomId]);

    const toggleMic = () => {
        if (streamRef.current) {
            const audioTracks = streamRef.current.getAudioTracks();
            audioTracks.forEach((track) => {
                track.enabled = !track.enabled;
            });
            const micState = audioTracks.some((track) => track.enabled);
            setIsMicOn(micState);
        }
    };

    const createPeer = (userToSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
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

        peer.on('signal', (signal) => {
            socketRef.current.emit('returning signal', { signal, callerID });
        });

        peer.signal(incomingSignal);

        return peer;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <button
                onClick={toggleMic}
                className={`py-3 px-6 rounded-full shadow-md text-white ${
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
            {/* Hidden audio elements to process streams */}
            {peers.map((peerObj) => (
                <audio
                    key={peerObj.peerID}
                    ref={(ref) => {
                        if (ref) {
                            peerObj.peer.on('stream', (stream) => {
                                if (ref.srcObject !== stream) {
                                    ref.srcObject = stream;
                                }
                            });
                        }
                    }}
                    style={{ display: 'none' }}
                    autoPlay
                />
            ))}
        </div>
    );
};

export default AudioRoom;
