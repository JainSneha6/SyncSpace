import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { FaPalette, FaTrash, FaPaintBrush, FaEraser } from 'react-icons/fa';
import { ChromePicker } from 'react-color';

const socket = io('https://paletteconnect.onrender.com');

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000'); // Default color
  const [showPicker, setShowPicker] = useState(false);
  const [brushWidth, setBrushWidth] = useState(2); // Default brush width
  const [eraserWidth, setEraserWidth] = useState(10); // Default eraser width
  const [isErasing, setIsErasing] = useState(false); // State to toggle eraser
  const [showBrushWidth, setShowBrushWidth] = useState(false); // State to toggle brush width
  const { roomId } = useParams();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

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
  }, [roomId]);

  const startDrawing = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    ctx.prevPos = { offsetX, offsetY };
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx.prevPos = null;
  };

  const draw = (event) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    const prevPos = ctx.prevPos;

    if (prevPos) {
      const width = isErasing ? eraserWidth : brushWidth;
      const colorToUse = isErasing ? '#FFFFFF' : color;
      drawLine(ctx, prevPos.offsetX, prevPos.offsetY, offsetX, offsetY, colorToUse, width);
      ctx.prevPos = { offsetX, offsetY };

      socket.emit('drawing', {
        roomId,
        offsetX,
        offsetY,
        prevX: prevPos.offsetX,
        prevY: prevPos.offsetY,
        color: colorToUse,
        brushWidth: width,
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
  };

  const clearBoard = () => {
    const ctx = canvasRef.current.getContext('2d');
    clearCanvas(ctx);
    socket.emit('clearBoard', roomId);
  };

  const toggleEraser = () => {
    setIsErasing(!isErasing);
  };

  const toggleBrushWidth = () => {
    setShowBrushWidth(!showBrushWidth);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 relative">
      <div className="absolute left-4 top-16 p-4 bg-white shadow-lg rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Room: {roomId}</h3>
        {/* Color picker */}
        <div className="relative">
          <FaPalette
            className="text-3xl text-pink-500 cursor-pointer hover:scale-110 transition"
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

        {/* Brush width toggle */}
        <div className="flex items-center space-x-2">
          <FaPaintBrush className="text-2xl text-blue-500 cursor-pointer" onClick={toggleBrushWidth} />
          {showBrushWidth && (
            <input
              type="range"
              min="1"
              max="50"
              value={brushWidth}
              onChange={(e) => setBrushWidth(e.target.value)}
              className="w-24"
            />
          )}
        </div>

        {/* Eraser width slider */}
        <div className="flex items-center space-x-2">
          <FaEraser
            className={`text-2xl ${isErasing ? 'text-yellow-500' : 'text-gray-500'} cursor-pointer`}
            onClick={toggleEraser}
          />
          {isErasing && (
            <input
              type="range"
              min="1"
              max="50"
              value={eraserWidth}
              onChange={(e) => setEraserWidth(e.target.value)}
              className="w-24"
            />
          )}
        </div>

        {/* Clear board button */}
        <FaTrash
          className="text-2xl text-red-500 cursor-pointer hover:scale-110 transition"
          onClick={clearBoard}
        />
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        width={800}
        height={600}
        className="border border-gray-300 rounded-lg shadow-lg bg-white"
      />
    </div>
  );
};

export default Whiteboard;
