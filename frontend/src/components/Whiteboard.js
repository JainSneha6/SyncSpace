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
  const [isTextTool, setIsTextTool] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [fontSize, setFontSize] = useState(20);

  const [startCoords, setStartCoords] = useState(null); // For shape drawing
  const [showBrushWidth, setShowBrushWidth] = useState(false); // State for brush width visibility
  const { roomId } = useParams();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    socket.emit('joinRoom', roomId);



    socket.on('drawing', ({ offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
      drawLine(ctx, prevX, prevY, offsetX, offsetY, color, brushWidth);
    });

    socket.on('clearBoard', () => {
      clearCanvas(ctx);

    });

    socket.on('addText', ({ text, x, y, color, fontSize }) => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    });


    return () => {
      socket.off('addText');
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
    setStartCoords({ x: offsetX, y: offsetY }); // Set start coordinates for shape
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


  // Enable text tool
  const enableTextTool = () => {
    setIsTextTool(true);
  };

  // Place text on the canvas
  const handleTextClick = (event) => {
    if (!isTextTool) return;

    const { offsetX, offsetY } = event.nativeEvent;
    setTextPosition({ x: offsetX, y: offsetY });
  };

  // Draw text on the canvas
  const addTextToCanvas = () => {
    if (!textInput || !textPosition) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);

    // Emit text drawing to the server
    socket.emit('addText', {
      roomId,
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color,
      fontSize,
    });

    // Clear input state
    setTextInput('');
    setTextPosition(null);
    setIsTextTool(false);
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
    <div className="flex items-center justify-center min-h-screen bg-white p-4 relative">
      <div className="absolute left-4 top-16 p-4 bg-white shadow-lg rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Room: {roomId}</h3>
        {/* Shape selection */}

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
        <div>
          {/* Text Tool */}
          <button onClick={enableTextTool} className="text-tool-button">
            Add Text
          </button>

          {isTextTool && (
            <div className="text-tool-options">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text"
                className="text-input"
              />
              <input
                type="number"
                min="10"
                max="50"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="font-size-input"
              />
              <button onClick={addTextToCanvas} className="add-text-button">
                Add to Canvas
              </button>
            </div>
          )}
        </div>

        {/* Eraser */}
        <FaEraser
          className={`text-3xl cursor-pointer ${isErasing ? 'text-red-500' : 'text-gray-500'} hover:scale-110 transition`}
          onClick={() => setIsErasing(!isErasing)}
        />
        {/* Clear button */}

        <FaTrash className="text-3xl text-red-500 cursor-pointer hover:scale-110 transition" onClick={clearBoard} />
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        className="border border-gray-300"
      />
    </div>
  );
};

export default Whiteboard;
