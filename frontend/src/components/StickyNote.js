import React, { useState, useEffect } from "react";

const StickyNote = ({ noteData, onUpdateNote, onDeleteNote, onCreateNewNote }) => {
  const [text, setText] = useState(noteData.text);
  const [position, setPosition] = useState({ x: noteData.x, y: noteData.y });

  useEffect(() => {
    setPosition({ x: noteData.x, y: noteData.y });
    setText(noteData.text);
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

  return (
    <div
      className="absolute p-4 rounded-lg border shadow-md bg-yellow-200 cursor-move"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '150px'
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
    </div>
  );
};

export default StickyNote;
