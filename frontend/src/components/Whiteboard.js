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
  const [shapes, setShapes] = useState([]); // Store all shapes
  const [shapeType, setShapeType] = useState('line'); // Default shape type
  const [startCoords, setStartCoords] = useState(null); // For shape drawing
  const [showBrushWidth, setShowBrushWidth] = useState(false); // State for brush width visibility
  const { roomId } = useParams();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    socket.emit('joinRoom', roomId);

    // Load existing shapes when the user joins
    socket.on('loadShapes', (shapes) => {
      shapes.forEach((shape) => {
        addShapeToCanvas(ctx, shape);
        setShapes((prevShapes) => [...prevShapes, shape]); // Add to shapes state
      });
    });

    socket.on('drawing', ({ offsetX, offsetY, prevX, prevY, color, brushWidth }) => {
      drawLine(ctx, prevX, prevY, offsetX, offsetY, color, brushWidth);
    });

    socket.on('clearBoard', () => {
      clearCanvas(ctx);
      setShapes([]); // Clear shapes state when board is cleared
    });

    socket.on('shapeDrawn', (shape) => {
      addShapeToCanvas(ctx, shape);
      setShapes((prevShapes) => [...prevShapes, shape]); // Add to shapes state
    });

    return () => {
      socket.off('loadShapes');
      socket.off('drawing');
      socket.off('clearBoard');
      socket.off('shapeDrawn');
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
    setShapes([]); // Clear the shapes state
    socket.emit('clearBoard', roomId); // Emit event to the server
  };

  const drawShape = (ctx, shape) => {
    const { type, startX, startY, endX, endY, color, width } = shape;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;

    if (type === 'rectangle') {
      ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    } else if (type === 'circle') {
      const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const addShapeToCanvas = (ctx, shape) => {
    drawShape(ctx, shape);
  };

  const handleMouseMove = (event) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');

    if (isErasing) {
      ctx.clearRect(offsetX - eraserWidth / 2, offsetY - eraserWidth / 2, eraserWidth, eraserWidth);
    } else {
      drawLine(ctx, ctx.prevPos.offsetX, ctx.prevPos.offsetY, offsetX, offsetY, color, brushWidth);
      socket.emit('drawing', {
        roomId,
        offsetX,
        offsetY,
        prevX: ctx.prevPos.offsetX,
        prevY: ctx.prevPos.offsetY,
        color,
        brushWidth,
      });
      ctx.prevPos = { offsetX, offsetY };
    }
  };

  const handleMouseUp = () => {
    finishDrawing();

    if (shapeType) {
      const ctx = canvasRef.current.getContext('2d');
      const shape = {
        type: shapeType,
        startX: startCoords.x,
        startY: startCoords.y,
        endX: ctx.prevPos.offsetX,
        endY: ctx.prevPos.offsetY,
        color,
        width: brushWidth,
      };

      // Emit the shape data to the server
      socket.emit('shapeDrawn', { roomId, shape });
      addShapeToCanvas(ctx, shape);
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black' }}
        onMouseDown={startDrawing}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
      <div className="toolbar">
        <button onClick={clearBoard}>
          <FaTrash /> Clear
        </button>
        <button onClick={() => setShowPicker(!showPicker)}>
          <FaPalette /> Color
        </button>
        {showPicker && (
          <ChromePicker
            color={color}
            onChangeComplete={(color) => setColor(color.hex)}
          />
        )}
        <button onClick={() => setIsErasing(!isErasing)}>
          <FaEraser /> Eraser
        </button>
        <button onClick={() => setShapeType('rectangle')}>
          Rectangle
        </button>
        <button onClick={() => setShapeType('circle')}>
          Circle
        </button>
        <div>
          <label>
            Brush Width:
            <input
              type="range"
              min="1"
              max="50"
              value={brushWidth}
              onChange={(e) => setBrushWidth(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
