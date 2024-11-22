import React from 'react';
import { FaEraser } from 'react-icons/fa';

const Eraser = ({ isErasing, setIsErasing, eraserWidth, setEraserWidth }) => {
  return (
    <div className="flex items-center">
      <FaEraser
        className={`text-3xl cursor-pointer ${isErasing ? 'text-red-500' : 'text-gray-500'} hover:scale-110 transition`}
        onClick={() => setIsErasing(!isErasing)}
      />
      {isErasing && (
        <input
          type="range"
          min="1"
          max="50"
          value={eraserWidth}
          onChange={(e) => setEraserWidth(e.target.value)}
          className="ml-2"
        />
      )}
    </div>
  );
};

export default Eraser;
