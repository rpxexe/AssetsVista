"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

/**
 * Shared TanStack Query hook for dropdown and reference list caching.
 * Uses long staleTime so modals open instantly with zero redundant network requests.
 */
export function useCachedOptions<T = any>(queryKey: readonly string[], endpoint: string) {
  return useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      const response = await axios.get(endpoint);
      return response.data?.data ?? [];
    },
    staleTime: 1000 * 60 * 10, // Keep dropdown lists fresh for 10 minutes
    gcTime: 1000 * 60 * 30, // Retain in memory for 30 minutes
  });
}

