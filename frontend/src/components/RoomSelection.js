import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoomSelection = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const newRoomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    navigate(`/video/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (roomId) {
      navigate(`/video/${roomId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <h2 className="text-4xl font-bold text-pink-500 mb-6">PaletteConnect</h2>
      <button
        onClick={handleCreateRoom}
        className="bg-pink-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-pink-600 transition duration-300 mb-4"
      >
        Create Room
      </button>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter Room ID"
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <button
          onClick={handleJoinRoom}
          className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-md hover:bg-gray-900 transition duration-300"
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default RoomSelection;
