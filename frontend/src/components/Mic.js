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

        // Get the audio stream
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                streamRef.current = stream;

                // Join the room
                socketRef.current.emit('join room', roomId);

                // Handle existing users in the room
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

                // Handle a new user joining the room
                socketRef.current.on('user joined', payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    });
                    setPeers(users => [...users, peer]);
                });

                // Handle receiving returned signal
                socketRef.current.on('receiving returned signal', payload => {
                    const peer = peersRef.current.find(p => p.peerID === payload.id);
                    if (peer) peer.peer.signal(payload.signal);
                });
            })
            .catch(err => {
                console.error("Error accessing media devices:", err);
            });

        // Clean up on component unmount
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
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

        peer.on('disconnect', () => {
            removePeer(userToSignal);
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

        peer.on('disconnect', () => {
            removePeer(callerID);
        });

        peer.signal(incomingSignal);

        return peer;
    };

    const removePeer = (peerID) => {
        setPeers(peers => peers.filter(peer => peer.peerID !== peerID));
        peersRef.current = peersRef.current.filter(peer => peer.peerID !== peerID);
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
        peer.on('stream', stream => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        });

        return () => {
            peer.removeAllListeners('stream');
        };
    }, [peer]);

    return <audio controls autoPlay ref={ref} />;
};

export default AudioRoom;
