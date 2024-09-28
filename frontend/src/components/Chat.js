import React, { useState, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const Chat = ({ socketRef, roomId }) => {
  const [messages, setMessages] = useState([]);  // State for chat messages
  const [newMessage, setNewMessage] = useState('');  // State for new message input

  useEffect(() => {
    // Listen for chat history when joining a room
    if (socketRef.current) {
      socketRef.current.on('chatHistory', (history) => {
        setMessages(history);  // Load chat history
      });

      // Listen for incoming messages
      socketRef.current.on('receiveMessage', ({ message, id }) => {
        setMessages(prevMessages => [...prevMessages, { message, id }]);
      });

      return () => {
        socketRef.current.off('chatHistory');
        socketRef.current.off('receiveMessage');
      };
    }
  }, [socketRef]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() !== '' && roomId) {  // Ensure message is not empty and roomId exists
      socketRef.current.emit('sendMessage', { roomId, message: newMessage });
      setMessages(prevMessages => [...prevMessages, { message: newMessage, id: socketRef.current.id }]);  // Add sender's message immediately
      setNewMessage('');  // Clear the input field
    }
  };

  const renderMessages = () => {
    return messages.map((msg, index) => (
      <div key={index} className={`mb-2 ${msg.id === socketRef.current.id ? 'text-right' : ''}`}>
        <span className={`inline-block px-2 py-1 rounded-lg ${msg.id === socketRef.current.id ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {msg.message}
        </span>
      </div>
    ));
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Chat</h3>
      <div className="h-40 border border-gray-300 rounded-lg overflow-y-auto p-2 mb-2">
        {renderMessages()}
      </div>
      <form onSubmit={handleSendMessage} className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="border border-gray-300 p-2 rounded-lg flex-grow"
        />
        <button type="submit" className="bg-pink-500 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-pink-600 flex items-center">
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default Chat;
