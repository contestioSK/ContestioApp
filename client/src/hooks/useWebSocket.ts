import { useEffect, useContext } from "react";
import { WSContext } from "@/providers/WebSocketProvider";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(onMessage?: (data: WebSocketMessage) => void) {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");

  useEffect(() => {
    if (!onMessage) return;
    return ctx.subscribe(onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // onMessage intentionally not in deps — stored in Set, inline callbacks are safe

  return {
    isConnected: ctx.status === "connected",
    sendMessage: ctx.send,
  };
}
