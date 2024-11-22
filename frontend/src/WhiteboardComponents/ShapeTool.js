import React from 'react';

const ShapeTool = ({ shape, setShape, strokeColor, setStrokeColor, strokeWidth, setStrokeWidth }) => {
  const shapes = ['rectangle', 'circle', 'line']; // Available shapes

  return (
    <div className="flex flex-col items-start space-y-2">
      <h3 className="font-bold">Shape Tool</h3>
      <div className="flex space-x-2">
        {shapes.map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`p-2 border ${shape === s ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label htmlFor="strokeColor" className="block font-medium">
          Stroke Color:
        </label>
        <input
          type="color"
          id="strokeColor"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="mt-1 w-16 h-8"
        />
      </div>
      <div className="mt-4">
        <label htmlFor="strokeWidth" className="block font-medium">
          Stroke Width:
        </label>
        <input
          type="number"
          id="strokeWidth"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="mt-1 p-2 border w-16"
        />
      </div>
    </div>
  );
};

export default ShapeTool;
