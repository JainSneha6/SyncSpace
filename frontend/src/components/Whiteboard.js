import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { RiBrushFill, RiCircleLine, RiDeleteBinLine, RiEraserFill, RiPaletteFill, RiRectangleLine, RiShapesFill, RiStickyNoteFill, RiTriangleFill, RiTriangleLine } from "react-icons/ri";
import { TbOvalVertical } from 'react-icons/tb';
import { BiPolygon, BiStar } from 'react-icons/bi';
import { FaArrowsAltH, FaGripLines, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import Chat from "./Chat";
import StickyNote from './StickyNote';

const Canvas = () => {
  const socketRef = useRef(null);
  const canvasRef = useRef(null);
  const roomId = useParams().roomId; // Assuming roomId is passed via route params
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [startPoint, setStartPoint] = useState(null);
  const [color, setColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [sides, setSides] = useState(5);
  const colorInputRef = useRef(null);
  const streamRef = useRef();
  const [isMicOn, setIsMicOn] = useState(true);
  const [stickyNotes, setStickyNotes] = useState([]);

  useEffect(() => {

    socketRef.current = io("http://localhost:5000");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        console.log("Microphone access granted.");
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
      });


    if (roomId) {
      socketRef.current.emit("joinRoom", roomId);

      socketRef.current.on("loadDrawing", (drawings) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        drawings.forEach((drawing) => renderDrawing(ctx, drawing));
      });

      socketRef.current.on("drawing", (data) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        renderDrawing(ctx, data);
      });

      socketRef.current.on("clearBoard", () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });

      socketRef.current.on("syncStickyNotes", (notes) => {
        setStickyNotes(notes);
      });

      socketRef.current.on("syncDeleteStickyNote", (noteId) => {
        // Remove the note with the specified ID
        setStickyNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
      });

      socketRef.current.on("createStickyNote", (note) => {
        setStickyNotes((prevNotes) => [...prevNotes, note]);
      });
    }

    return () => {
      socketRef.current.off("loadDrawing");
      socketRef.current.off("drawing");
      socketRef.current.off("clearBoard");
      socketRef.current.off("syncStickyNotes");
      socketRef.current.off("createStickyNote");
    };
  }, [roomId]);

  const renderDrawing = (ctx, drawing) => {
    ctx.strokeStyle = drawing.color || "#000";
    ctx.lineWidth = drawing.brushWidth || 1;

    switch (drawing.tool) {
      case "brush":
        ctx.beginPath();
        ctx.moveTo(drawing.prevX, drawing.prevY);
        ctx.lineTo(drawing.offsetX, drawing.offsetY);
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

      case "triangle":
        drawTriangle(ctx, drawing.startPoint, drawing.endPoint, drawing.fill);
        break;

      case "arrow":
        drawArrow(ctx, drawing.startPoint, drawing.endPoint, drawing.fill);
        break;

      default:
        console.error("Unknown tool:", drawing.tool);
    }
  };

  const handleColorClick = () => {
    colorInputRef.current.click();
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

  const drawTriangle = (ctx, start, end, fillShape) => {
    ctx.beginPath();
    ctx.moveTo(start.x, end.y); // Bottom-left
    ctx.lineTo(end.x, end.y); // Bottom-right
    ctx.lineTo((start.x + end.x) / 2, start.y); // Top-center
    ctx.closePath();
    if (fillShape) ctx.fill();
    else ctx.stroke();
  };

  const drawArrow = (ctx, start, end, fillShape) => {
    const arrowWidth = 10;
    const arrowHeight = 20;

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowPoint = { x: end.x, y: end.y };
    const arrowBase1 = {
      x: end.x - arrowHeight * Math.cos(angle) + arrowWidth * Math.sin(angle),
      y: end.y - arrowHeight * Math.sin(angle) - arrowWidth * Math.cos(angle),
    };
    const arrowBase2 = {
      x: end.x - arrowHeight * Math.cos(angle) - arrowWidth * Math.sin(angle),
      y: end.y - arrowHeight * Math.sin(angle) + arrowWidth * Math.cos(angle),
    };

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(arrowPoint.x, arrowPoint.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(arrowBase1.x, arrowBase1.y);
    ctx.lineTo(arrowPoint.x, arrowPoint.y);
    ctx.lineTo(arrowBase2.x, arrowBase2.y);
    ctx.closePath();

    if (fillShape) ctx.fill();
    else ctx.stroke();
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });

    if (tool === "brush") {
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = brushWidth;
    }
    else if (tool === "stickyNote") {
      createStickyNote(x, y); // Create sticky note at clicked position
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");

    // Set brush properties
    ctx.strokeStyle = color;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = "round"; // Ensures the ends of lines are rounded
    ctx.lineJoin = "round"; // Smoothens the joins between segments

    if (tool === "brush") {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y); // Start from the last point
      ctx.lineTo(x, y); // Draw to the current point
      ctx.stroke();

      // Emit the drawing event for real-time synchronization
      if (roomId) {
        socketRef.current.emit("drawing", {
          roomId,
          tool: "brush",
          offsetX: x,
          offsetY: y,
          prevX: startPoint.x,
          prevY: startPoint.y,
          color,
          brushWidth,
        });
      }

      // Update the start point for the next segment
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

      case "triangle":
        drawTriangle(ctx, startPoint, { x, y });
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;

      case "arrow":
        drawArrow(ctx, startPoint, { x, y });
        drawingData = { ...drawingData, startPoint, endPoint: { x, y } };
        break;

      default:
        break;
    }

    socketRef.current.emit("drawing", drawingData);

    setIsDrawing(false);
    setStartPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socketRef.current.emit("clearBoard", roomId);
  };


  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const isEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isEnabled;
        setIsMicOn(!isEnabled);
        console.log(`Microphone ${isEnabled ? "muted" : "unmuted"}.`);
      } else {
        console.warn("No audio tracks found in the stream.");
      }
    } else {
      console.error("Audio stream is not initialized.");
    }
  };


  const createStickyNote = (x, y) => {
    const note = {
      id: Date.now(), // You can use a better unique ID generation strategy
      x,
      y,
      text: "New sticky note",
      color: "#FFF9C4", // You can customize the color
    };

    // Emit the sticky note creation to the backend
    socketRef.current.emit("createStickyNote", {
      roomId,
      note,
    });

    // Temporarily add the sticky note locally (this will be synced later)
    setStickyNotes((prevNotes) => [...prevNotes, note]);
  };

  const updateStickyNote = (updatedNote) => {
    // Emit the updated sticky note to the backend
    socketRef.current.emit("updateStickyNote", {
      roomId,
      note: updatedNote,
    });

    // Update the sticky notes locally
    setStickyNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === updatedNote.id ? updatedNote : note
      )
    );
  };

  const deleteStickyNote = (noteId) => {
    // Emit the deletion event to the backend
    socketRef.current.emit("deleteStickyNote", {
      roomId,
      noteId,
    });

    // Remove the note locally (optimistic update)
    setStickyNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
  };

  const handleCreateNewNote = (x, y) => {
    createStickyNote(x, y); // Create a new note with an offset from the clicked note
  };

  return (
    <div className="min-h-screen bg-pink-600 flex">
      <div className="bg-white shadow-xl rounded-r-lg p-4 flex flex-col gap-4">
        <h2 className="text-pink-600 text-xl font-bold mb-4">Tools</h2>
        <button
          onClick={() => setTool("brush")}
          className={`p-3 rounded-full shadow-md transition-all ${tool === "brush" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
            }`}
        >
          <RiBrushFill className="text-xl" />
        </button>

        <button
          onClick={() => setTool("eraser")}
          className={`p-3 rounded-full shadow-md transition-all ${tool === "eraser" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
            }`}
        >
          <RiEraserFill className="text-xl" />
        </button>

        <div className="flex gap-8">
          <button
            onClick={() => setTool("circle")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "circle" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <RiCircleLine className="text-xl" />
          </button>

          <button
            onClick={() => setTool("rectangle")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "rectangle" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <RiRectangleLine className="text-xl" />
          </button>
        </div>

        <div className="flex gap-8 mt-2">
          <button
            onClick={() => setTool("triangle")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "triangle" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <RiTriangleLine className="text-xl" />
          </button>

          <button
            onClick={() => setTool("line")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "line" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <FaGripLines className="text-xl" />
          </button>
        </div>

        <div className="flex gap-8 mt-2">
          <button
            onClick={() => setTool("ellipse")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "ellipse" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <TbOvalVertical className="text-xl" />
          </button>

          <button
            onClick={() => setTool("polygon")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "polygon" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <BiPolygon className="text-xl" />
          </button>
        </div>

        <div className="flex gap-8 mt-2">
          <button
            onClick={() => setTool("star")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "star" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <BiStar className="text-xl" />
          </button>
          <button
            onClick={() => setTool("arrow")}
            className={`p-3 rounded-full shadow-md transition-all ${tool === "arrow" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"
              }`}
          >
            <FaArrowsAltH className="text-xl" />
          </button>
        </div>

        <button
          onClick={handleColorClick}
          className="p-2 rounded-full bg-pink-600 text-white hover:bg-pink-700"
        >
          <RiPaletteFill className="text-xl" />
        </button>
        <input
          type="color"
          ref={colorInputRef}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="hidden"
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
          onClick={() => setTool("stickyNote")}
          className={`p-3 rounded-full shadow-md transition-all ${tool === "stickyNote" ? "bg-pink-600 text-white" : "bg-white text-pink-600 hover:bg-pink-600 hover:text-white"}`}
        >
          <RiStickyNoteFill className="text-xl" />
        </button>

        <button
          onClick={clearCanvas}
          className="p-3 rounded-full bg-white text-pink-600 shadow-md transition-all hover:bg-pink-600 hover:text-white"
        >
          <RiDeleteBinLine className="text-xl" />
        </button>
      </div>

      <div className="relative bg-white rounded-lg shadow-xl overflow-hidden flex-grow m-8" >
        <canvas
          ref={canvasRef}
          width={1310}
          height={662}
          className="border-2 border-pink-600 rounded-lg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        <div className="controls">
          {/* Other tools and controls */}

          {/* Microphone toggle */}
          <button onClick={toggleMic} className="mic-toggle">
            {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>
        </div>
        {stickyNotes.map((note) => (
          <StickyNote
            key={note.id}
            noteData={note}
            onUpdateNote={updateStickyNote}
            onDeleteNote={deleteStickyNote}
            onCreateNewNote={handleCreateNewNote}
          />
        ))}

      </div>
      <div className="w-1/3 bg-white shadow-xl rounded-l-lg p-4">
        <Chat socketRef={socketRef} roomId={roomId} height={'400px'} />
      </div>
      {/* <button onClick={toggleMic} className="bg-pink-600 text-white py-3 px-6 rounded-full mr-4 transition duration-300 hover:bg-pink-700 shadow-lg transform hover:scale-105 flex items-center">
        {isMicOn ? <FaMicrophone className="mr-2" /> : <FaMicrophoneSlash className="mr-2" />}
        {isMicOn ? "Mute" : "Unmute"}
      </button> */}
    </div>
  );
};

export default Canvas;
