import { z } from "zod";

// WS events from Client to Server
export const wsClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("init"), url: z.string().optional(), viewport: z.object({ width: z.number(), height: z.number() }).optional() }),
  z.object({ type: z.literal("goto"), url: z.string() }),
  z.object({ type: z.literal("mouseMove"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("mouseDown"), button: z.enum(["left", "middle", "right"]) }),
  z.object({ type: z.literal("mouseUp"), button: z.enum(["left", "middle", "right"]) }),
  z.object({ type: z.literal("keyDown"), key: z.string() }),
  z.object({ type: z.literal("keyUp"), key: z.string() }),
  z.object({ type: z.literal("scroll"), deltaX: z.number(), deltaY: z.number() }),
  z.object({ type: z.literal("settings"), everyNthFrame: z.number().optional(), quality: z.number().optional() }),
]);

export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;

// WS events from Server to Client
export const wsServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("frame"), data: z.string() }), // Base64 JPEG
  z.object({ type: z.literal("navigated"), url: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("memory"), usage: z.number() }), // MB
]);

export type WsServerMessage = z.infer<typeof wsServerMessageSchema>;
