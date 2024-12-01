import React, { useState, useEffect } from 'react';
import { FaPaperPlane, FaSmile, FaSearch, FaImage } from 'react-icons/fa'; // Changed GIF icon to FaImage
import axios from 'axios'; // For API calls
import EmojiPicker from 'emoji-picker-react'; // For emoji picker

const GIPHY_API_KEY = 'N8zxen9SSipE8ZLfgl8SZX3t8yzlZXSS'; // Replace with your actual Giphy API Key

const Chat = ({ socketRef, roomId, height }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifs, setGifs] = useState([]); // Store fetched GIFs
  const [searchQuery, setSearchQuery] = useState('');
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', roomId);

      socketRef.current.on('chatHistory', (history) => {
        setMessages(history);
      });

      socketRef.current.on('receiveMessage', ({ message, id }) => {
        setMessages(prevMessages => [...prevMessages, { message, id }]);
      });

      return () => {
        socketRef.current.off('chatHistory');
        socketRef.current.off('receiveMessage');
      };
    }
  }, [socketRef, roomId]);

  const handleSendMessage = (message) => {
    if (message.trim() !== '') {
      socketRef.current.emit('sendMessage', { roomId, message });
      setNewMessage('');
    }
  };

  const handleSendGif = (gifUrl) => {
    handleSendMessage(gifUrl);
    setShowGifPicker(false); // Close the GIF picker after sending
    setIsGifPickerOpen(false); // Reset the GIF picker state
  };

  const fetchGifs = async (query) => {
    const res = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
      params: {
        api_key: GIPHY_API_KEY,
        q: query,
        limit: 10
      }
    });
    setGifs(res.data.data); // Giphy API response contains the GIFs in `data.data`
  };

  const handleSearchGiphy = (e) => {
    e.preventDefault();
    fetchGifs(searchQuery);
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage(prevMessage => prevMessage + emojiObject.emoji); // Append emoji to the message
  };

  const renderMessages = () => {
    return messages.map((msg, index) => (
      <div key={index} className={`mb-2 ${msg.id === socketRef.current.id ? 'text-right' : ''}`}>
        {msg.message.includes('giphy.com') ? (
          <img src={msg.message} alt="GIF" className="inline-block w-24 h-24" />
        ) : (
          <span className={`inline-block px-2 py-1 rounded-lg ${msg.id === socketRef.current.id ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {msg.message}
          </span>
        )}
      </div>
    ));
  };

  return (
    <div className="relative h-full">
      {/* Chat Title */}
      <h3 className="text-lg font-semibold mb-2 text-[#2F4550]">Chat</h3>
  
      {/* Conditional Rendering for Meeting Chat (Height: 40px) */}
      {height === '40px' && (
        <div className="h-40 border border-gray-300 rounded-lg overflow-y-auto p-2 mb-2 flex flex-col">
          {/* Messages */}
          {renderMessages()}
        </div>
      )}
  
      {/* Conditional Rendering for Whiteboard Chat (Height: 400px) */}
      {height === '400px' && (
        <div className="h-40 border border-gray-300 rounded-lg overflow-y-auto p-2 mb-2" style={{ height: isGifPickerOpen ? '140px' : '600px' }}>
          {/* Messages */}
          {renderMessages()}
        </div>
      )}
  
      {/* GIF Picker (Only visible when toggled) */}
      {showGifPicker && (
        <div className="mb-2">
          <form onSubmit={handleSearchGiphy} className="flex mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="border border-gray-300 p-2 rounded-lg flex-grow"
            />
            <button type="submit" className="bg-[#2F4550] text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-[#2F4550] flex items-center">
              <FaSearch />
            </button>
          </form>
  
          {/* Display GIFs */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {gifs.map((gif) => (
              <img
                key={gif.id}
                src={gif.images.fixed_height.url}
                alt={gif.title}
                className="cursor-pointer w-24 h-24"
                onClick={() => handleSendGif(gif.images.fixed_height.url)}
              />
            ))}
          </div>
        </div>
      )}
  
      {/* Emoji Picker (Visible based on the height condition) */}
      {height === '40px' && showEmojiPicker && (
        <div className="absolute bottom-20 right-10 z-10">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
  
      {height === '400px' && showEmojiPicker && (
        <div className="absolute" style={{ top: '180px' }}>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
  
      {/* Message Input and Controls */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(newMessage); }} className="flex items-center mt-4">
        {/* Message Input */}
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="border border-gray-300 p-2 rounded-lg flex-grow focus:outline-none focus:ring-2 focus:ring-[#CE4760]"
        />
  
        {/* GIF Button */}
        <button
          type="button"
          className="bg-[#CE4760] text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-[#2F4550] flex items-center"
          onClick={() => {
            setShowGifPicker(!showGifPicker);
            setIsGifPickerOpen(!isGifPickerOpen); // Toggle the height when GIF picker opens or closes
          }}
        >
          <FaImage className="inline-block mr-2" />
          GIF
        </button>
  
        {/* Emoji Button */}
        <button
          type="button"
          className="text-white p-2 ml-2 bg-[#CE4760] hover:bg-[#2F4550] rounded-lg transition duration-300"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <FaSmile size={24} />
        </button>
  
        {/* Send Button */}
        <button
          type="submit"
          className="bg-[#CE4760] text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-[#2F4550] flex items-center"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};  

export default Chat;
