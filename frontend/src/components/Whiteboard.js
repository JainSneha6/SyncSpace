import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("https://paletteconnect.onrender.com");

const Canvas = () => {
  const canvasRef = useRef(null);
  const roomId = useParams();
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [startPoint, setStartPoint] = useState(null);
  const [sides, setSides] = useState(5);
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    if (roomId) {
      socket.emit("joinRoom", roomId);
    } else {
      console.error("Room ID is not available.");
    }

    socket.on("loadDrawing", (drawings) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
    
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    
      drawings.forEach((drawing) => {
        try {
          ctx.strokeStyle = drawing.color || "#000";
    
          switch (drawing.tool) {
            case "brush":
              if (!("prevX" in drawing && "prevY" in drawing && "offsetX" in drawing && "offsetY" in drawing)) {
                throw new Error("Invalid brush data");
              }
              ctx.beginPath();
              ctx.moveTo(drawing.prevX, drawing.prevY);
              ctx.lineTo(drawing.offsetX, drawing.offsetY);
              ctx.stroke();
              break;
    
            case "circle":
              if (!drawing.startPoint || !('x' in drawing.startPoint && 'y' in drawing.startPoint) || drawing.radius == null) {
                throw new Error("Invalid circle data");
              }
              ctx.beginPath();
              ctx.arc(drawing.startPoint.x, drawing.startPoint.y, drawing.radius, 0, 2 * Math.PI);
              ctx.stroke();
              break;
    
            case "rectangle":
              if (!drawing.startPoint || !drawing.endPoint) {
                throw new Error("Invalid rectangle data");
              }
              ctx.strokeRect(
                drawing.startPoint.x,
                drawing.startPoint.y,
                drawing.endPoint.x - drawing.startPoint.x,
                drawing.endPoint.y - drawing.startPoint.y
              );
              break;
    
            case "line":
              if (!drawing.startPoint || !drawing.endPoint) {
                throw new Error("Invalid line data");
              }
              ctx.beginPath();
              ctx.moveTo(drawing.startPoint.x, drawing.startPoint.y);
              ctx.lineTo(drawing.endPoint.x, drawing.endPoint.y);
              ctx.stroke();
              break;
    
            case "ellipse":
              if (!drawing.startPoint || drawing.radiusX == null || drawing.radiusY == null) {
                throw new Error("Invalid ellipse data");
              }
              ctx.beginPath();
              ctx.ellipse(
                (drawing.startPoint.x + drawing.endPoint.x) / 2,
                (drawing.startPoint.y + drawing.endPoint.y) / 2,
                drawing.radiusX,
                drawing.radiusY,
                0,
                0,
                2 * Math.PI
              );
              ctx.stroke();
              break;
    
            case "triangle":
              if (!drawing.startPoint || !drawing.endPoint) {
                throw new Error("Invalid triangle data");
              }
              ctx.beginPath();
              ctx.moveTo(drawing.startPoint.x, drawing.startPoint.y);
              ctx.lineTo(drawing.endPoint.x, drawing.endPoint.y);
              ctx.lineTo(2 * drawing.startPoint.x - drawing.endPoint.x, drawing.endPoint.y);
              ctx.closePath();
              ctx.stroke();
              break;
    
            case "polygon":
              if (!drawing.startPoint || drawing.radius == null || drawing.sides == null) {
                throw new Error("Invalid polygon data");
              }
              drawPolygon(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.sides);
              break;
    
            case "star":
              if (!drawing.startPoint || drawing.radius == null || drawing.points == null) {
                throw new Error("Invalid star data");
              }
              drawStar(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.points);
              break;
    
            case "arrow":
              if (!drawing.startPoint || !drawing.endPoint) {
                throw new Error("Invalid arrow data");
              }
              drawArrow(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.endPoint.x, drawing.endPoint.y);
              break;
    
            default:
              console.error("Unknown drawing tool:", drawing.tool);
          }
        } catch (error) {
          console.error("Error rendering drawing:", error.message, drawing);
        }
      });
    });
    

    socket.on("drawing", (data) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.strokeStyle = data.color;

      if (data.tool === "brush") {
        ctx.beginPath();
        ctx.moveTo(data.prevX, data.prevY);
        ctx.lineTo(data.offsetX, data.offsetY);
        ctx.stroke();
      }
    });

    socket.on("clearBoard", () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("loadDrawing");
      socket.off("drawing");
      socket.off("clearBoard");
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
    if (roomId) {
      socket.emit("drawing", {
        roomId,
        tool: "brush",
        offsetX: x,
        offsetY: y,
        prevX: startPoint.x,
        prevY: startPoint.y,
        color,
      });
    }
    setStartPoint({ x, y });
  };

  const handleMouseUp = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    const ctx = canvas.getContext("2d");
    let drawingData = { roomId, tool, color };
  
    switch (tool) {
      case "circle":
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, radius };
        break;
  
      case "rectangle":
        ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;
  
      case "line":
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;
  
      case "ellipse":
        const radiusX = Math.abs(x - startPoint.x) / 2;
        const radiusY = Math.abs(y - startPoint.y) / 2;
        ctx.beginPath();
        ctx.ellipse((startPoint.x + x) / 2, (startPoint.y + y) / 2, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, radiusX, radiusY };
        break;
  
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        ctx.lineTo(2 * startPoint.x - x, y);
        ctx.closePath();
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;
  
      case "polygon":
        const radiusPoly = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        drawPolygon(ctx, startPoint.x, startPoint.y, radiusPoly, sides);
        drawingData = { ...drawingData, startPoint, radius: radiusPoly, sides };
        break;
  
      case "star":
        const radiusStar = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        drawStar(ctx, startPoint.x, startPoint.y, radiusStar, sides);
        drawingData = { ...drawingData, startPoint, radius: radiusStar, points: sides };
        break;
  
      case "arrow":
        drawArrow(ctx, startPoint.x, startPoint.y, x, y);
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;
  
      default:
        break;
    }

    if (roomId) {
      socket.emit("drawing", drawingData);
    }
  
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
    const headLength = 10; 
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearBoard", roomId);
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
        <button onClick={() => clearCanvas()}>Clear</button>
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
