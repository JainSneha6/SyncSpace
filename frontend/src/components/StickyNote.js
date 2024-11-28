import React, { useState, useEffect } from "react";

const StickyNote = ({ noteData, onUpdateNote, onDeleteNote, onCreateNewNote }) => {
  const [text, setText] = useState(noteData.text);
  const [position, setPosition] = useState({ x: noteData.x, y: noteData.y });
  const [color, setColor] = useState(noteData.color || '#FFFAE3'); // Default light yellow color

  useEffect(() => {
    setPosition({ x: noteData.x, y: noteData.y });
    setText(noteData.text);
    setColor(noteData.color || '#FFFAE3');
  }, [noteData]);

  const handleDrag = (e) => {
    const offsetX = e.clientX - position.x;
    const offsetY = e.clientY - position.y;

    const newPosition = {
      x: e.clientX - offsetX,
      y: e.clientY - offsetY
    };

    setPosition(newPosition);

    onUpdateNote({
      ...noteData,
      x: newPosition.x,
      y: newPosition.y
    });
  };

  const handleDragEnd = (e) => {
    onUpdateNote({
      ...noteData,
      x: position.x,
      y: position.y
    });
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    onUpdateNote({
      ...noteData,
      text: e.target.value
    });
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    onUpdateNote({
      ...noteData,
      color: newColor
    });
  };

  return (
    <div
      className="absolute p-4 rounded-lg border shadow-md cursor-move"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '150px',
        backgroundColor: color // Set the sticky note color
      }}
      draggable
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <textarea
        value={text}
        onChange={handleTextChange}
        className="w-full h-full p-2 bg-transparent border-none focus:outline-none"
        placeholder="Type your note here..."
      />
      <button
        onClick={() => onDeleteNote(noteData.id)}
        className="absolute top-1 right-1 text-red-600"
      >
        &times;
      </button>

      {/* Color selection dots in the top-right corner */}
      <div className="absolute top-1 left-1 mt-1 flex space-x-1">
        {['#F4C2C2', '#FFE0B2', '#B3E5FC', '#C8E6C9', '#FFF9C4', '#F3E5F5'].map((dotColor) => (
          <div
            key={dotColor}
            onClick={() => handleColorChange(dotColor)}
            className="w-3 h-3 rounded-full cursor-pointer"
            style={{
              backgroundColor: dotColor,
              border: color === dotColor ? '2px solid #000' : 'none', // Highlight selected color
              transition: 'border 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default StickyNote;