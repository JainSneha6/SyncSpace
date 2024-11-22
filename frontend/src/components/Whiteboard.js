
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import Controls from '../WhiteboardComponents/Controls';

const socket = io('https://paletteconnect.onrender.com');

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const { roomId } = useParams();
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [textItems, setTextItems] = useState([]); // Store text items
  const [brushWidth, setBrushWidth] = useState(2);
  const [eraserWidth, setEraserWidth] = useState(10);
  const [isErasing, setIsErasing] = useState(false);
  const [startCoords, setStartCoords] = useState(null); // For shape drawing
  const [showBrushWidth, setShowBrushWidth] = useState(false);
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [textSize, setTextSize] = useState(16);
  const [fontStyle, setFontStyle] = useState('Arial');
  const [showPicker, setShowPicker] = useState(false);
  const [shape, setShape] = useState('rectangle');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [shapes, setShapes] = useState([]); // Store shapes

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    socket.emit('joinRoom', roomId);
    socket.on('loadDrawing', (drawings) => drawings.forEach((draw) => drawLine(ctx, draw.prevX, draw.prevY, draw.offsetX, draw.offsetY, draw.color, draw.brushWidth)));
    socket.on('drawing', ({ offsetX, offsetY, prevX, prevY, color, brushWidth }) =>
      drawLine(ctx, prevX, prevY, offsetX, offsetY, color, brushWidth)
    );
    socket.on('addText', (textData) => {
      const { text, x, y, font, color } = textData;
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    });
    socket.on('changeTextColor', (color) => {
      setColor(color); // Update the text color when the server broadcasts the new color
    });
    socket.on('clearBoard', () => clearCanvas(ctx));
    return () => {
      socket.off('loadDrawing');
      socket.off('drawing');
      socket.off('addText');
      socket.off('clearBoard');
      socket.off('changeTextColor');
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
    clearCanvas(ctx);
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setShapes([]); // Clear the local canvas shapes
    socket.emit('clearBoard', roomId); // Emit event to the server
  };

  const addText = (event) => {
    if (!isTextToolActive || !currentText.trim()) return;

    const canvas = canvasRef.current; // Access the canvas via the reference
    const ctx = canvas.getContext('2d'); // Get the 2D context of the canvas
    const { offsetX, offsetY } = event.nativeEvent;

    ctx.font = `${textSize}px ${fontStyle}`;
    ctx.fillStyle = color; // Use the updated color
    ctx.fillText(currentText, offsetX, offsetY);

    // Save the text's details
    const newText = {
      text: currentText,
      x: offsetX,
      y: offsetY,
      font: `${textSize}px ${fontStyle}`,
      color: color, // Include color when saving text item
      width: ctx.measureText(currentText).width,
      height: textSize,
    };

    setTextItems((prev) => [...prev, newText]);
    setCurrentText('');
    socket.emit('addText', { roomId, ...newText }); // Emit text details to the server
  };

  // Function to re-draw all shapes
  const reDrawAllShapes = () => {
    const ctx = canvasRef.current.getContext('2d');
    shapes.forEach((shape) => {
      drawShape(ctx, shape);
    });
  };

  const draw = (event) => {
    if (isDrawing && !isTextToolActive && startCoords) {
      const ctx = canvasRef.current.getContext('2d');
      const { offsetX, offsetY } = event.nativeEvent;

      // While drawing shapes, dynamically draw the shape (this applies to rectangle, circle, etc.)
      const tempShape = {
        type: shape,
        x1: startCoords.x,
        y1: startCoords.y,
        x2: offsetX,
        y2: offsetY,
        color: strokeColor,
        width: strokeWidth,
      };
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      reDrawAllShapes(); // Re-draw all previous shapes
      drawShape(ctx, tempShape); // Redraw the shape as it's being drawn
    } else if (isDrawing && !isErasing) {
      // Handle regular drawing with brush (not for shapes)
      const ctx = canvasRef.current.getContext('2d');
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
    }
  };

  const handleMouseDown = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;

    if (isTextToolActive) {
      addText(event);  // If text tool is active, handle text adding
    } else {
      setIsDrawing(true);
      setStartCoords({ x: offsetX, y: offsetY });
    }
  };

  const handleMouseUp = (event) => {
    if (!isDrawing || !startCoords) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');

    const newShape = {
      type: shape,
      x1: startCoords.x,
      y1: startCoords.y,
      x2: offsetX,
      y2: offsetY,
      color: strokeColor,
      width: strokeWidth,
    };

    drawShape(ctx, newShape);
    setShapes((prev) => [...prev, newShape]); // Add new shape to state
    setIsDrawing(false);
    setStartCoords(null);
    reDrawAllShapes(); // Redraw all shapes including the new one
    socket.emit('shapeDrawn', { roomId, shape: newShape }); // Emit shape details to server
  };

  const drawShape = (ctx, shape) => {
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.width;
    ctx.lineCap = 'round';
    switch (shape.type) {
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
        ctx.stroke();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(shape.x1, shape.y1, Math.abs(shape.x2 - shape.x1), 0, Math.PI * 2);
        ctx.stroke();
        break;
      // Add more shapes as needed
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width="800"
        height="600"
        onMouseDown={handleMouseDown}
        onMouseMove={draw}
        onMouseUp={handleMouseUp}
        onMouseLeave={finishDrawing}
        className="border border-gray-500"
      />
      <Controls
        color={color}
        setColor={setColor}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        setShowBrushWidth={setShowBrushWidth}
        showBrushWidth={showBrushWidth}
        shape={shape}
        setShape={setShape}
        clearBoard={clearBoard}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
      />
    </div>
  );
};

export default Whiteboard;