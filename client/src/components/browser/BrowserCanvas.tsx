import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { WsClientMessage } from "@shared/schema";
import { Loader2, MonitorX } from "lucide-react";

interface BrowserCanvasProps {
  onSend: (message: WsClientMessage) => void;
  status: "connecting" | "connected" | "disconnected" | "error";
}

export interface BrowserCanvasRef {
  drawFrame: (base64: string) => void;
  toggleFullscreen: () => Promise<void>;
  isFullscreen: () => boolean;
}

const WIDTH = 1280;
const HEIGHT = 720;

export const BrowserCanvas = forwardRef<BrowserCanvasRef, BrowserCanvasProps>(
  ({ onSend, status }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imeInputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

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
      },
      toggleFullscreen: async () => {
        const container = containerRef.current;
        if (!container) return;
        if (document.fullscreenElement === container) {
          await document.exitFullscreen();
          return;
        }
        await container.requestFullscreen();
      },
      isFullscreen: () => document.fullscreenElement === containerRef.current,
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
      if (isComposingRef.current) return;
      e.preventDefault();
      onSend({ type: "keyDown", key: e.key });
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
      if (isComposingRef.current) return;
      e.preventDefault();
      onSend({ type: "keyUp", key: e.key });
    };

    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      const text = e.data?.trim();
      if (!text) return;
      onSend({ type: "insertText", text });
      e.currentTarget.value = "";
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

    useEffect(() => {
      const onFullscreenChange = () => {
        setIsFullscreen(document.fullscreenElement === containerRef.current);
      };

      document.addEventListener("fullscreenchange", onFullscreenChange);
      return () => {
        document.removeEventListener("fullscreenchange", onFullscreenChange);
      };
    }, []);

    return (
      <div 
        ref={containerRef}
        className={`relative flex-1 overflow-hidden flex items-center justify-center ${
          isFullscreen
            ? "bg-black p-0"
            : "bg-neutral-100 dark:bg-neutral-900 p-4 md:p-8"
        }`}
        onClick={() => {
          canvasRef.current?.focus();
          imeInputRef.current?.focus();
        }}
      >
        <input
          type="text"
          ref={imeInputRef}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <div 
          className={`relative overflow-hidden transition-shadow duration-300 ${
            isFullscreen
              ? "w-screen h-screen rounded-none shadow-none bg-black"
              : `rounded-lg shadow-2xl bg-white ${
                  isFocused ? "shadow-primary/20 ring-2 ring-primary/20" : "shadow-black/10"
                }`
          }`}
        >
          {status !== "connected" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-muted-foreground gap-4">
              {status === "connecting" && (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="font-medium tracking-wide animate-pulse">ブラウザに接続中...</p>
                </>
              )}
              {(status === "disconnected" || status === "error") && (
                <>
                  <MonitorX className="w-8 h-8 text-destructive" />
                  <p className="font-medium tracking-wide">接続が切れました。再接続しています...</p>
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
              ${isFullscreen ? "w-full h-full object-contain" : "w-full h-auto max-w-[1280px] max-h-[720px] object-contain"}
              transition-opacity duration-500
              ${status === "connected" ? 'opacity-100' : 'opacity-50'}
            `}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>
    );
  }
);

BrowserCanvas.displayName = "BrowserCanvas";
