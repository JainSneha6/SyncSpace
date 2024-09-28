import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';

const VideoRoom = () => {
    const { roomId } = useParams(); // Get roomId from the URL parameters
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);

    useEffect(() => {
        socketRef.current = io.connect('http://localhost:5000');

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                userVideo.current.srcObject = stream;
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
            });

        return () => {
            socketRef.current.disconnect();
        };
    }, [roomId]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('sending signal', { userToSignal, callerID, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
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
    }

    return (
        <div>
            <h2>Room ID: {roomId}</h2>
            <video playsInline muted ref={userVideo} autoPlay />
            {peers.map((peer, index) => (
                <Video key={index} peer={peer} />
            ))}
        </div>
    );
};

const Video = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return <video playsInline autoPlay ref={ref} />;
};

export default VideoRoom;
