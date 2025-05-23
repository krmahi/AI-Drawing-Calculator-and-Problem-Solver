import React from "react";
import { Button } from "@/components/ui/button";
import { ColorSwatch, Group, Tooltip, Slider } from "@mantine/core";
import { Undo2, Redo2, RefreshCcw, Calculator, Eraser } from "lucide-react";

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onSend: () => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onToggleEraser: () => void;
  isErasing: boolean;
  swatches: string[];
  brushSize: number;
  color: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onUndo,
  onRedo,
  onReset,
  onSend,
  onColorChange,
  onBrushSizeChange,
  onToggleEraser,
  isErasing,
  swatches,
  brushSize,
  color,
}) => {
  return (
    <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 p-3 rounded-2xl shadow-md flex flex-wrap justify-center items-center gap-2 w-[95%] sm:w-auto">
      <Tooltip label="Undo">
        <Button
          className="hover:bg-zinc-800"
          variant="ghost"
          size="lg"
          onClick={onUndo}
        >
          <Undo2 size={24} className="text-white" />
        </Button>
      </Tooltip>

      <Tooltip label="Redo">
        <Button
          className="hover:bg-zinc-800"
          variant="ghost"
          size="lg"
          onClick={onRedo}
        >
          <Redo2 size={24} className="text-white" />
        </Button>
      </Tooltip>

      <Tooltip label="Reset">
        <Button
          className="hover:bg-zinc-800"
          variant="ghost"
          size="lg"
          onClick={onReset}
        >
          <RefreshCcw size={24} className="text-white" />
        </Button>
      </Tooltip>

      <Tooltip label="Calculate">
        <Button
          className="hover:bg-zinc-800"
          variant="ghost"
          size="lg"
          onClick={onSend}
        >
          <Calculator size={24} className="text-white" />
        </Button>
      </Tooltip>

      <Tooltip label={isErasing ? "Eraser On" : "Eraser Off"}>
        <Button
          className="hover:bg-zinc-800"
          variant={isErasing ? "default" : "ghost"}
          size="lg"
          onClick={onToggleEraser}
        >
          <Eraser size={24} className="text-white" />
        </Button>
      </Tooltip>

      <Group gap={10} className="ml-2 flex-wrap">
        {swatches.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            size={23}
            onClick={() => onColorChange(color)}
            style={{ cursor: "pointer" }}
          />
        ))}
      </Group>

      <Tooltip label={`Brush Size: ${brushSize}`}>
        <Slider
          min={1}
          max={20}
          value={brushSize}
          onChange={onBrushSizeChange}
          className="w-28 ml-2"
        />
      </Tooltip>
      <div className="ml-2 flex items-center gap-2">
        <span className="text-xm text-white">Brush:</span>
        <div
          className="rounded-full border border-white"
          style={{
            width: brushSize * 2,
            height: brushSize * 2,
            backgroundColor: isErasing ? "black" : color,
            boxShadow: "0 0 4px {rgba(255,255,255,0.5)}",
            border: "None",
          }}
        />
      </div>
    </div>
  );
};
