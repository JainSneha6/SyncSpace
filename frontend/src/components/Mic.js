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

        // Get user audio stream
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                streamRef.current = stream;

                // Notify server of joining room
                socketRef.current.emit('join room', roomId);

                // Handle existing users
                socketRef.current.on('all users', users => {
                    const newPeers = [];
                    users.forEach(userId => {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: userId,
                            peer,
                        });
                        newPeers.push(peer);
                    });
                    setPeers(newPeers);
                });

                // Handle new user joining
                socketRef.current.on('user joined', payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    });
                    setPeers(prevPeers => [...prevPeers, peer]);
                });

                // Handle return signal
                socketRef.current.on('receiving returned signal', payload => {
                    const peerObj = peersRef.current.find(p => p.peerID === payload.id);
                    if (peerObj?.peer) {
                        peerObj.peer.signal(payload.signal);
                    }
                });
            })
            .catch(err => {
                console.error("Error accessing audio devices:", err);
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
        const audioTracks = streamRef.current?.getAudioTracks();
        audioTracks?.forEach(track => {
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
        <div className="audio-controls">
            {peers.map((peerObj, index) => (
                <Audio key={index} peer={peerObj.peer} />
            ))}
            <button onClick={toggleMic} className="toggle-mic">
                {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                {isMicOn ? "Mute" : "Unmute"}
            </button>
        </div>
    );
};

const Audio = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        if (peer) {
            peer.on('stream', stream => {
                console.log("Stream received:", stream);
                if (ref.current) {
                    ref.current.srcObject = stream;
                }
            });
        }

        return () => {
            if (peer) {
                peer.removeAllListeners('stream');
            }
        };
    }, [peer]);

    return peer ? <audio controls autoPlay ref={ref} /> : null;
};

export default AudioRoom;
