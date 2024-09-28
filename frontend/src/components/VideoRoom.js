import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FaChalkboardTeacher } from 'react-icons/fa';

const socket = io('http://localhost:5000');

const VideoRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [peers, setPeers] = useState([]);
    const userVideo = useRef();
    const peersRef = useRef([]);
    const videoGrid = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            userVideo.current.srcObject = stream;

            socket.emit('joinRoom', roomId);

            socket.on('user-connected', (userId) => {
                const peer = createPeer(userId, socket.id, stream);
                peersRef.current.push({
                    peerID: userId,
                    peer,
                });
                setPeers((users) => [...users, peer]);
            });

            socket.on('signal', ({ signalData, from }) => {
                const peerObj = peersRef.current.find((p) => p.peerID === from);
                peerObj?.peer.signal(signalData);
            });

            socket.on('user-disconnected', (userId) => {
                const peerObj = peersRef.current.find((p) => p.peerID === userId);
                if (peerObj) {
                    peerObj.peer.destroy();
                    setPeers((users) => users.filter((p) => p.peerID !== userId));
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
        const peer = new window.SimplePeer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('signal', { roomId, signalData: signal, to: userToSignal });
        });

        peer.on('stream', (stream) => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            videoGrid.current.append(video);
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
