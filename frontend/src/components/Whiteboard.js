import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { FaPalette, FaTrash, FaPaintBrush, FaEraser } from 'react-icons/fa';
import { ChromePicker } from 'react-color';

const socket = io('https://your-server-url.com'); // Replace with your server URL

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
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx.prevPos = null;
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

  const enableTextTool = () => {
    setIsTextTool(true);
  };

  const handleTextClick = (event) => {
    if (!isTextTool) return;
    const { offsetX, offsetY } = event.nativeEvent;
    setTextPosition({ x: offsetX, y: offsetY });
  };

  const addTextToCanvas = () => {
    if (!textInput || !textPosition) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);

    socket.emit('addText', {
      roomId,
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color,
      fontSize,
    });

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
        <FaPalette onClick={() => setShowPicker(!showPicker)} />
        {showPicker && (
          <ChromePicker
            color={color}
            onChangeComplete={(color) => setColor(color.hex)}
          />
        )}
        <FaPaintBrush onClick={() => setBrushWidth(brushWidth + 1)} />
        <FaEraser onClick={() => setIsErasing(!isErasing)} />
        <FaTrash onClick={clearBoard} />
        <button onClick={enableTextTool}>Add Text</button>
        {isTextTool && (
          <div>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button onClick={addTextToCanvas}>Place Text</button>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        onClick={handleTextClick}
        className="border border-gray-300"
      />
    </div>
  );
};

export default Whiteboard;
