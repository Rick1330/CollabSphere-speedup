import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEditorPreferences,
  pushRecentColor,
  readLocalRecentColors,
  updateEditorPreferences,
} from "@/api/adapters/editor-preferences";

const QUERY_KEY = ["editor-preferences"] as const;

let apiFallbackLogged = false;

export function useRecentColors() {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        return await fetchEditorPreferences();
      } catch {
        if (!apiFallbackLogged) {
          apiFallbackLogged = true;
          console.info("[editor] Using localStorage for recent colors (API unavailable).");
        }
        return { recentColors: readLocalRecentColors() };
      }
    },
    staleTime: 60_000,
    initialData: { recentColors: readLocalRecentColors() },
  });

  const mutation = useMutation({
    mutationFn: updateEditorPreferences,
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next);
    },
  });

  const addRecentColor = useCallback(
    (hex: string) => {
      const current = queryClient.getQueryData<{ recentColors: string[] }>(QUERY_KEY);
      const recentColors = pushRecentColor(current?.recentColors ?? readLocalRecentColors(), hex);
      queryClient.setQueryData(QUERY_KEY, { recentColors });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        mutation.mutate({ recentColors });
      }, 400);
    },
    [mutation, queryClient],
  );

  return {
    recentColors: data?.recentColors ?? [],
    addRecentColor,
  };
}
