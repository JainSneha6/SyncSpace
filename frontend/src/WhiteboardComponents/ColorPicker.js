import React from 'react';
import { FaPalette } from 'react-icons/fa';
import { ChromePicker } from 'react-color';

const ColorPicker = ({ color, setColor, showPicker, setShowPicker }) => {
  return (
    <div className="relative">
      <FaPalette
        className="text-3xl text-pink-500 cursor-pointer hover:scale-110 transition"
        onClick={() => setShowPicker(!showPicker)} // Toggle showPicker
        />

      {showPicker && (
        <div className="absolute z-10 mt-2">
          <ChromePicker color={color} onChangeComplete={(color) => setColor(color.hex)} />
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
