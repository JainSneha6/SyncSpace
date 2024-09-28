import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { FaPalette, FaTrash, FaPaintBrush, FaEraser } from 'react-icons/fa';
import { ChromePicker } from 'react-color';

const socket = io('http://localhost:5000'); // Connect to the backend

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000'); // Default color
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF'); // Default background color
  const [showPicker, setShowPicker] = useState(false);
  const [brushWidth, setBrushWidth] = useState(2); // Default brush width
  const [eraserWidth, setEraserWidth] = useState(10); // Default eraser width
  const [showSlider, setShowSlider] = useState(false);
  const [isErasing, setIsErasing] = useState(false); // State to toggle eraser
  const { roomId } = useParams();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set the initial background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set up socket connection and join the room
    socket.emit('joinRoom', roomId);

    socket.on('loadDrawing', (drawings) => {
      drawings.forEach(({ offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
        drawLine(ctx, prevX, prevY, offsetX, offsetY, color, brushWidth);
      });
    });

    socket.on('drawing', ({ offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
      drawLine(ctx, prevX, prevY, offsetX, offsetY, color, brushWidth);
    });

    socket.on('clearBoard', () => {
      clearCanvas(ctx);
    });

    return () => {
      socket.off('loadDrawing');
      socket.off('drawing');
      socket.off('clearBoard');
    };
  }, [roomId, backgroundColor]);

  const startDrawing = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    ctx.prevPos = { offsetX, offsetY }; // Store the starting position
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx.prevPos = null; // Clear the previous position on finish
  };

  const draw = (event) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    const prevPos = ctx.prevPos;

    if (prevPos) {
      const width = isErasing ? eraserWidth : brushWidth;
      const colorToUse = isErasing ? '#FFFFFF' : color; // Use white for eraser
      drawLine(ctx, prevPos.offsetX, prevPos.offsetY, offsetX, offsetY, colorToUse, width);
      ctx.prevPos = { offsetX, offsetY };

      socket.emit('drawing', {
        roomId,
        offsetX,
        offsetY,
        prevX: prevPos.offsetX,
        prevY: prevPos.offsetY,
        color: colorToUse,
        brushWidth: width
      });
    }
  };

  const drawLine = (ctx, x1, y1, x2, y2, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const clearCanvas = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = backgroundColor; // Fill with background color after clearing
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const clearBoard = () => {
    const ctx = canvasRef.current.getContext('2d');
    clearCanvas(ctx);
    socket.emit('clearBoard', roomId);
  };

  const toggleEraser = () => {
    setIsErasing(!isErasing);
  };

  // Function to handle erasing specific drawn content
  const eraseDrawing = (event) => {
    if (!isErasing) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');

    // Create an eraser effect by painting over the drawn content
    ctx.clearRect(offsetX - eraserWidth / 2, offsetY - eraserWidth / 2, eraserWidth, eraserWidth);
    socket.emit('drawing', {
      roomId,
      offsetX,
      offsetY,
      prevX: offsetX,
      prevY: offsetY,
      color: '#FFFFFF', // Eraser color
      brushWidth: eraserWidth
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 relative">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Room: {roomId}</h3>

      {/* Background color picker */}
      <div className="absolute left-4 top-16">
        <span className="text-gray-700">Background Color:</span>
        <ChromePicker
          color={backgroundColor}
          onChangeComplete={(color) => {
            setBackgroundColor(color.hex);
            const ctx = canvasRef.current.getContext('2d');
            ctx.fillStyle = color.hex; // Update the background color
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Fill canvas with the new color
          }}
        />
      </div>

      {/* Color picker */}
      <div className="absolute left-4 top-4">
        <FaPalette
          className="text-3xl text-pink-500 cursor-pointer"
          onClick={() => setShowPicker(!showPicker)}
        />
        {showPicker && (
          <div className="absolute z-10 mt-2">
            <ChromePicker
              color={color}
              onChangeComplete={(color) => setColor(color.hex)}
            />
          </div>
        )}
      </div>

      {/* Brush width slider button */}
      <button 
        onClick={() => setShowSlider(!showSlider)} 
        className="absolute right-28 top-4 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
      >
        <FaPaintBrush className="text-2xl" />
      </button>
      {showSlider && (
        <div className="absolute right-24 top-12">
          <input
            type="range"
            min="1"
            max="50"
            value={brushWidth}
            onChange={(e) => setBrushWidth(e.target.value)}
            className="w-32"
          />
          <span className="text-gray-700">{brushWidth}</span>
        </div>
      )}

      {/* Eraser width slider */}
      <button 
        onClick={toggleEraser} 
        className="absolute right-16 top-4 p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600"
      >
        <FaEraser className="text-2xl" />
      </button>
      <input
        type="range"
        min="1"
        max="50"
        value={eraserWidth}
        onChange={(e) => setEraserWidth(e.target.value)}
        className="absolute right-16 top-12 w-32"
        style={{ display: isErasing ? 'block' : 'none' }} // Show only when eraser is active
      />
      <span className="text-gray-700 absolute right-8 top-12" style={{ display: isErasing ? 'block' : 'none' }}>
        {eraserWidth}
      </span>

      {/* Clear board button */}
      <button 
        onClick={clearBoard} 
        className="absolute right-4 top-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
      >
        <FaTrash className="text-2xl" />
      </button>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={(event) => {
          draw(event);
          eraseDrawing(event);
        }} // Call both draw and erase functions
        width={800}
        height={600}
        className="border border-gray-300 rounded-lg shadow-lg"
        style={{ backgroundColor }} // Apply the background color
      />
    </div>
  );
};

export default Whiteboard;
