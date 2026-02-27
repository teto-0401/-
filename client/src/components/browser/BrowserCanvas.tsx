import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { WsClientMessage } from "@shared/schema";
import { Loader2, MonitorX } from "lucide-react";

interface BrowserCanvasProps {
  onSend: (message: WsClientMessage) => void;
  status: "connecting" | "connected" | "disconnected" | "error";
}

export interface BrowserCanvasRef {
  drawFrame: (base64: string) => void;
}

const WIDTH = 800;
const HEIGHT = 600;

export const BrowserCanvas = forwardRef<BrowserCanvasRef, BrowserCanvasProps>(
  ({ onSend, status }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(ref, () => ({
      drawFrame: (base64: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        };
        img.src = `data:image/jpeg;base64,${base64}`;
      }
    }));

    // Mouse Events
    const getCoordinates = (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY)
      };
    };

    const getMouseButton = (btn: number): "left" | "middle" | "right" => {
      if (btn === 0) return "left";
      if (btn === 1) return "middle";
      if (btn === 2) return "right";
      return "left";
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      const coords = getCoordinates(e);
      if (coords) {
        onSend({ type: "mouseMove", ...coords });
      }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      onSend({ type: "mouseDown", button: getMouseButton(e.button) });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
      onSend({ type: "mouseUp", button: getMouseButton(e.button) });
    };

    // Prevent context menu to allow right clicks to pass through
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
    };

    // Keyboard Events
    const handleKeyDown = (e: React.KeyboardEvent) => {
      e.preventDefault();
      onSend({ type: "keyDown", key: e.key });
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
      e.preventDefault();
      onSend({ type: "keyUp", key: e.key });
    };

    // Native Wheel Event (React onWheel might be passive)
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        onSend({ type: "scroll", deltaX: e.deltaX, deltaY: e.deltaY });
      };

      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        canvas.removeEventListener("wheel", handleWheel);
      };
    }, [onSend]);

    return (
      <div 
        ref={containerRef}
        className="relative flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex items-center justify-center p-4 md:p-8"
        onClick={() => canvasRef.current?.focus()}
      >
        <div 
          className={`
            relative rounded-lg overflow-hidden shadow-2xl transition-shadow duration-300
            ${isFocused ? 'shadow-primary/20 ring-2 ring-primary/20' : 'shadow-black/10'}
            bg-white
          `}
        >
          {status !== "connected" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-muted-foreground gap-4">
              {status === "connecting" && (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="font-medium tracking-wide animate-pulse">Connecting to browser...</p>
                </>
              )}
              {(status === "disconnected" || status === "error") && (
                <>
                  <MonitorX className="w-8 h-8 text-destructive" />
                  <p className="font-medium tracking-wide">Connection lost. Reconnecting...</p>
                </>
              )}
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            tabIndex={0}
            className={`
              block outline-none cursor-crosshair
              w-full h-auto max-w-[800px] max-h-[600px] object-contain
              transition-opacity duration-500
              ${status === "connected" ? 'opacity-100' : 'opacity-50'}
            `}
            style={{ width: WIDTH, height: HEIGHT }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
      </div>
    );
  }
);

BrowserCanvas.displayName = "BrowserCanvas";
