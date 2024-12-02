import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const AudioRoom = ({ roomId }) => {
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
                    users.forEach((userId) => {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        peersRef.current.push({ peerID: userId, peer });
                    });
                });

                // Handle new user joining
                socketRef.current.on('user joined', (payload) => {
                    const peerExists = peersRef.current.find(
                        (p) => p.peerID === payload.callerID
                    );
                    if (!peerExists) {
                        const peer = addPeer(payload.signal, payload.callerID, stream);
                        peersRef.current.push({ peerID: payload.callerID, peer });
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
        const audioTracks = streamRef.current.getAudioTracks();
        audioTracks.forEach((track) => (track.enabled = !track.enabled));
        setIsMicOn((prev) => !prev);
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
        <div>
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
        </div>
    );
};

export default AudioRoom;
