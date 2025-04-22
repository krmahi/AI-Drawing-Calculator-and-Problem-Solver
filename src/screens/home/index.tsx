import { useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import axios from "axios";
import { SWATCHES } from "@/../constants";
import { Toolbar } from "@/components/ui/Toolbar";

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface GenerateResult {
  expression: string;
  answer: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [brushSize, setBrushSize] = useState(3);
  const [isErasing, setIsErasing] = useState(false);
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<GenerateResult>();
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [dictOfVars, setDictOfVars] = useState({});
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - canvas.offsetTop;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/4.0.0-beta.7/tex-mml-chtml.js";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getCanvasPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 1,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      const { x, y, pressure } = getCanvasPos(e);

      // Capture initial snapshot for undo
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          const snap = ctx.getImageData(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          setHistory((prev) => [...prev, snap]);
          if (redoStack.length > 0) {
            // User starts drawing again, clear redo (new branch)
            setRedoStack([]);
          }
        }
      }

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = brushSize * pressure;
      setIsDrawing(true);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing) return;
      const { x, y, pressure } = getCanvasPos(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = isErasing ? "black" : color;
      ctx.lineWidth = brushSize * pressure;
      ctx.stroke();
    };

    const handlePointerUp = () => {
      setIsDrawing(false);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [color, isDrawing, brushSize, isErasing]);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHistory([]);
        if (redoStack.length > 0) {
          // User starts drawing again, clear redo (new branch)
          setRedoStack([]);
        }
      }
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newHistory = [...history];
    const last = newHistory.pop();
    if (!last) return;
    setHistory(newHistory);
    setRedoStack((prev) => [
      ctx.getImageData(0, 0, canvas.width, canvas.height),
      ...prev,
    ]);
    ctx.putImageData(last, 0, 0);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [restored, ...rest] = redoStack;
    if (!restored) return;

    // Push current state to history before replacing
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, current]);
    setRedoStack(rest);

    ctx.putImageData(restored, 0, 0);
  };

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `${expression} = ${answer}`;
    setLatexExpression([...latexExpression, latex]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const sendData = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const response = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });

      const resp = await response.data;
      resp.data.forEach((data: Response) => {
        if (data.assign === true) {
          setDictOfVars({
            ...dictOfVars,
            [data.expr]: data.result,
          });
        }
      });

      const ctx = canvas.getContext("2d");
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (imageData.data[(y * canvas.width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // const centerX = (minX + maxX) / 6;
      // const centerY = (minY + maxY) / 2.6;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // const latexBoxWidth = 250;
      // const latexBoxHeight = 100;

      const safeX = Math.min((minX + maxX) / 9.5, canvasWidth);
      const safeY = Math.min((minY + maxY) / 2, canvasHeight);

      setLatexPosition({ x: safeX, y: safeY });
      // setLatexPosition({ x: centerX, y: centerY });
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
        });
      }, 200);
    }
  };

  return (
    <>
      <Toolbar
        onUndo={undo}
        onRedo={redo}
        onReset={() => setReset(true)}
        onSend={sendData}
        swatches={SWATCHES}
        onColorChange={(color) => {
          setColor(color);
          setIsErasing(false);
        }}
        onBrushSizeChange={setBrushSize}
        onToggleEraser={() => setIsErasing(!isErasing)}
        isErasing={isErasing}
        brushSize={brushSize}
        color={color}
      />

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-fill h-fill bg-black z-0 touch-none"
        style={{
          overflow: "hidden",
        }}
      />

      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(_e, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute text-wrap">
              <div
                className="latext-content text-white p-2 text-base sm:text-xl rounded"
                style={{
                  maxWidth: "calc(100vw - 32px)", // prevents going off-screen
                  maxHeight: "40vh",
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflowX: "hidden",
                  overflowY: "hidden",
                }}
              >
                {latex}
              </div>
            </div>
          </Draggable>
        ))}
    </>
  );
}
