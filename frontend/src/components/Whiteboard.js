import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { FaPalette, FaTrash, FaPaintBrush, FaBrush, FaEraser, FaSquare, FaCircle, FaSlash } from 'react-icons/fa';
import { ChromePicker } from 'react-color';

const socket = io('https://paletteconnect.onrender.com'); // Connect to the backend

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000'); // Default color
  const [showPicker, setShowPicker] = useState(false);
  const [brushWidth, setBrushWidth] = useState(2); // Default brush width
  const [eraserWidth, setEraserWidth] = useState(10); // Default eraser width
  const [showSlider, setShowSlider] = useState(false);
  const [brushType, setBrushType] = useState('Brush'); // Default brush type
  const [isErasing, setIsErasing] = useState(false); // State to toggle eraser
  const { roomId } = useParams();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

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

    socket.on('drawingShape', ({ shapeType, startX, startY, endX, endY, color, brushWidth }) => {
      switch (shapeType) {
        case 'Rectangle':
          drawRectangle(ctx, startX, startY, endX - startX, endY - startY, color, brushWidth);
          break;
        case 'Circle':
          drawCircle(ctx, startX, startY, Math.abs(endX - startX), Math.abs(endY - startY), color, brushWidth);
          break;
        case 'Line':
          drawLine(ctx, startX, startY, endX, endY, color, brushWidth);
          break;
        default:
          break;
      }
    });

    socket.on('clearBoard', () => {
      clearCanvas(ctx);
    });

    return () => {
      socket.off('loadDrawing');
      socket.off('drawing');
      socket.off('drawingShape');
      socket.off('clearBoard');
    };
  }, [roomId]);

  const startDrawing = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    setIsDrawing(true);
    ctx.startPos = { offsetX, offsetY }; // Store the starting position
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = ctx.startPos;
    const { offsetX: endX, offsetY: endY } = ctx.endPos;

    // Emit shape drawing to socket
    if (brushType !== 'Brush') {
      socket.emit('drawingShape', {
        roomId,
        shapeType: brushType,
        startX: offsetX,
        startY: offsetY,
        endX,
        endY,
        color,
        brushWidth,
      });
    }
    setIsDrawing(false);
  };

  const draw = (event) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.endPos = { offsetX, offsetY };

    clearCanvas(ctx); // Clear canvas before drawing the new shape

    switch (brushType) {
      case 'Rectangle':
        drawRectangle(ctx, ctx.startPos.offsetX, ctx.startPos.offsetY, offsetX - ctx.startPos.offsetX, offsetY - ctx.startPos.offsetY, color, brushWidth);
        break;
      case 'Circle':
        drawCircle(ctx, ctx.startPos.offsetX, ctx.startPos.offsetY, Math.abs(offsetX - ctx.startPos.offsetX), Math.abs(offsetY - ctx.startPos.offsetY), color, brushWidth);
        break;
      case 'Line':
        drawLine(ctx, ctx.startPos.offsetX, ctx.startPos.offsetY, offsetX, offsetY, color, brushWidth);
        break;
      default:
        drawLine(ctx, ctx.startPos.offsetX, ctx.startPos.offsetY, offsetX, offsetY, color, brushWidth);
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

  const drawRectangle = (ctx, x, y, width, height, color, lineWidth) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
  };

  const drawCircle = (ctx, x, y, radiusX, radiusY, color, lineWidth) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 relative">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Room: {roomId}</h3>
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
      {/* Shape selection buttons */}
      <div className="absolute left-16 top-4 flex space-x-4">
        <button onClick={() => setBrushType('Rectangle')} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600">
          <FaSquare className="text-2xl" />
        </button>
        <button onClick={() => setBrushType('Circle')} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
          <FaCircle className="text-2xl" />
        </button>
        <button onClick={() => setBrushType('Line')} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600">
          <FaSlash className="text-2xl" />
        </button>
      </div>
      {/* Clear Board button */}
      <button
        onClick={clearBoard}
        className="absolute right-4 top-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
      >
        <FaTrash className="text-2xl" />
      </button>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="bg-white border border-gray-300 shadow-lg"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={finishDrawing}
      />
    </div>
  );
};

export default Whiteboard;
