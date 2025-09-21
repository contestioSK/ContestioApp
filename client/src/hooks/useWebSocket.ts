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
          
          // Handle real-time updates with comprehensive admin panel support
          switch (data.type) {
            // Competition events
            case 'competition_created':
            case 'competition_updated':
            case 'competition_deleted':
            case 'competition_status_update':
              console.log(`WebSocket: ${data.type} received for competition ${data.competitionId}`);
              queryClient.invalidateQueries({ 
                queryKey: ['/api/competitions'] 
              });
              if (data.competitionId) {
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/competitions', data.competitionId] 
                });
              }
              // Invalidate admin dashboard stats
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/dashboard'] 
              });
              break;
              
            // Team events
            case 'team_created':
            case 'team_updated':
            case 'team_deleted':
            case 'team_status_update':
              console.log(`WebSocket: ${data.type} received for team ${data.teamId} in competition ${data.competitionId}`);
              if (data.competitionId) {
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/competitions', data.competitionId, 'teams'] 
                });
              }
              if (data.teamId) {
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/teams', data.teamId] 
                });
              }
              // Invalidate admin dashboard stats
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/dashboard'] 
              });
              break;
              
            // Referee events
            case 'referee_created':
            case 'referee_updated':
            case 'referee_deleted':
              console.log(`WebSocket: ${data.type} received for competition ${data.competitionId}`);
              if (data.competitionId) {
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/competitions', data.competitionId, 'referees'] 
                });
              }
              break;
              
            // Sponsor events
            case 'sponsor_created':
            case 'sponsor_updated':
            case 'sponsor_deleted':
              console.log(`WebSocket: ${data.type} received for competition ${data.competitionId}`);
              if (data.competitionId) {
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/competitions', data.competitionId, 'sponsors'] 
                });
              }
              break;
              
            // Catch events
            case 'new_catch':
            case 'catch_updated':
            case 'catch_deleted':
              console.log(`WebSocket: ${data.type} received for competition ${data.competitionId}`);
              if (data.competitionId) {
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
              }
              // Invalidate admin dashboard stats
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/dashboard'] 
              });
              break;
              
            // Registration events
            case 'registration_created':
            case 'registration_updated':
            case 'registration_approved':
            case 'registration_rejected':
              console.log(`WebSocket: ${data.type} received`);
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/registrations'] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/dashboard'] 
              });
              break;
              
            // User events
            case 'user_updated':
            case 'user_role_changed':
            case 'user_status_changed':
              console.log(`WebSocket: ${data.type} received`);
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/users'] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/dashboard'] 
              });
              break;
              
            default:
              console.log(`WebSocket: Unhandled event type: ${data.type}`);
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
