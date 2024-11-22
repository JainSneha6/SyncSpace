import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

// Set the server URL (make sure this matches your backend)
const socket = io('https://paletteconnect.onrender.com');

const Canvas = ({ roomId }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [startPoint, setStartPoint] = useState(null);
  const [sides, setSides] = useState(5);
  const [color, setColor] = useState("#000000");

  // Handle joining the room
  useEffect(() => {
    socket.emit('joinRoom', roomId);

    socket.on('loadDrawing', (drawings) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      drawings.forEach((drawing) => {
        ctx.strokeStyle = drawing.color;
        ctx.beginPath();
        ctx.moveTo(drawing.prevX, drawing.prevY);
        ctx.lineTo(drawing.offsetX, drawing.offsetY);
        ctx.stroke();
      });
    });

    socket.on('drawing', (drawingData) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = drawingData.color;
      ctx.beginPath();
      ctx.moveTo(drawingData.prevX, drawingData.prevY);
      ctx.lineTo(drawingData.offsetX, drawingData.offsetY);
      ctx.stroke();
    });

    socket.on('clearBoard', () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('addText', (textData) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.font = textData.font;
      ctx.fillStyle = textData.color;
      ctx.fillText(textData.text, textData.x, textData.y);
    });

    return () => {
      socket.off('loadDrawing');
      socket.off('drawing');
      socket.off('clearBoard');
      socket.off('addText');
    };
  }, [roomId]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "brush") {
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || tool !== "brush") return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();

    // Emit drawing to other users
    socket.emit('drawing', {
      roomId,
      offsetX: x,
      offsetY: y,
      prevX: startPoint.x,
      prevY: startPoint.y,
      color,
      brushWidth: 5, // Customize this as needed
    });
  };

  const handleMouseUp = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    switch (tool) {
      case "circle":
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case "rectangle":
        ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        break;

      case "line":
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

      case "ellipse":
        const radiusX = Math.abs(x - startPoint.x) / 2;
        const radiusY = Math.abs(y - startPoint.y) / 2;
        ctx.beginPath();
        ctx.ellipse((startPoint.x + x) / 2, (startPoint.y + y) / 2, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case "triangle":
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        ctx.lineTo(2 * startPoint.x - x, y);
        ctx.closePath();
        ctx.stroke();
        break;

      case "polygon":
        const radiusPoly = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        drawPolygon(ctx, startPoint.x, startPoint.y, radiusPoly, sides);
        break;

      case "star":
        const radiusStar = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        drawStar(ctx, startPoint.x, startPoint.y, radiusStar, sides);
        break;

      case "arrow":
        drawArrow(ctx, startPoint.x, startPoint.y, x, y);
        break;

      default:
        break;
    }

    // Emit the shape drawing to other users
    socket.emit('drawing', {
      roomId,
      offsetX: x,
      offsetY: y,
      prevX: startPoint.x,
      prevY: startPoint.y,
      color,
      brushWidth: 5,
    });

    setIsDrawing(false);
    setStartPoint(null);
  };

  const drawPolygon = (ctx, x, y, radius, sides) => {
    const angleStep = (2 * Math.PI) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const px = x + radius * Math.cos(i * angleStep);
      const py = y + radius * Math.sin(i * angleStep);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const drawStar = (ctx, x, y, radius, points) => {
    const angleStep = (2 * Math.PI) / points;
    const innerRadius = radius / 2;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : innerRadius;
      const px = x + r * Math.cos(i * angleStep);
      const py = y + r * Math.sin(i * angleStep);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const drawArrow = (ctx, startX, startY, endX, endY) => {
    const headLength = 10; // Length of arrowhead
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    // Draw arrowhead
    ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Emit to clear the board for all users
    socket.emit('clearBoard', roomId);
  };

  const addText = (text, x, y, font, color) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Emit text to all users
    socket.emit('addText', {
      roomId,
      text,
      x,
      y,
      font,
      color
    });
  };

  return (
    <div>
      <div>
        <button onClick={() => setTool("brush")}>Brush</button>
        <button onClick={() => setTool("circle")}>Circle</button>
        <button onClick={() => setTool("rectangle")}>Rectangle</button>
        <button onClick={() => setTool("line")}>Line</button>
        <button onClick={() => setTool("ellipse")}>Ellipse</button>
        <button onClick={() => setTool("triangle")}>Triangle</button>
        <button onClick={() => setTool("polygon")}>Polygon</button>
        <button onClick={() => setTool("star")}>Star</button>
        <button onClick={() => setTool("arrow")}>Arrow</button>
        <button onClick={clearCanvas}>Clear</button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="number"
          value={sides}
          onChange={(e) => setSides(parseInt(e.target.value))}
          placeholder="Sides (Polygon/Star)"
        />
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: "1px solid black" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

export default Canvas;
