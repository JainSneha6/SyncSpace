import React, { useState, useEffect } from 'react';
import { FaPaperPlane, FaSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';

const Chat = ({ socketRef, roomId }) => {
  const [messages, setMessages] = useState([]); // State for chat messages
  const [newMessage, setNewMessage] = useState(''); // State for new message input
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State to toggle emoji picker visibility

  useEffect(() => {
    if (socketRef.current) {
      // Emit event to join the room
      socketRef.current.emit('joinRoom', roomId);

      // Listen for chat history when joining
      socketRef.current.on('chatHistory', (history) => {
        setMessages(history); // Load chat history
      });

      // Listen for new incoming messages
      socketRef.current.on('receiveMessage', ({ message, id }) => {
        setMessages(prevMessages => [...prevMessages, { message, id }]);
      });

      return () => {
        socketRef.current.off('chatHistory');
        socketRef.current.off('receiveMessage');
      };
    }
  }, [socketRef, roomId]);

  // Function to handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() !== '') {
      // Emit the message to the server
      socketRef.current.emit('sendMessage', { roomId, message: newMessage });
      setNewMessage(''); // Clear message input after sending
    }
  };

  // Function to handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    setNewMessage(prevMessage => prevMessage + emojiObject.emoji); // Append emoji to the message
  };

  // Render the list of chat messages
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

      {/* Emoji Picker Toggle */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-10">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center relative">
        {/* Message Input */}
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="border border-gray-300 p-2 rounded-lg flex-grow"
        />

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-gray-500 p-2 ml-2 hover:text-pink-500 transition duration-300"
        >
          <FaSmile size={24} />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          className="bg-pink-500 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-pink-600 flex items-center"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default Chat;
