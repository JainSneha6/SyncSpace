import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSmile, FaSearch, FaImage, FaDesktop } from 'react-icons/fa'; // Added FaDesktop for screen sharing
import axios from 'axios'; // For API calls
import EmojiPicker from 'emoji-picker-react'; // For emoji picker
import Peer from 'simple-peer'; // Import Simple Peer

const GIPHY_API_KEY = 'N8zxen9SSipE8ZLfgl8SZX3t8yzlZXSS'; // Replace with your actual Giphy API Key

const Chat = ({ socketRef, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifs, setGifs] = useState([]); // Store fetched GIFs
  const [searchQuery, setSearchQuery] = useState(''); // Search query for Giphy
  const [isSharing, setIsSharing] = useState(false); // State for screen sharing
  const [peers, setPeers] = useState({}); // Store peer connections
  const videoRef = useRef(); // Reference to video element

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', roomId);

      socketRef.current.on('chatHistory', (history) => {
        setMessages(history);
      });

      socketRef.current.on('receiveMessage', ({ message, id }) => {
        setMessages((prevMessages) => [...prevMessages, { message, id }]);
      });

      // Listen for screen sharing signals from other users
      socketRef.current.on('screenSignal', ({ signal, senderId }) => {
        if (peers[senderId]) {
          peers[senderId].signal(signal); // Signal the incoming stream
        }
      });

      return () => {
        Object.values(peers).forEach((peer) => peer.destroy()); // Clean up all peers
        setPeers({});
        socketRef.current.off('chatHistory');
        socketRef.current.off('receiveMessage');
        socketRef.current.off('screenSignal');
      };
    }
  }, [socketRef, roomId, peers]);

  const handleSendMessage = (message) => {
    if (message.trim() !== '') {
      socketRef.current.emit('sendMessage', { roomId, message });
      setNewMessage('');
    }
  };

  const handleSendGif = (gifUrl) => {
    handleSendMessage(gifUrl);
    setShowGifPicker(false); // Close the GIF picker after sending
  };

  const fetchGifs = async (query) => {
    const res = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
      params: {
        api_key: GIPHY_API_KEY,
        q: query,
        limit: 10,
      },
    });
    setGifs(res.data.data); // Giphy API response contains the GIFs in `data.data`
  };

  const handleSearchGiphy = (e) => {
    e.preventDefault();
    fetchGifs(searchQuery);
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji); // Append emoji to the message
  };

  const startScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true }); // Get screen stream

      const localVideo = document.createElement('video');
      localVideo.srcObject = stream;
      localVideo.autoplay = true;
      localVideo.classList.add('w-full', 'h-64', 'border', 'rounded-lg', 'mt-2');
      document.getElementById('localScreenFeed').appendChild(localVideo); // Append to a local video container

      const peerConnection = new Peer({ initiator: true, trickle: false, stream });

      peerConnection.on('signal', (signal) => {
        socketRef.current.emit('screenSignal', { roomId, signal, senderId: socketRef.current.id }); // Send signal to server
      });

      peerConnection.on('stream', (remoteStream) => {
        videoRef.current.srcObject = remoteStream; // Set received stream to the video element for others
      });

      setPeers((prevPeers) => ({ ...prevPeers, [socketRef.current.id]: peerConnection })); // Store the peer connection
      setIsSharing(true);
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const stopScreenSharing = () => {
    Object.values(peers).forEach((peer) => peer.destroy()); // Destroy all peer connections
    setPeers({}); // Reset peer connections
    setIsSharing(false); // Update sharing state
    const localScreenFeed = document.getElementById('localScreenFeed');
    while (localScreenFeed.firstChild) {
      localScreenFeed.removeChild(localScreenFeed.firstChild); // Clear local screen feed
    }
  };

  const renderMessages = () => {
    return messages.map((msg, index) => (
      <div key={index} className={`mb-2 ${msg.id === socketRef.current.id ? 'text-right' : ''}`}>
        {msg.message.includes('giphy.com') ? (
          <img src={msg.message} alt="GIF" className="inline-block w-24 h-24" />
        ) : (
          <span
            className={`inline-block px-2 py-1 rounded-lg ${msg.id === socketRef.current.id ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
          >
            {msg.message}
          </span>
        )}
      </div>
    ));
  };

  return (
    <div className="mt-4 relative">
      <h3 className="text-lg font-semibold mb-2">Chat</h3>
      <div className="h-40 border border-gray-300 rounded-lg overflow-y-auto p-2 mb-2">{renderMessages()}</div>

      {/* Local Screen Feed */}
      <div id="localScreenFeed" className="flex flex-col items-center mb-2">
        <h4 className="text-lg font-semibold">Your Screen</h4>
      </div>

      {/* Video element for remote streams */}
      <div id="remoteVideos" className="flex flex-col items-center">
        <video ref={videoRef} autoPlay muted className="w-full h-64 border rounded-lg mt-2" />
      </div>

      {/* Giphy Search and Results */}
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
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-blue-600 flex items-center"
            >
              <FaSearch />
            </button>
          </form>
          <div className="grid grid-cols-3 gap-2">
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

      {/* Emoji Picker Toggle */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-10 z-10">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Screen Sharing */}
      <button
        onClick={isSharing ? stopScreenSharing : startScreenSharing}
        className="bg-green-500 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-green-600 flex items-center"
      >
        <FaDesktop /> {/* Screen sharing icon */}
        {isSharing ? ' Stop Sharing' : ' Share Screen'}
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(newMessage);
        }}
        className="flex"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="border border-gray-300 p-2 rounded-lg flex-grow"
        />

        {/* GIF Button with new icon */}
        <button
          type="button"
          className="bg-yellow-500 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-yellow-600 flex items-center"
          onClick={() => setShowGifPicker(!showGifPicker)}
        >
          <FaImage /> {/* Changed icon to FaImage */}
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          className="bg-blue-300 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-blue-400 flex items-center"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <FaSmile />
        </button>

        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-lg ml-2 transition duration-300 hover:bg-blue-600 flex items-center"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default Chat;
