import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Globe, RefreshCw, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface BrowserToolbarProps {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onUpdateSettings: (settings: { everyNthFrame?: number; quality?: number }) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  status: string;
  error: string | null;
}

export function BrowserToolbar({ 
  currentUrl, 
  onNavigate, 
  onUpdateSettings,
  onToggleFullscreen,
  isFullscreen,
  status,
  error
}: BrowserToolbarProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [quality, setQuality] = useState([40]);
  const [fps, setFps] = useState([1]); // everyNthFrame
  const hasAppliedInitialSettingsRef = useRef(false);

  // Sync address bar when backend navigates
  useEffect(() => {
    if (currentUrl) {
      setInputUrl(currentUrl);
    }
  }, [currentUrl]);

  useEffect(() => {
    if (status !== "connected") {
      hasAppliedInitialSettingsRef.current = false;
      return;
    }
    if (hasAppliedInitialSettingsRef.current) return;
    onUpdateSettings({ quality: quality[0], everyNthFrame: fps[0] });
    hasAppliedInitialSettingsRef.current = true;
  }, [status, onUpdateSettings, quality, fps]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    
    if (!/^https?:\/\//i.test(target)) {
      if (target.includes(".") && !target.includes(" ")) {
        target = `https://${target}`;
      } else {
        target = `https://www.google.co.jp/search?q=${encodeURIComponent(target)}&hl=ja&gl=JP`;
      }
    }
    
    setInputUrl(target);
    onNavigate(target);
  };

  const handleQualityCommit = (val: number[]) => {
    setQuality(val);
    onUpdateSettings({ quality: val[0] });
  };

  const handleFpsCommit = (val: number[]) => {
    setFps(val);
    onUpdateSettings({ everyNthFrame: val[0] });
  };

  return (
    <div className="glass z-20 flex flex-col w-full">
      <div className="flex items-center gap-2 p-3 w-full max-w-5xl mx-auto">
        
        {/* Navigation Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center relative group">
          <Globe className="absolute left-4 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="検索語句またはURLを入力"
            className="w-full pl-11 pr-4 h-12 rounded-2xl bg-secondary/50 border-transparent hover:border-border focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-mono text-sm"
          />
        </form>

        {/* Reload (Just re-submits current URL) */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onNavigate(currentUrl || inputUrl)}
          disabled={status !== "connected"}
          className="h-12 w-12 rounded-2xl hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="h-12 w-12 rounded-2xl hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </Button>

        {/* Settings Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-12 w-12 rounded-2xl hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-6 rounded-2xl shadow-xl">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-1">配信設定</h4>
                <p className="text-xs text-muted-foreground">画質とフレーム間引きを調整して通信量を抑えます。</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">JPEG画質 ({quality[0]}%)</Label>
                  </div>
                  <Slider 
                    value={quality}
                    onValueChange={setQuality}
                    onValueCommit={handleQualityCommit}
                    max={100}
                    min={10}
                    step={5}
                    className="py-2"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">キャプチャ間引き (毎 {fps[0]} フレーム)</Label>
                  </div>
                  <Slider 
                    value={fps}
                    onValueChange={setFps}
                    onValueCommit={handleFpsCommit}
                    max={10}
                    min={1}
                    step={1}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">値を小さくすると滑らか、大きくするとCPU/メモリ使用量を抑えます。</p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

      </div>
      
      {/* Error Bar */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm font-medium px-4 py-2 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
