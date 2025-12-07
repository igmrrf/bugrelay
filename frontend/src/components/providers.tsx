"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { useUIStore } from "@/lib/stores";
import { useAutoSync } from "@/lib/sync-manager";
import { useAuthInit } from "@/lib/hooks/use-auth-init";
import { useWebSocketConnection } from "@/lib/realtime";
import { logger } from "@/lib/logging";
import { errorReporter } from "@/lib/error-reporting";

// Inner component to use hooks after QueryClient is available
function ProvidersInner({ children }: { children: React.ReactNode }) {
  // Initialize authentication state
  useAuthInit();

  // Set up automatic synchronization between stores and query cache
  useAutoSync();

  // Set up WebSocket connection management
  useWebSocketConnection();

  // Initialize logging and error reporting
  useEffect(() => {
    logger.retryPendingLogs();
    logger.info("Application initialized", "app", {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    // Initialize error reporter (it sets up global handlers)
    errorReporter.addBreadcrumb("Application started", "lifecycle", {
      timestamp: new Date().toISOString(),
    });
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            if (
              error.response.status === 408 ||
              error.response.status === 429
            ) {
              return failureCount < 2;
            }
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // Don't retry mutations on client errors
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        onError: (error: any) => {
          // Global error handling for mutations
          const { addToast } = useUIStore.getState();
          const message =
            error?.response?.data?.error?.message ||
            error?.message ||
            "An error occurred";
          addToast({
            title: "Error",
            description: message,
            type: "error",
          });
        },
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ProvidersInner>{children}</ProvidersInner>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

