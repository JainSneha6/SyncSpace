import React, { useState } from 'react';

const StickyNote = ({ noteData, onUpdateNote, onDeleteNote }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(noteData.text);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onUpdateNote({ ...noteData, text });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: noteData.y,
        left: noteData.x,
        backgroundColor: noteData.color,
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        cursor: 'pointer',
        width: '150px',
      }}
      onClick={() => setIsEditing(true)}
    >
      {isEditing ? (
        <textarea
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
          }}
        />
      ) : (
        <p>{text}</p>
      )}
      <button
        onClick={() => onDeleteNote(noteData.id)}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'transparent',
          border: 'none',
          color: 'red',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        X
      </button>
    </div>
  );
};

export default StickyNote;
