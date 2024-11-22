import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { FaPalette, FaTrash, FaPaintBrush, FaEraser } from 'react-icons/fa';
import { ChromePicker } from 'react-color';

const socket = io('https://paletteconnect.onrender.com');

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [showPicker, setShowPicker] = useState(false);
  const [brushWidth, setBrushWidth] = useState(2);
  const [eraserWidth, setEraserWidth] = useState(10);
  const [isErasing, setIsErasing] = useState(false);
  const [startCoords, setStartCoords] = useState(null); // For shape drawing
  const [showBrushWidth, setShowBrushWidth] = useState(false); // State for brush width visibility
  const { roomId } = useParams();
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  const [textSize, setTextSize] = useState(16);
  const [fontStyle, setFontStyle] = useState('Arial');
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    socket.emit('joinRoom', roomId);
    socket.on('loadDrawing', (drawings) => drawings.forEach((draw) => drawLine(ctx, draw.prevX, draw.prevY, draw.offsetX, draw.offsetY, draw.color, draw.brushWidth)));
    socket.on('drawing', ({ offsetX, offsetY, prevX, prevY, color, brushWidth }) =>
      drawLine(ctx, prevX, prevY, offsetX, offsetY, color, brushWidth)
    );
    socket.on('addText', ({ text, x, y, font, color }) => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    });
    socket.on('clearBoard', () => clearCanvas(ctx));
    return () => {
      socket.off('loadDrawing');
      socket.off('drawing');
      socket.off('addText');
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
    setStartCoords({ x: offsetX, y: offsetY });
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx.prevPos = null;
    setStartCoords(null); // Reset start coordinates
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
    clearCanvas(ctx); // Clear the local canvas

    socket.emit('clearBoard', roomId); // Emit event to the server
  };

  const addText = (event) => {
    if (!isTextToolActive || !currentText.trim()) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { offsetX, offsetY } = event.nativeEvent;

    ctx.font = `${textSize}px ${fontStyle}`;
    ctx.fillStyle = color;
    ctx.fillText(currentText, offsetX, offsetY);

    // Emit text addition to others
    socket.emit('addText', {
      roomId,
      text: currentText,
      x: offsetX,
      y: offsetY,
      font: `${textSize}px ${fontStyle}`,
      color,
    });

    setCurrentText(''); // Clear the input after adding text
  };

  const draw = (event) => {
    const ctx = canvasRef.current.getContext('2d');

    if (!isDrawing) return;

    const { offsetX, offsetY } = event.nativeEvent;
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


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 relative">
      <div className="absolute left-4 top-16 p-4 bg-white shadow-lg rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Room: {roomId}</h3>
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
        {/* Brush size */}
        <div className="flex items-center">
          <FaPaintBrush className="text-3xl text-blue-500 cursor-pointer hover:scale-110 transition" onClick={() => setShowBrushWidth(!showBrushWidth)} />
          {showBrushWidth && (
            <input
              type="range"
              min="1"
              max="20"
              value={brushWidth}
              onChange={(e) => setBrushWidth(e.target.value)}
            />
          )}
        </div>
        {/* Eraser */}
        {isTextToolActive && (
          <div className="absolute bottom-4 left-4 bg-white shadow-md p-4 rounded-lg">
            <input
              type="text"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Enter your text"
              className="p-2 border rounded-md w-full"
            />
          </div>
        )}
        <div className="flex flex-col space-y-2">
          {/* Text Tool Activation */}
          <button
            className={`p-2 rounded-md ${isTextToolActive ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setIsTextToolActive(!isTextToolActive)}
          >
            Text Tool
          </button>

          {/* Font Size Selector */}
          {isTextToolActive && (
            <input
              type="range"
              min="12"
              max="48"
              value={textSize}
              onChange={(e) => setTextSize(e.target.value)}
              className="w-full"
            />
          )}

          {/* Font Style Selector */}
          {isTextToolActive && (
            <select
              value={fontStyle}
              onChange={(e) => setFontStyle(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="Arial">Arial</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option>
            </select>
          )}
        </div>

        <div className="flex items-center">
          <FaEraser
            className={`text-3xl cursor-pointer ${isErasing ? 'text-red-500' : 'text-gray-500'} hover:scale-110 transition`}
            onClick={() => setIsErasing(!isErasing)}
          />
          {isErasing && (
            <input
              type="range"
              min="1"
              max="50"
              value={eraserWidth}
              onChange={(e) => setEraserWidth(e.target.value)}
              className="ml-2"
            />
          )}
        </div>
        {/* Clear button */}
        <FaTrash className="text-3xl text-red-500 cursor-pointer hover:scale-110 transition" onClick={clearBoard} />
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={isTextToolActive ? addText : startDrawing}
        onMouseUp={isTextToolActive ? null : finishDrawing}
        onMouseMove={isTextToolActive ? null : draw}
        className="border border-gray-300"
      />

    </div>
  );
};

export default Whiteboard;
