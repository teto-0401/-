import type { Express } from "express";
import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { BrowserManager } from "./browser";
import { wsClientMessageSchema, WsServerMessage } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  let memoryInterval: NodeJS.Timeout;

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WS] Client connected");

    let browserManager: BrowserManager | null = null;
    let isActive = true;
    
    const send = (msg: WsServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    browserManager = new BrowserManager(
      (data) => send({ type: "frame", data }),
      (url) => send({ type: "navigated", url }),
      (message) => send({ type: "error", message })
    );

    browserManager.start().then(() => {
      if (isActive) {
        browserManager?.goto("https://google.com");
      }
    });

    ws.on("message", async (rawData) => {
      try {
        const parsed = JSON.parse(rawData.toString());
        const msg = wsClientMessageSchema.parse(parsed);

        if (!browserManager) return;

        switch (msg.type) {
          case "goto":
            await browserManager.goto(msg.url);
            break;
          case "mouseMove":
            await browserManager.mouseMove(msg.x, msg.y);
            break;
          case "mouseDown":
            await browserManager.mouseDown(msg.button);
            break;
          case "mouseUp":
            await browserManager.mouseUp(msg.button);
            break;
          case "keyDown":
            await browserManager.keyDown(msg.key);
            break;
          case "keyUp":
            await browserManager.keyUp(msg.key);
            break;
          case "scroll":
            await browserManager.scroll(msg.deltaX, msg.deltaY);
            break;
          case "settings":
            await browserManager.updateScreencastSettings(
              msg.quality ?? 50,
              msg.everyNthFrame ?? 1
            );
            break;
        }
      } catch (err) {
        console.error("[WS] Invalid message:", err);
      }
    });

    ws.on("close", () => {
      console.log("[WS] Client disconnected");
      isActive = false;
      browserManager?.close();
    });

    ws.on("error", (err) => {
      console.error("[WS] Error:", err);
      isActive = false;
      browserManager?.close();
    });
  });

  // Memory usage logging (every 5 seconds)
  memoryInterval = setInterval(() => {
    const usage = process.memoryUsage();
    const mb = Math.round(usage.rss / 1024 / 1024);
    console.log(`[Memory] RSS: ${mb} MB`);
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "memory", usage: mb } as WsServerMessage));
      }
    });
  }, 5000);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
