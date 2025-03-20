import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus, FaMicrophone, FaMicrophoneSlash, FaPalette, FaFilePowerpoint } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Chat from './Chat'; // Import the Chat component
import PresentationViewer from './PptViewer';
import html2canvas from 'html2canvas';

const VideoRoom = () => {
    const [roomId, setRoomId] = useState('');
    const [peers, setPeers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const navigate = useNavigate();

    // Video recording variables
    const [userRecorder, setUserRecorder] = useState(null);
    const [peerRecorders, setPeerRecorders] = useState([]);
    const [userRecordingData, setUserRecordingData] = useState([]);
    const [peerRecordingData, setPeerRecordingData] = useState([]);

    useEffect(() => {
        socketRef.current = io.connect('https://syncspacebackend.vercel.app/');

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                streamRef.current = stream;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = stream;
                }

                captureAndSendScreenshot();

                // Initialize user video recording for the first 30 seconds
                const userRecorderInstance = new MediaRecorder(stream);
                const userRecordedChunks = [];
                userRecorderInstance.ondataavailable = (e) => {
                    userRecordedChunks.push(e.data);
                };
                userRecorderInstance.onstop = () => {
                    setUserRecordingData(userRecordedChunks);
                    // Optionally, you can save the file here
                    const userBlob = new Blob(userRecordedChunks, { type: 'video/webm' });
                    const userUrl = URL.createObjectURL(userBlob);
                    console.log('User Video Recording URL:', userUrl);
                };
                setUserRecorder(userRecorderInstance);

                userRecorderInstance.start();
                setTimeout(() => {
                    userRecorderInstance.stop();
                }, 30000); // Stop after 30 seconds

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

            // Stop peer recordings when the component unmounts
            peerRecorders.forEach(recorder => {
                recorder.stop();
            });
        };
    }, [roomId]);

    const captureAndSendScreenshot = () => {
        if (!userVideoRef.current) {
            console.error("User video element not available.");
            return;
        }

        html2canvas(userVideoRef.current, { useCORS: true }) // Ensure CORS is handled
            .then(canvas => {
                const screenshotData = canvas.toDataURL('image/png');
                console.log("Screenshot Data:", screenshotData.slice(0, 100)); // Debugging
                sendScreenshotToBackend(screenshotData);
            })
            .catch(error => console.error('Error capturing screenshot:', error));
    };


    const sendScreenshotToBackend = (imageData) => {
        fetch('http://localhost:5000/upload_img', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData }),  // Send base64 image
        })
            .then(response => response.json())
            .then(data => console.log('Screenshot sent successfully:', data))
            .catch(error => console.error('Error sending screenshot:', error));
    };

    useEffect(() => {
        // Set up peer video recording when a peer joins
        peers.forEach(peer => {
            const peerRecorderInstance = new MediaRecorder(peer.stream);
            const peerRecordedChunks = [];
            peerRecorderInstance.ondataavailable = (e) => {
                peerRecordedChunks.push(e.data);
            };
            peerRecorderInstance.onstop = () => {
                setPeerRecordingData(prev => [...prev, peerRecordedChunks]);
                // Optionally, you can save the peer video here
                const peerBlob = new Blob(peerRecordedChunks, { type: 'video/webm' });
                const peerUrl = URL.createObjectURL(peerBlob);
                console.log(`Peer ${peer.peerID} Video Recording URL:`, peerUrl);
            };
            peerRecorderInstance.start();
            setPeerRecorders(prev => [...prev, peerRecorderInstance]);

            // Stop after 30 seconds
            setTimeout(() => {
                peerRecorderInstance.stop();
            }, 30000); // Stop after 30 seconds
        });

        // Clean up peer recorders when peers change
        return () => {
            peerRecorders.forEach(recorder => recorder.stop());
        };
    }, [peers]);

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

    const handleRoomCreate = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        setRoomId(newRoomId);
    };

    const handleRoomJoin = (e) => {
        e.preventDefault();
        // Room ID is already set in state
    };

    const goToWhiteboard = () => {
        navigate(`/whiteboard/${roomId}`);
    };

    const goToPptViewer = () => {
        navigate(`/ppt/${roomId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-blue-500 to-teal-500 text-white flex flex-col items-center justify-center p-6 relative">
            {/* Background Gradient for Visual Appeal */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 opacity-10 pointer-events-none"></div>

            {/* Room Creation or Join Section */}
            {!roomId ? (
                <motion.div
                    className="w-full max-w-lg bg-gradient-to-br from-white to-[#F5F5F5] rounded-lg shadow-2xl p-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}>
                    <h2 className="text-3xl font-semibold text-center mb-6 text-[#2F4550]">
                        Create or Join a Room
                    </h2>

                    <div className="flex flex-col gap-6">
                        <button
                            onClick={handleRoomCreate}
                            className="w-full bg-blue-500 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform duration-300">
                            <FaCamera className="inline-block mr-2" />
                            Create Room
                        </button>
                        <form onSubmit={handleRoomJoin} className="flex flex-col gap-6">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter Room ID"
                                className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#CE4760] text-lg"
                            />
                            <button
                                type="submit"
                                className="w-full bg-teal-500 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform duration-300">
                                <FaUserPlus className="inline-block mr-2" />
                                Join Room
                            </button>
                        </form>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    className="w-full max-w-7xl bg-white rounded-lg shadow-2xl p-10"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl font-semibold text-center mb-6">
                        Room ID: <span className="text-teal-500">{roomId}</span>
                    </h2>

                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md">
                                <video
                                    playsInline
                                    muted
                                    ref={userVideoRef}
                                    autoPlay
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0 left-0 bg-teal-500 text-white text-sm font-semibold px-3 py-1 rounded-bl-lg">
                                    You
                                </div>
                            </div>
                            {peers.length > 0 ? (
                                peers.map((peer, index) => (
                                    <Video key={index} peer={peer} />
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg shadow-inner">
                                    <p className="text-gray-500">Waiting for participants...</p>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Chat Section */}
                        <div className="w-full lg:w-1/3 bg-[#F5F5F5] rounded-lg shadow-md p-6">
                            <Chat socketRef={socketRef} roomId={roomId} height={'40px'} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-6 justify-center mt-8">
                        <button
                            onClick={toggleMic}
                            className="bg-teal-500 text-white py-3 px-6 rounded-full font-medium shadow-lg hover:scale-105 transition-transform duration-300">
                            {isMicOn ? <FaMicrophone className="inline-block mr-2" /> : <FaMicrophoneSlash className="inline-block mr-2" />}
                            {isMicOn ? "Mute" : "Unmute"}
                        </button>
                        <button
                            onClick={toggleCamera}
                            className="bg-blue-500 text-white py-3 px-6 rounded-full font-medium shadow-lg hover:scale-105 transition-transform duration-300">
                            {isCameraOn ? <FaCamera className="inline-block mr-2" /> : <FaCamera className="inline-block mr-2 opacity-50" />}
                            {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                        </button>
                        <div className="flex gap-6">
                            <button
                                onClick={goToWhiteboard}
                                className="bg-teal-500 text-white py-3 px-8 rounded-full font-semibold text-lg shadow-lg  hover:scale-105 transition-transform duration-300">
                                <FaPalette className="inline-block mr-2" />
                                Whiteboard
                            </button>
                            <button
                                onClick={goToPptViewer}
                                className="bg-blue-500 text-white py-3 px-8 rounded-full font-semibold text-lg shadow-lg  hover:scale-105 transition-transform duration-300">
                                <FaFilePowerpoint className="inline-block mr-2" />
                                PptViewer
                            </button>
                        </div>
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

    return (
        <div className="relative">
            <video
                playsInline
                autoPlay
                ref={ref}
                className="rounded-lg shadow-lg w-full"
            />
            <div className="absolute top-0 left-0 bg-gray-700 text-white text-sm font-semibold p-1 rounded-bl-lg">Participant</div>
        </div>
    );
};

export default VideoRoom;
