import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type WSStatus = "disconnected" | "connecting" | "connected";
type Subscriber = (data: any) => void;

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type WSContextValue = {
  status: WSStatus;
  send: (msg: any) => void;
  subscribe: (fn: Subscriber) => () => void;
};

export const WSContext = createContext<WSContextValue | null>(null);

function safeJsonParse(str: string): any | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function handleCentralizedLogic(data: WebSocketMessage) {
  switch (data.type) {
    case "competition_created":
    case "competition_updated":
    case "competition_deleted":
    case "competition_status_update":
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      if (data.competitionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      break;

    case "team_created":
    case "team_updated":
    case "team_deleted":
    case "team_status_update":
      if (data.competitionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId, "teams"] });
      }
      if (data.teamId) {
        queryClient.invalidateQueries({ queryKey: ["/api/teams", data.teamId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      break;

    case "referee_created":
    case "referee_updated":
    case "referee_deleted":
      if (data.competitionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId, "referees"] });
      }
      break;

    case "sponsor_created":
    case "sponsor_updated":
    case "sponsor_deleted":
      if (data.competitionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId, "sponsors"] });
      }
      break;

    case "new_catch":
    case "catch_updated":
    case "catch_deleted":
      if (data.competitionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId, "catches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId, "teams"] });
        queryClient.invalidateQueries({ queryKey: ["/api/competitions", data.competitionId, "leaderboard"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      break;

    case "registration_created":
    case "registration_updated":
    case "registration_approved":
    case "registration_rejected":
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      break;

    case "user_updated":
    case "user_role_changed":
    case "user_status_changed":
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      break;

    case "targeted_catch_notification":
      toast({
        title: "🎣 Nový úlovok!",
        description: `${data.teamName} chytil ${data.weight}kg rybu v obľúbenej súťaži ${data.competitionName}`,
        duration: 5000,
      });
      break;

    case "targeted_leaderboard_change":
      toast({
        title: "📊 Zmena v rebríčku",
        description: `${data.teamName} sa posunul na ${data.position}. miesto v súťaži ${data.competitionName}`,
        duration: 4000,
      });
      break;

    case "targeted_biggest_fish":
      toast({
        title: "🏆 Nová najväčšia ryba!",
        description: `Rekordný úlovok ${data.weight}kg od ${data.teamName} v súťaži ${data.competitionName}!`,
        duration: 6000,
      });
      break;

    case "targeted_official_announcement":
      toast({
        title: "📢 Oficiálne oznámenie",
        description: data.message,
        duration: 7000,
      });
      break;

    default:
      break;
  }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const subsRef = useRef<Set<Subscriber>>(new Set());
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const destroyedRef = useRef(false);
  const [status, setStatus] = useState<WSStatus>("disconnected");

  const connect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (destroyedRef.current) return;

    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus("connected");
    };

    ws.onmessage = (ev) => {
      const payload =
        typeof ev.data === "string" ? safeJsonParse(ev.data) : ev.data;
      if (!payload) return;

      if (payload.type === "auth_success") {
        return;
      }

      if (payload.type === "auth_error") {
        if (payload.usePolling) {
          attemptRef.current = 99;
        }
        return;
      }

      handleCentralizedLogic(payload);

      subsRef.current.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          console.error("[WS] subscriber error", e);
        }
      });
    };

    ws.onerror = () => {
      // onclose follows, handled there
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;

      if (destroyedRef.current) return;
      if (attemptRef.current >= 99) return;

      const attempt = attemptRef.current;
      attemptRef.current = Math.min(attempt + 1, 8);

      const delay = Math.min(15000, 500 * Math.pow(2, attempt));
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        if (!destroyedRef.current) connect();
      }, delay);
    };
  }, []);

  useEffect(() => {
    destroyedRef.current = false;
    connect();

    return () => {
      destroyedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const ws = wsRef.current;
      wsRef.current = null;
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        try {
          ws.close(1000, "provider unmount");
        } catch {}
      }
    };
  }, [connect]);

  const send = useCallback((msg: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  const subscribe = useCallback((fn: Subscriber) => {
    subsRef.current.add(fn);
    return () => subsRef.current.delete(fn);
  }, []);

  const value = useMemo<WSContextValue>(
    () => ({ status, send, subscribe }),
    [status, send, subscribe]
  );

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWS must be used within WebSocketProvider");
  return ctx;
}
