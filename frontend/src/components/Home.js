// Home.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaUserPlus } from 'react-icons/fa';

const Home = () => {
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    const handleRoomCreate = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        navigate(`/video-room/${newRoomId}`); // Navigate to the new room
    };

    const handleRoomJoin = (e) => {
        e.preventDefault();
        if (roomId) {
            navigate(`/video-room/${roomId}`); // Navigate to the specified room ID
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-200 to-gray-300 p-4">
            <h1 className="text-5xl font-bold mb-8 text-pink-600 drop-shadow-lg">PaletteConnect</h1>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <div className="flex flex-col items-center">
                    <button 
                        className="bg-pink-500 text-white py-2 px-6 rounded-lg mb-4 transition duration-300 hover:bg-pink-600 transform hover:scale-105 flex items-center"
                        onClick={handleRoomCreate}>
                        <FaCamera className="mr-2" />
                        Create Room
                    </button>
                    <form onSubmit={handleRoomJoin} className="w-full">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Enter Room ID"
                            className="border-2 border-gray-300 p-3 rounded-lg mb-4 w-full transition duration-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                        />
                        <button type="submit" className="bg-pink-500 text-white py-2 px-6 rounded-lg transition duration-300 hover:bg-pink-600 transform hover:scale-105 flex items-center justify-center">
                            <FaUserPlus className="mr-2" />
                            Join Room
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Home;
