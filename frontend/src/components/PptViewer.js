import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Quiz from './QuizComponent';

// Set the worker source
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js`;

const extractTextFromPDF = async (file) => {
  try {
    const pdfData = await file.arrayBuffer();
    const pdfDoc = await getDocument({ data: pdfData }).promise;
    let text = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      text += `Page ${i}:
      ${pageText}
      \n`;
    }

    return text.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF.');
  }
};

function PresentationViewer({ roomId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState([]);

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io('https://syncspace-ewrk-git-main-siddhartha-chakrabartys-projects.vercel.app/');

    socketRef.current.emit('joinRoom', roomId);

    socketRef.current.on('pptUploaded', (pptData) => {
      setImageUrls(pptData.slides || []);
      setPdfUrl(pptData.pdf || '');
      setCurrentIndex(0);
      // Reset to the first slide when new PPT is uploaded
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

    const extractedText = await extractTextFromPDF(selectedFile);
    console.log('Extracted text:', extractedText);

    const transcriptData = {
      transcript: extractedText, // Use the extracted text here
    };

    try {
      // Send the extracted text to the backend in the required format
      // const response = await axios.post('https://backendfianlsih.azurewebsites.net/trans_quiz/get_questions', transcriptData);

      // console.log('Backend response:', response.data);
      // setQuiz(response.data);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('roomId', roomId);

      const pptResponse = await axios.post('https://paletteconnect.onrender.com/uploadPpt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const pptData = pptResponse.data;
      setImageUrls(pptData.slides || []);
      setPdfUrl(pptData.pdf || '');
      setCurrentIndex(0); // Reset to the first slide

      // Emit the ppt data to all users in the room
      socketRef.current.emit('uploadPpt', { roomId, pptFileData: pptData });
    } catch (error) {
      console.error('Error uploading PPT or fetching quiz:', error.response || error.message);
      alert('Failed to upload presentation or fetch quiz. Please try again.');
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

  const navigateToQuiz = () => {
    navigate('/quiz', { state: { quizData: quiz } });
  }
  console.log(roomId)
  return (
    <div className="min-h-screen bg-white text-white flex flex-col items-center justify-center p-6 relative">
      {/* Background Gradient for Visual Appeal */}
      <div className="absolute inset-0 bg-white opacity-10 pointer-events-none"></div>

      {!imageUrls.length && (
        <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl p-10">
          <h2 className="text-3xl font-semibold text-center mb-6 text-[#2F4550]">
            Upload a PowerPoint Presentation
          </h2>
          <div className="flex flex-col gap-6">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf"
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
          <div>
            <button
              className="bg-[#CE4760] text-white p-4 rounded-lg shadow-lg transition-all duration-300 hover:bg-[#2F4550] hover:scale-105"
              onClick={navigateToQuiz}
            >
              Take the Quiz!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresentationViewer;
