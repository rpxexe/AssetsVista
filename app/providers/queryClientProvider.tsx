"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { ReactNode, useEffect, useRef, useState } from "react";

interface Props {
  children: ReactNode;
}

/**
 * Clears cached React Query data whenever the signed-in Clerk user changes or signs out,
 * ensuring a newly signed-in user never sees stale dashboard counts or records from a previous session.
 */
function AuthQueryCacheSync() {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const currentId = user?.id ?? null;

    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== currentId) {
      queryClient.clear();
    }

    prevUserIdRef.current = currentId;
  }, [isLoaded, user?.id, queryClient]);

  return null;
}

export default function QueryClientProviderWrapper({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes fresh cache before background revalidation
            gcTime: 1000 * 60 * 30, // Keep cached data warm in memory for 30 minutes
            refetchOnWindowFocus: false, // Prevent request bursts on window focus / tab switching
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthQueryCacheSync />
      {children}
    </QueryClientProvider>
  );
}
