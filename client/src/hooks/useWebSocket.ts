import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(onMessage?: (data: WebSocketMessage) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    // Don't create multiple connections
    if (socketRef.current?.readyState === WebSocket.CONNECTING || 
        socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle common real-time updates
          switch (data.type) {
            case 'new_catch':
              // Invalidate catches and leaderboard queries
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions', data.competitionId, 'catches'] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions', data.competitionId, 'teams'] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions', data.competitionId, 'leaderboard'] 
              });
              break;
              
            case 'team_status_update':
              // Invalidate team queries
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions', data.competitionId, 'teams'] 
              });
              break;
              
            case 'competition_status_update':
              // Invalidate competition queries
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions'] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions', data.competitionId] 
              });
              break;
          }

          // Call custom message handler if provided
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            connect();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Component unmounting');
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
