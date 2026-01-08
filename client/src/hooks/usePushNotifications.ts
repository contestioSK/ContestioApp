import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 
                          'PushManager' in window && 
                          'Notification' in window;
      setIsSupported(isSupported);
      
      if (isSupported) {
        await registerServiceWorker();
        await checkExistingSubscription();
      }
    };
    
    checkSupport();
  }, []);

  // Register Service Worker
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        console.log('[Push] Service Worker registered:', registration.scope);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        
        return registration;
      }
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
      toast({
        title: "Chyba registrácie",
        description: "Nepodarilo sa zaregistrovať Service Worker pre push notifikácie",
        variant: "destructive",
      });
    }
    return null;
  };

  // Check if user already has a push subscription
  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const subscriptionData = subscriptionToObject(subscription);
        setSubscription(subscriptionData);
        setIsSubscribed(true);
        console.log('[Push] Existing subscription found');
      }
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
    }
  };

  // Convert PushSubscription to plain object using standard toJSON() method
  const subscriptionToObject = (subscription: globalThis.PushSubscription): PushSubscription => {
    const subscriptionData = subscription.toJSON();
    
    return {
      endpoint: subscriptionData.endpoint || subscription.endpoint,
      keys: {
        p256dh: subscriptionData.keys?.p256dh || '',
        auth: subscriptionData.keys?.auth || '',
      },
    };
  };

  // Request notification permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported || !isAuthenticated) {
      return false;
    }

    setIsLoading(true);
    
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Povolenie zamietnuté",
          description: "Pre push notifikácie je potrebné povoliť notifikácie v prehliadači",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      // VAPID public key from environment variable (required) 
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        toast({
          title: "Push notifikácie nedostupné", 
          description: "VAPID konfiguracie chýbajú. Kontaktujte administrátora.",
          variant: "destructive",
        });
        return false;
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const subscriptionData = subscriptionToObject(subscription);
      
      // Send subscription to server
      await apiRequest('POST', '/api/push/subscribe', {
        subscription: subscriptionData,
        userId: user?.id
      });

      setSubscription(subscriptionData);
      setIsSubscribed(true);
      
      toast({
        title: "✅ Push notifikácie povolené",
        description: "Budete dostávať notifikácie aj keď nie je aplikácia otvorená",
      });
      
      console.log('[Push] Successfully subscribed to push notifications');
      return true;
      
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
      toast({
        title: "Chyba prihlásenia",
        description: "Nepodarilo sa pripojiť k push notifikáciám",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isAuthenticated, user?.id, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSubscribed || !subscription) {
      return true;
    }

    setIsLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await apiRequest('POST', '/api/push/unsubscribe', {
          userId: user?.id
        });
      }

      setSubscription(null);
      setIsSubscribed(false);
      
      toast({
        title: "🔕 Push notifikácie vypnuté",
        description: "Už nebudete dostávať push notifikácie",
      });
      
      console.log('[Push] Successfully unsubscribed from push notifications');
      return true;
      
    } catch (error) {
      console.error('[Push] Unsubscription failed:', error);
      toast({
        title: "Chyba odhlásenia",
        description: "Nepodarilo sa odhlásiť z push notifikácií",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, subscription, user?.id, toast]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscription,
    subscribe,
    unsubscribe
  };
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}