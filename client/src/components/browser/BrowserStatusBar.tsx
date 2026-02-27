import { ShieldCheck, Monitor, Activity, ServerCrash } from "lucide-react";

interface BrowserStatusBarProps {
  status: string;
  memoryUsage: number;
}

export function BrowserStatusBar({ status, memoryUsage }: BrowserStatusBarProps) {
  return (
    <div className="h-10 border-t border-border/50 bg-background flex items-center justify-between px-4 text-xs font-medium text-muted-foreground z-20">
      
      {/* Status Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          ) : (
            <ServerCrash className="w-4 h-4 text-destructive" />
          )}
          <span className="capitalize">{status}</span>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 border-l border-border/50 pl-4">
          <Monitor className="w-4 h-4" />
          <span>Remote Session</span>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
        <Activity className="w-3 h-3 text-primary/70" />
        <span className="font-mono">{memoryUsage.toFixed(1)} MB</span>
      </div>

    </div>
  );
}
