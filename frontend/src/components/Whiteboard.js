import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  RiBrushFill,
  RiEraserFill,
  RiRadioButtonFill,
  RiCheckboxBlankFill,
  RiFontSize,
  RiDeleteBinLine,
  RiRefreshLine,
  RiTriangleFill,
  RiAddFill,
  RiStarFill,
  RiArrowRightSLine,
  RiBikeFill,
} from "react-icons/ri";

const socket = io("https://paletteconnect.onrender.com");

const Canvas = () => {
  const canvasRef = useRef(null);
  const roomId = useParams().roomId; 
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [startPoint, setStartPoint] = useState(null);
  const [color, setColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [sides, setSides] = useState(5);
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  useEffect(() => {
    if (roomId) {
      socket.emit("joinRoom", roomId);

      socket.on("loadDrawing", (drawings) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        drawings.forEach((drawing) => renderDrawing(ctx, drawing));
      });

      socket.on("drawing", (data) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        renderDrawing(ctx, data);
      });

      socket.on("clearBoard", () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    return () => {
      socket.off("loadDrawing");
      socket.off("drawing");
      socket.off("clearBoard");
    };
  }, [roomId]);

  const handleShapeMenuVisibility = (status) => {
    setShowShapeMenu(status);
  };

  const renderDrawing = (ctx, drawing) => {
    ctx.strokeStyle = drawing.color || "#000";
    ctx.fillStyle = drawing.fillColor || "#000"; 
    ctx.lineWidth = drawing.brushWidth || 1;

    switch (drawing.tool) {
      case "brush":
        ctx.beginPath();
        ctx.moveTo(drawing.prevX, drawing.prevY);
        ctx.lineTo(drawing.offsetX, drawing.offsetY);
        ctx.stroke();
        break;

      case "eraser":
        ctx.beginPath();
        ctx.moveTo(drawing.prevX, drawing.prevY);
        ctx.lineTo(drawing.offsetX, drawing.offsetY);
        ctx.strokeStyle = "#FFFFFF"; 
        ctx.lineWidth = drawing.brushWidth || 1;
        ctx.stroke();
        break;

      case "circle":
        ctx.beginPath();
        ctx.arc(drawing.startPoint.x, drawing.startPoint.y, drawing.radius, 0, 2 * Math.PI);
        ctx.lineWidth = drawing.brushWidth || 1;
        ctx.stroke();
        break;

      case "rectangle":
        ctx.lineWidth = drawing.brushWidth || 1;
          ctx.strokeRect(
            drawing.startPoint.x,
            drawing.startPoint.y,
            drawing.endPoint.x - drawing.startPoint.x,
            drawing.endPoint.y - drawing.startPoint.y
          );
        break;

      case "line":
        ctx.beginPath();
        ctx.moveTo(drawing.startPoint.x, drawing.startPoint.y);
        ctx.lineTo(drawing.endPoint.x, drawing.endPoint.y);
        ctx.lineWidth = drawing.brushWidth || 1;
        ctx.stroke();
        break;

      case "ellipse":
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
        ctx.lineWidth = drawing.brushWidth || 1;
        ctx.stroke();
        break;

      case "polygon":
        ctx.lineWidth = drawing.brushWidth || 1;
        drawPolygon(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.sides);
        ctx.stroke();
        break;

      case "star":
        ctx.lineWidth = drawing.brushWidth || 1;
        drawStar(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.points);
        ctx.stroke();
        break;

      default:
        console.error("Unknown tool:", drawing.tool);
    }
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

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });

    if (tool === "brush" || tool === "eraser") {
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = brushWidth;
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");

    ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = "round"; 
    ctx.lineJoin = "round"; 

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y); 
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
          color: tool === "eraser" ? "#FFFFFF" : color,
          brushWidth,
        });
      }
      setStartPoint({ x, y });
    }
  };


  const handleMouseUp = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    let drawingData = { roomId, tool, color, brushWidth };

    switch (tool) {
      case "circle":
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.beginPath();
        ctx.lineWidth = brushWidth;
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, radius };
        break;

      case "rectangle":
        ctx.lineWidth = brushWidth;
        ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;

      case "line":
        ctx.lineWidth = brushWidth;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;

      case "ellipse":
        const radiusX = Math.abs(x - startPoint.x) / 2;
        const radiusY = Math.abs(y - startPoint.y) / 2;
        ctx.lineWidth = brushWidth;
        ctx.beginPath();
        ctx.ellipse((startPoint.x + x) / 2, (startPoint.y + y) / 2, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, endPoint: { x, y }, radiusX, radiusY };
        break;

      case "polygon":
        const radiusPoly = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.lineWidth = brushWidth;
        drawPolygon(ctx, startPoint.x, startPoint.y, radiusPoly, sides);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, radius: radiusPoly, sides };
        break;

      case "star":
        const radiusStar = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.lineWidth = brushWidth;
        drawStar(ctx, startPoint.x, startPoint.y, radiusStar, sides);
        ctx.stroke();
        drawingData = { ...drawingData, startPoint, radius: radiusStar, points: sides };
        break;

      default:
        break;
    }

    socket.emit("drawing", drawingData);

    setIsDrawing(false);
    setStartPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearBoard", roomId);
  };

  return (
    <div className="min-h-screen bg-pink-600 flex">
      <div className="bg-white shadow-xl rounded-r-lg p-4 flex flex-col gap-4">
        <h2 className="text-pink-600 text-xl font-bold mb-4">Tools</h2>
        <button
          onClick={() => setTool("brush")}
          className={`p-3 rounded-full shadow-md transition-all ${
            tool === "brush"
              ? "bg-pink-600 text-white"
              : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
          }`}
        >
          <RiBrushFill className="text-xl" />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`p-3 rounded-full shadow-md transition-all ${
            tool === "eraser"
              ? "bg-pink-600 text-white"
              : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
          }`}
        >
          <RiEraserFill className="text-xl" />
        </button>
        
        <div
          className="relative"
          onMouseEnter={() => handleShapeMenuVisibility(true)} 
          onMouseLeave={() => handleShapeMenuVisibility(false)} 
        >
          <button
            className={`p-3 rounded-full shadow-md transition-all ${
              tool === "shape"
                ? "bg-pink-600 text-white"
                : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
            }`}
          >
            <RiRadioButtonFill className="text-xl" />
          </button>

          {showShapeMenu && (
            <div className="absolute left-11 top-0 bg-white p-2 rounded-md shadow-lg flex flex-row gap-2 max-h-64 overflow-y-auto w-36">
              <button
                onClick={() => setTool("circle")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiRadioButtonFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("rectangle")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiCheckboxBlankFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("triangle")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiTriangleFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("line")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiAddFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("ellipse")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiBikeFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("polygon")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiCheckboxBlankFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("star")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiStarFill className="text-xl" />
              </button>
              <button
                onClick={() => setTool("arrow")}
                className="p-2 hover:bg-pink-600 hover:text-white rounded-full"
              >
                <RiArrowRightSLine className="text-xl" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setTool("text")}
          className={`p-3 rounded-full shadow-md transition-all ${
            tool === "text"
              ? "bg-pink-600 text-white"
              : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
          }`}
        >
          <RiFontSize className="text-xl" />
        </button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded-full border-2 border-pink-600 cursor-pointer"
        />
        <input
          type="range"
          min="1"
          max="50"
          value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
          className="accent-pink-600"
        />
        <button
          onClick={clearCanvas}
          className="p-3 rounded-full bg-white text-pink-600 shadow-md transition-all hover:bg-pink-600 hover:text-white"
        >
          <RiRefreshLine className="text-xl" />
        </button>
      </div>

      <div
        className="relative bg-white rounded-lg shadow-xl overflow-hidden flex-grow m-8"
      >
        <canvas
          ref={canvasRef}
          width={1310}
          height={662}
          className="border-2 border-pink-600 rounded-lg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
    </div>
  );
};

export default Canvas;
