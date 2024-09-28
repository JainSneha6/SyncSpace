// VideoRoom.js
import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaCamera, FaAirbnb } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';

const VideoRoom = () => {
    const { roomId } = useParams();
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-200 to-gray-300 p-4">
            <h1 className="text-5xl font-bold mb-8 text-pink-600 drop-shadow-lg">Video Room: {roomId}</h1>
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
                        <p className="text-gray-600">Waiting for participants...</p>
                    </div>
                )}
            </div>
            <div className="flex justify-center mt-4">
                <button onClick={toggleMic} className="bg-pink-500 text-white py-2 px-4 rounded-lg mr-4 transition duration-300 hover:bg-pink-600 flex items-center">
                    {isMicOn ? <FaMicrophone className="mr-2" /> : <FaMicrophoneSlash className="mr-2" />}
                    {isMicOn ? "Mute" : "Unmute"}
                </button>
                <button onClick={toggleCamera} className="bg-pink-500 text-white py-2 px-4 rounded-lg transition duration-300 hover:bg-pink-600 flex items-center">
                    {isCameraOn ? <FaCamera className="mr-2" /> : <FaAirbnb className="mr-2 opacity-50" />}
                    {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                </button>
            </div>
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
        <div className="relative">
            <video 
                playsInline 
                autoPlay 
                ref={ref} 
                className="rounded-lg shadow-md w-full" 
            />
            <div className="absolute top-0 left-0 bg-gray-700 text-white text-sm font-semibold p-1 rounded-bl-lg">Participant</div>
        </div>
    );
};

export default VideoRoom;
