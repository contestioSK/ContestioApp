import { useEffect, useRef, useCallback, useState } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(onMessage?: (data: WebSocketMessage) => void) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const [isSocketAuthenticated, setIsSocketAuthenticated] = useState(false);

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
        console.log('WebSocket connected - server will authenticate automatically');
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle authentication responses
          if (data.type === 'auth_success') {
            console.log('[WS] Authentication successful');
            setIsSocketAuthenticated(true);
            return;
          }
          
          if (data.type === 'auth_error') {
            console.log('[WS] Authentication failed:', data.message);
            setIsSocketAuthenticated(false);
            // If server says to use polling instead (role not allowed), don't reconnect
            if (data.usePolling) {
              console.log('[WS] User role not allowed for WebSocket - using polling instead');
              reconnectAttempts.current = maxReconnectAttempts; // Prevent reconnection attempts
            }
            return;
          }
          
          // Handle all WebSocket message types
          switch (data.type) {
            // Targeted notification types for authenticated users
            case 'targeted_catch_notification':
              console.log('[WS] New catch notification for favorites:', data);
              toast({
                title: "🎣 Nový úlovok!",
                description: `${data.teamName} chytil ${data.weight}kg rybu v obľúbenej súťaži ${data.competitionName}`,
                duration: 5000,
              });
              if (onMessage) onMessage(data);
              break;
              
            case 'targeted_leaderboard_change':
              console.log('[WS] Leaderboard change for favorites:', data);
              toast({
                title: "📊 Zmena v rebríčku",
                description: `${data.teamName} sa posunul na ${data.position}. miesto v súťaži ${data.competitionName}`,
                duration: 4000,
              });
              if (onMessage) onMessage(data);
              break;
              
            case 'targeted_biggest_fish':
              console.log('[WS] New biggest fish notification:', data);
              toast({
                title: "🏆 Nová najväčšia ryba!",
                description: `Rekordný úlovok ${data.weight}kg od ${data.teamName} v súťaži ${data.competitionName}!`,
                duration: 6000,
              });
              if (onMessage) onMessage(data);
              break;
              
            case 'targeted_official_announcement':
              console.log('[WS] Official announcement:', data);
              toast({
                title: "📢 Oficiálne oznámenie",
                description: data.message,
                duration: 7000,
              });
              if (onMessage) onMessage(data);
              break;

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
              
            // Diary photo processing result
            case 'diary_photo_processed':
              console.log(`[WS] Photo processed: ${data.photoId}, status: ${data.status}`);
              queryClient.invalidateQueries({ queryKey: ['/api/diary/catches'] });
              queryClient.invalidateQueries({ queryKey: ['/api/diary/trips'] });
              if (data.status === 'failed') {
                toast({
                  title: "Fotka sa nepodarila spracovať",
                  description: "Skúste fotografiu nahrať znova.",
                  variant: "destructive",
                  duration: 6000,
                });
              }
              // post-switch dispatcher below forwards onMessage; don't double-fire.
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
