import React from 'react';

const TextTool = ({
  isTextToolActive,
  setIsTextToolActive,
  currentText,
  setCurrentText,
  textSize,
  setTextSize,
  fontStyle,
  setFontStyle
}) => {
  return (
    <div>
      <button
        className={`p-2 rounded-md ${isTextToolActive ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        onClick={() => setIsTextToolActive(!isTextToolActive)}
      >
        Text Tool
      </button>

      {isTextToolActive && (
        <div>
          <input
            type="text"
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder="Enter your text"
            className="p-2 border rounded-md w-full"
          />
          <input
            type="range"
            min="12"
            max="48"
            value={textSize}
            onChange={(e) => setTextSize(e.target.value)}
            className="w-full"
          />
          <select
            value={fontStyle}
            onChange={(e) => setFontStyle(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="Arial">Arial</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default TextTool;
