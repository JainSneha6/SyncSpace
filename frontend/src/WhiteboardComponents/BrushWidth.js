import { FaPaintBrush } from "react-icons/fa";

const BrushWidth = ({ brushWidth, setBrushWidth, showBrushWidth, setShowBrushWidth, setActiveTool }) => {
    return (
      <div className="flex items-center">
        <FaPaintBrush
          className="text-3xl text-blue-500 cursor-pointer hover:scale-110 transition"
          onClick={() => {
            setShowBrushWidth(!showBrushWidth);
            setActiveTool('brush'); // Activate the brush tool
          }}
        />
        {showBrushWidth && (
          <input
            type="range"
            min="1"
            max="20"
            value={brushWidth}
            onChange={(e) => setBrushWidth(e.target.value)}
          />
        )}
      </div>
    );
  };
  
  export default BrushWidth;
  