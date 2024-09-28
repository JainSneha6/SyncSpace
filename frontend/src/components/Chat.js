// Chat.js
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { FaPaperPlane } from 'react-icons/fa';

const socket = io('https://paletteconnect.onrender.com'); // Connect to your backend

const Chat = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Join the chat room
    socket.emit('joinRoom', roomId);

    // Listen for incoming messages
    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Clean up the event listeners when component unmounts
    return () => {
      socket.off('message');
    };
  }, [roomId]);

  // Send message function
  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim()) {
      const message = {
        text: input,
        roomId,
        sender: 'You', // Change to user's name if available
      };

      socket.emit('sendMessage', message); // Send the message to the backend
      setMessages((prevMessages) => [...prevMessages, message]); // Add message locally
      setInput(''); // Clear input
    }
  };

  // Scroll to the latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="chat-container flex flex-col justify-between border border-gray-300 rounded-lg shadow-lg w-full max-w-md bg-white">
      <div className="chat-messages overflow-y-auto p-4 h-64">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message my-2 p-2 rounded-md ${
              message.sender === 'You' ? 'bg-blue-200 self-end' : 'bg-gray-200'
            }`}
          >
            <strong>{message.sender}: </strong>
            <span>{message.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-2 flex items-center border-t">
        <input
          type="text"
          className="flex-grow p-2 border rounded-md focus:outline-none focus:border-blue-400"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded-full ml-2 hover:bg-blue-600 flex items-center justify-center"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default Chat;
