import React from "react";
import { Link } from "react-router-dom"; // Import Link for routing

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-[#CE4760] via-[#2F4550] to-[#CE4760] flex flex-col items-center justify-center p-6 text-white">
      <div className="text-center">
        <p className="text-xl mb-12">Choose your preferred session to begin</p>
        
        <div className="flex flex-col sm:flex-row sm:gap-12 gap-8">
          <Link
            to="/video-call-whiteboard"
            className="bg-[#2F4550] text-white p-6 rounded-lg shadow-lg transform transition duration-300 hover:scale-105 hover:bg-[#CE4760] w-60 text-center"
          >
            <h2 className="text-2xl font-semibold mb-4">Video Call + Whiteboard</h2>
            <p className="text-lg">Collaborate seamlessly with video call and drawing tools</p>
          </Link>

          <Link
            to="/video-call-ppt-viewer"
            className="bg-[#2F4550] text-white p-6 rounded-lg shadow-lg transform transition duration-300 hover:scale-105 hover:bg-[#CE4760] w-60 text-center"
          >
            <h2 className="text-2xl font-semibold mb-4">Video Call + PPT Viewer</h2>
            <p className="text-lg">Present and share slides with real-time interaction</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
