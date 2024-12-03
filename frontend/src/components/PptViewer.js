import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Chat from './Chat'; // Make sure to import the Chat component
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

function PresentationViewer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);  // Use useRef instead of useState
  const roomId = useParams().roomId;

  useEffect(() => {
    // Example for socket initialization if you're using socket.io (adjust based on your use case)
    const socket = io('https://paletteconnect.onrender.com');  // Assuming you're using socket.io
    socketRef.current = socket;

    // Cleanup on component unmount
    return () => {
      socketRef.current && socketRef.current.disconnect();
    };
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a PowerPoint file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { slides, folder } = response.data;
      const imageUrls = slides.map((slide) => `http://localhost:5000/slides/${folder}/${slide}`);
      setImageUrls(imageUrls);
      setCurrentIndex(0);

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload presentation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (currentIndex < imageUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#2F4550] flex flex-col lg:flex-row items-stretch justify-center p-6 relative overflow-hidden">
      {/* Background Gradient for Visual Appeal */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#CE4760] via-[#2F4550] to-[#CE4760] opacity-10 pointer-events-none"></div>

      <div className="w-full lg:w-2/3 flex flex-col z-10">
        {/* Main Header Section */}
        <header className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center mb-6 z-10">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#CE4760] to-[#2F4550] tracking-wide mb-4 md:mb-0">
            SlideSync
          </h1>
          <div className="flex gap-4 lg:gap-6">
            <input 
              type="file"
              onChange={handleFileChange}
              accept=".pptx"
              className="file:mr-2 lg:file:mr-4 file:px-3 lg:file:px-4 file:py-2 file:rounded-full file:border-0 file:text-xs lg:file:text-sm file:bg-[#CE4760] file:text-white hover:file:bg-opacity-80 file:transition-all file:cursor-pointer"
            />
            <button 
              onClick={handleFileUpload}
              disabled={loading}
              className="bg-[#CE4760] text-white py-2 px-6 lg:py-3 lg:px-8 rounded-full font-semibold text-sm lg:text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upload'}
            </button>
          </div>
        </header>

        {/* Slide Viewer Section */}
        <motion.div 
          className="w-full bg-white rounded-lg shadow-2xl p-4 lg:p-10 flex-grow"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {loading && (
            <div className="flex items-center justify-center h-96 text-[#2F4550] text-xl animate-pulse">
              Processing your presentation...
            </div>
          )}

          {imageUrls.length > 0 && (
            <div className="relative">
              <h2 className="text-xl lg:text-2xl font-semibold text-center mb-4 lg:mb-6">
                Slide <span className="text-[#CE4760]">{currentIndex + 1}</span> of {imageUrls.length}
              </h2>

              <div className="relative flex items-center justify-center">
                <button 
                  onClick={prevImage}
                  disabled={currentIndex === 0}
                  className="absolute left-0 z-10 bg-[#CE4760] text-white p-2 lg:p-4 rounded-full disabled:opacity-30 hover:bg-opacity-80 transition-all shadow-lg"
                >
                  ←
                </button>

                <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentIndex}
                    src={imageUrls[currentIndex]}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    alt={`Slide ${currentIndex + 1}`}
                    className="max-w-full max-h-[50vh] lg:max-h-[70vh] object-contain rounded-xl shadow-2xl"
                  />
                </AnimatePresence>

                <button 
                  onClick={nextImage}
                  disabled={currentIndex === imageUrls.length - 1}
                  className="absolute right-0 z-10 bg-[#CE4760] text-white p-2 lg:p-4 rounded-full disabled:opacity-30 hover:bg-opacity-80 transition-all shadow-lg"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Chat Component Section */}
      <div className="w-full lg:w-1/3 mt-6 lg:mt-0 lg:ml-6">
        <div className="bg-white shadow-xl rounded-lg p-4 h-full overflow-hidden">
          <Chat 
            socketRef={socketRef} 
            roomId={roomId} 
            height={'100%'} 
            className="h-full overflow-y-auto no-scrollbar" 
          />
        </div>
      </div>
    </div>
  );
}

export default PresentationViewer;
