import { useRef, useCallback } from "react";
import { useRemoteBrowser } from "@/hooks/use-remote-browser";
import { BrowserToolbar } from "@/components/browser/BrowserToolbar";
import { BrowserCanvas, type BrowserCanvasRef } from "@/components/browser/BrowserCanvas";
import { BrowserStatusBar } from "@/components/browser/BrowserStatusBar";

export default function BrowserPage() {
  const canvasRef = useRef<BrowserCanvasRef>(null);

  // We pass onFrame callback so only the canvas updates via imperative handle,
  // preventing the whole page from re-rendering 30 times a second.
  const handleFrame = useCallback((base64Data: string) => {
    canvasRef.current?.drawFrame(base64Data);
  }, []);

  const { 
    status, 
    currentUrl, 
    memoryUsage, 
    error, 
    send, 
    navigate, 
    updateSettings 
  } = useRemoteBrowser({ onFrame: handleFrame });

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-sans">
      
      {/* Top Address Bar & Controls */}
      <BrowserToolbar 
        currentUrl={currentUrl}
        onNavigate={navigate}
        onUpdateSettings={updateSettings}
        status={status}
        error={error}
      />
      
      {/* Main Remote Viewport */}
      <BrowserCanvas 
        ref={canvasRef}
        onSend={send}
        status={status}
      />

      {/* Bottom Information */}
      <BrowserStatusBar 
        status={status}
        memoryUsage={memoryUsage}
      />
      
    </div>
  );
}
