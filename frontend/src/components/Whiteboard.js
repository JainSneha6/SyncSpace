import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const Canvas = () => {
  const canvasRef = useRef(null);
  const roomId = useParams().roomId; // Assuming roomId is passed via route params
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [startPoint, setStartPoint] = useState(null);
  const [color, setColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [sides, setSides] = useState(5);
  const [fill, setFill] = useState(false);
  const [textBoxes, setTextBoxes] = useState([]); // Store text boxes
  const [currentText, setCurrentText] = useState(""); // Text being typed
  const [selectedTextBox, setSelectedTextBox] = useState(null); // Active text box

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

  const handleCanvasClick = (e) => {
    if (tool !== "text") return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newTextBox = {
      id: Date.now(),
      x,
      y,
      text: "",
      color,
    };

    setTextBoxes([...textBoxes, newTextBox]);
    setSelectedTextBox(newTextBox.id);
  };

  const handleTextInputChange = (e) => {
    const text = e.target.value;
    setCurrentText(text);

    setTextBoxes((boxes) =>
      boxes.map((box) =>
        box.id === selectedTextBox ? { ...box, text } : box
      )
    );
  };

  const renderTextBoxes = () => {
    return textBoxes.map((box) => (
      <textarea
        key={box.id}
        value={box.text}
        onChange={(e) => handleTextInputChange(e, box.id)}
        onClick={() => setSelectedTextBox(box.id)}
        style={{
          position: "absolute",
          top: box.y,
          left: box.x,
          color: box.color,
          border: "none",
          resize: "none",
          backgroundColor: "transparent",
        }}
      />
    ));
  };

  const clearText = () => {
    setTextBoxes([]); // Clear all textboxes
    setSelectedTextBox(null); // Deselect any active textbox
    setCurrentText(""); // Reset current text
  };

  const handleKeyDown = (e) => {
    if (tool !== "text" || selectedTextBox === null) return;

    if (e.key === "Enter") {
      setSelectedTextBox(null); // Deselect text box on Enter
    }
  };

  const renderDrawing = (ctx, drawing) => {
    ctx.strokeStyle = drawing.color || "#000";
    ctx.fillStyle = drawing.fillColor || "#000"; // Use fillColor for filling shapes
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
        ctx.strokeStyle = "#FFFFFF"; // Use white for eraser
        ctx.lineWidth = drawing.brushWidth || 1;
        ctx.stroke();
        break;

      case "circle":
        ctx.beginPath();
        ctx.arc(drawing.startPoint.x, drawing.startPoint.y, drawing.radius, 0, 2 * Math.PI);
        ctx.lineWidth = drawing.brushWidth || 1;
        if (drawing.fill) {
          ctx.fill(); // Fill the circle
        } else {
          ctx.stroke();
        }
        break;

      case "rectangle":
        ctx.lineWidth = drawing.brushWidth || 1;
        if (drawing.fill) {
          ctx.fillRect(
            drawing.startPoint.x,
            drawing.startPoint.y,
            drawing.endPoint.x - drawing.startPoint.x,
            drawing.endPoint.y - drawing.startPoint.y
          );
        } else {
          ctx.strokeRect(
            drawing.startPoint.x,
            drawing.startPoint.y,
            drawing.endPoint.x - drawing.startPoint.x,
            drawing.endPoint.y - drawing.startPoint.y
          );
        }
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
        if (drawing.fill) {
          ctx.fill(); // Fill the ellipse
        } else {
          ctx.stroke();
        }
        break;

      case "polygon":
        ctx.lineWidth = drawing.brushWidth || 1;
        if (drawing.fill) {
          ctx.beginPath();
          drawPolygon(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.sides);
          ctx.fill(); // Fill the polygon
        } else {
          drawPolygon(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.sides);
          ctx.stroke();
        }
        break;

      case "star":
        ctx.lineWidth = drawing.brushWidth || 1;
        if (drawing.fill) {
          ctx.beginPath();
          drawStar(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.points);
          ctx.fill(); // Fill the star
        } else {
          drawStar(ctx, drawing.startPoint.x, drawing.startPoint.y, drawing.radius, drawing.points);
          ctx.stroke();
        }
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

    // Set brush properties
    ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
    ctx.fillStyle = color;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = "round"; // Ensures the ends of lines are rounded
    ctx.lineJoin = "round"; // Smoothens the joins between segments

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y); // Start from the last point
      ctx.lineTo(x, y); // Draw to the current point
      ctx.stroke();

      // Emit the drawing event for real-time synchronization
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
          fill
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
    let drawingData = { roomId, tool, color, brushWidth, fill };

    switch (tool) {
      case "circle":
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.beginPath();
        ctx.lineWidth = brushWidth;
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        if (fill) {
          ctx.fill(); // Fill the circle
        } else {
          ctx.stroke();
        }
        drawingData = { ...drawingData, startPoint, radius };
        break;

      case "rectangle":
        ctx.lineWidth = brushWidth;
        if (fill) {
          ctx.fillRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        } else {
          ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        }
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

        if (fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }

        drawingData = { ...drawingData, startPoint, endPoint: { x, y }, radiusX, radiusY };
        break;

      case "polygon":
        const radiusPoly = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.lineWidth = brushWidth;
        drawPolygon(ctx, startPoint.x, startPoint.y, radiusPoly, sides);
        if (fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        drawingData = { ...drawingData, startPoint, radius: radiusPoly, sides };
        break;

      case "star":
        const radiusStar = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        ctx.lineWidth = brushWidth;
        drawStar(ctx, startPoint.x, startPoint.y, radiusStar, sides);
        if (fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
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
    <div>
      <div>
        <button onClick={() => setTool("brush")}>Brush</button>
        <button onClick={() => setTool("eraser")}>Eraser</button>
        <button onClick={() => setTool("circle")}>Circle</button>
        <button onClick={() => setTool("rectangle")}>Rectangle</button>
        <button onClick={() => setTool("line")}>Line</button>
        <button onClick={() => setTool("ellipse")}>Ellipse</button>
        <button onClick={() => setTool("polygon")}>Polygon</button>
        <button onClick={() => setTool("star")}>Star</button>
        <button onClick={() => setTool("text")}>Text</button>
        <button onClick={clearText}>Clear Text</button>
        <button onClick={clearCanvas}>Clear</button>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="range"
          min="1"
          max="50"
          value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
        />
        {tool === "polygon" || tool === "star" ? (
          <input
            type="number"
            min="3"
            value={sides}
            onChange={(e) => setSides(Number(e.target.value))}
          />
        ) : null}
        <label>
          Fill shapes:
          <input type="checkbox" checked={fill} onChange={() => setFill(!fill)} />
        </label>
      </div>
      <div
        style={{ position: "relative" }}
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
        tabIndex={0} // Make div focusable for key events
      >
        {renderTextBoxes()}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ border: "1px solid black" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        {selectedTextBox && (
          <input
            type="text"
            value={currentText}
            onChange={handleTextInputChange}
            style={{
              position: "absolute",
              top: textBoxes.find((box) => box.id === selectedTextBox).y,
              left: textBoxes.find((box) => box.id === selectedTextBox).x,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Canvas;
