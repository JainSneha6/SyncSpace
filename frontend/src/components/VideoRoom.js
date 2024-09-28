import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { FaChalkboardTeacher } from 'react-icons/fa';

const socket = io('https://paletteconnect.onrender.com'); // Ensure your server URL is correct

const VideoRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [peers, setPeers] = useState([]);
    const userVideo = useRef();
    const peersRef = useRef([]);
    const videoGrid = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            userVideo.current.srcObject = stream; // Show local video

            socket.emit('joinRoom', roomId);

            socket.on('user-connected', (userId) => {
                const peer = createPeer(userId, socket.id, stream);
                peersRef.current.push({ peerID: userId, peer });
                setPeers((users) => [...users, peer]); // Update peers state
            });

            socket.on('signal', ({ signalData, from }) => {
                const peerObj = peersRef.current.find((p) => p.peerID === from);
                if (peerObj) {
                    peerObj.peer.signal(signalData);
                }
            });

            socket.on('user-disconnected', (userId) => {
                const peerObj = peersRef.current.find((p) => p.peerID === userId);
                if (peerObj) {
                    peerObj.peer.destroy(); // Destroy peer on disconnect
                    setPeers((users) => users.filter((p) => p.peerID !== userId)); // Update peers state
                }
            });
        });

        return () => {
            socket.off('user-connected');
            socket.off('signal');
            socket.off('user-disconnected');
        };
    }, [roomId]);

    const createPeer = (userToSignal, callerID, stream) => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('signal', { signalData: signal, to: userToSignal });
        });

        peer.on('stream', (stream) => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            videoGrid.current.append(video); // Add peer's video to the video grid
        });

        return peer;
    };

    const joinWhiteboard = () => {
        navigate(`/room/${roomId}`);
    };

    return (
        <div className="video-room-container">
            <div ref={videoGrid} className="video-grid">
                <video muted ref={userVideo} autoPlay playsInline className="user-video" />
                {/* Peers' videos will be added to videoGrid */}
            </div>
            <button onClick={joinWhiteboard} className="switch-to-whiteboard-btn">
                <FaChalkboardTeacher /> Switch to Whiteboard
            </button>
        </div>
    );
};

export default VideoRoom;
