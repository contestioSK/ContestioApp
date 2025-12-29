import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = "";
    
    try {
      const data = JSON.parse(text);
      if (data.message) {
        errorMessage = data.message;
      }
    } catch (e) {
      errorMessage = text || res.statusText;
    }
    
    throw new Error(errorMessage || res.statusText);
  }
}

/**
 * Enhanced API request with timeout, retry logic, and better error handling
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  }
): Promise<Response> {
  const { timeout = 10000, retries = 2, retryDelay = 1000 } = options || {};
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      await throwIfResNotOk(res);
      return res;
      
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx) except for specific cases
      if (lastError.message.includes('400') || 
          lastError.message.includes('401') || 
          lastError.message.includes('403') || 
          lastError.message.includes('404')) {
        throw lastError;
      }
      
      // Don't retry on the last attempt
      if (attempt === retries) {
        throw lastError;
      }
      
      // Add network error context for better error messages
      if (lastError.name === 'AbortError') {
        lastError = new Error('Network request timeout - please check your connection');
      } else if (lastError.message.includes('Failed to fetch')) {
        lastError = new Error('Network error - please check your internet connection');
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError!;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
