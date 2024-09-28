import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useParams } from 'react-router-dom';

const socket = io('https://paletteconnect.onrender.com'); // Connect to the backend

const Chat = ({roomId}) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Join the room for chat
        socket.emit('join room', roomId); // Ensure this line is included

        // Listen for incoming messages
        socket.on('receive message', (data) => {
            setMessages((prevMessages) => [...prevMessages, data]);
        });

        return () => {
            socket.off('receive message');
        };
    }, [roomId]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim() === '') return;

        const messageData = {
            roomId,
            message,
            sender: 'You', // Customize sender's name or ID if needed
        };

        // Send the message to the server
        socket.emit('send message', messageData);

        // Add your own message to the chat
        setMessages((prevMessages) => [...prevMessages, messageData]);
        setMessage('');
    };

    // Scroll to the latest message when a new message arrives
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className="chat-container bg-white p-4 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Chat</h2>
            <div className="messages overflow-y-auto h-64 mb-4 border border-gray-300 p-2 rounded">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender === 'You' ? 'text-right' : 'text-left'}`}>
                        <span className="font-bold text-sm">{msg.sender}:</span> {msg.message}
                    </div>
                ))}
                <div ref={messagesEndRef}></div>
            </div>
            <form onSubmit={sendMessage} className="flex">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="border border-gray-300 p-2 rounded-l w-full"
                    placeholder="Type a message..."
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600"
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default Chat;
