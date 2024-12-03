import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

function PresentationViewer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);
  const { roomId } = useParams(); // Assuming roomId comes from the URL

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io('http://localhost:5001');  // Replace with your backend URL

    // Join the room and listen for PPT updates
    socketRef.current.emit('joinRoom', roomId);

    socketRef.current.on('pptUploaded', (pptData) => {
      setImageUrls(pptData.slides);
      setPdfUrl(pptData.pdf);
      setCurrentIndex(0); // Reset to first slide
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PowerPoint file.');
      return;
    }
  
    setLoading(true);
    const formData = new FormData();
    
    // Convert the selectedFile into a Blob before appending to FormData
    const fileBlob = new Blob([selectedFile], { type: selectedFile.type });
    
    formData.append('file', fileBlob, selectedFile.name); // Append the Blob to the FormData
    formData.append('roomId', roomId); // Send roomId with the file
  
    try {
      const response = await axios.post('http://localhost:5001/uploadPpt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      const pptData = response.data;
      setImageUrls(pptData.slides);
      setPdfUrl(pptData.pdf);
      setCurrentIndex(0); // Reset to first slide
    } catch (error) {
      console.error('Error uploading PPT:', error);
      alert('Failed to upload presentation. Please try again.');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* If PPT is not uploaded, show upload form */}
      {!imageUrls.length && (
        <div className="w-full max-w-lg bg-gradient-to-br from-white to-[#F5F5F5] rounded-lg shadow-2xl p-10">
          <h2 className="text-3xl font-semibold text-center mb-6">Upload a PowerPoint Presentation</h2>

          <div className="flex flex-col gap-6">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pptx"
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

      {/* If PPT is already uploaded, display slides */}
      {imageUrls.length > 0 && (
        <div className="w-full max-w-7xl bg-white rounded-lg shadow-2xl p-10">
          <div className="relative flex items-center justify-center">
            <h2 className="text-xl lg:text-2xl font-semibold text-center mb-4">
              Slide <span className="text-[#CE4760]">{currentIndex + 1}</span> of {imageUrls.length}
            </h2>

            <button onClick={prevImage} disabled={currentIndex === 0} className="absolute left-0 z-10 bg-[#CE4760] text-white p-2 lg:p-4 rounded-full disabled:opacity-30">
              ←
            </button>

            <img
              src={imageUrls[currentIndex]}
              alt={`Slide ${currentIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
            />

            <button onClick={nextImage} disabled={currentIndex === imageUrls.length - 1} className="absolute right-0 z-10 bg-[#CE4760] text-white p-2 lg:p-4 rounded-full disabled:opacity-30">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresentationViewer;
