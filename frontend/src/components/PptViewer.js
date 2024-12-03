import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import Chat from './Chat';
import AudioRoom from "./Mic";

function PresentationViewer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);
  const { roomId } = useParams();

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io('http://localhost:5001');

    socketRef.current.emit('joinRoom', roomId);

    socketRef.current.on('pptUploaded', (pptData) => {
      setImageUrls(pptData.slides || []);
      setPdfUrl(pptData.pdf || '');
      setCurrentIndex(0);  // Reset to the first slide when new PPT is uploaded
    });

    socketRef.current.on('slideUpdated', (newIndex) => {
      setCurrentIndex(newIndex);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PowerPoint file.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('roomId', roomId);

    try {
      const response = await axios.post('http://localhost:5001/uploadPpt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const pptData = response.data;
      setImageUrls(pptData.slides || []);
      setPdfUrl(pptData.pdf || '');
      setCurrentIndex(0); // Reset to the first slide

      // Emit the ppt data to all users in the room
      socketRef.current.emit('uploadPpt', { roomId, pptFileData: pptData });
    } catch (error) {
      console.error('Error uploading PPT:', error.response || error.message);
      alert('Failed to upload presentation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (currentIndex < imageUrls.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      socketRef.current.emit('slideChanged', { roomId, currentIndex: newIndex });
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      socketRef.current.emit('slideChanged', { roomId, currentIndex: newIndex });
    }
  };

  return (
    <div className="min-h-screen bg-white text-white flex flex-col items-center justify-center p-6 relative">
      {/* Background Gradient for Visual Appeal */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#CE4760] via-[#2F4550] to-[#CE4760] opacity-10 pointer-events-none"></div>

      {!imageUrls.length && (
        <div className="w-full max-w-lg bg-gradient-to-br from-white to-[#F5F5F5] rounded-lg shadow-2xl p-10">
          <h2 className="text-3xl font-semibold text-center mb-6 text-[#2F4550]">
            Upload a PowerPoint Presentation
          </h2>
          <div className="flex flex-col gap-6">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".ppt,.pptx"
              className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#CE4760] text-lg"
            />
            <button
              onClick={handleFileUpload}
              disabled={loading}
              className="w-full bg-[#CE4760] text-white py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform duration-300 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {imageUrls.length > 0 && (
        <div className="w-full max-w-5xl bg-[#2F4550] rounded-lg shadow-2xl p-10 flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <AudioRoom roomId={roomId} />
            <div className="relative flex flex-col items-center justify-center gap-4">
              <h2 className="text-xl lg:text-2xl font-semibold mb-4">
                Slide <span className="text-[#CE4760]">{currentIndex + 1}</span> of {imageUrls.length}
              </h2>

              <div className="relative w-full flex items-center justify-between">
                <button
                  onClick={prevImage}
                  disabled={currentIndex === 0}
                  className="absolute left-0 z-10 bg-[#CE4760] text-white p-3 rounded-full disabled:opacity-30"
                >
                  ←
                </button>

                <img
                  src={imageUrls[currentIndex]}
                  alt={`Slide ${currentIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg"
                />

                <button
                  onClick={nextImage}
                  disabled={currentIndex === imageUrls.length - 1}
                  className="absolute right-0 z-10 bg-[#CE4760] text-white p-3 rounded-full disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 bg-[#2F4550] rounded-lg shadow-md p-6 text-black">
            <Chat socketRef={socketRef} roomId={roomId} height={'400px'} />
          </div>
        </div>
      )}
    </div>
  );
}


export default PresentationViewer;
