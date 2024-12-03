import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const VoiceChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Connect to Socket.IO server
    socketRef.current = io('https://paletteconnect.onrender.com');

    // Listen for audio streams from other users
    socketRef.current.on('audio-stream', (data) => {
      if (audioRef.current) {
        const blob = new Blob([data], { type: 'audio/webm' });
        audioRef.current.src = URL.createObjectURL(blob);
        audioRef.current.play();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
          socketRef.current.emit('audio-data', event.data);
        }
      };

      mediaRecorderRef.current.start(100); // Emit data every 100ms
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl mb-4">Real-Time Voice Chat</h1>
      <div className="flex justify-center space-x-4">
        <button 
          onClick={startRecording} 
          disabled={isRecording}
          className={`px-4 py-2 rounded ${
            isRecording 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          Start Recording
        </button>
        <button 
          onClick={stopRecording} 
          disabled={!isRecording}
          className={`px-4 py-2 rounded ${
            !isRecording 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-red-500 hover:bg-red-600'
          } text-white`}
        >
          Stop Recording
        </button>
      </div>
      <audio ref={audioRef} className="mt-4" />
    </div>
  );
};

export default VoiceChat;