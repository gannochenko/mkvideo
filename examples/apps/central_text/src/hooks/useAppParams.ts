import { useMemo } from "react";

export interface AppParams {
  title?: string;
  date?: string;
  tags?: string;
  rendering: boolean;
}

export function useAppParams(): AppParams {
  return useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      title: p.get("title") ?? undefined,
      date: p.get("date") ?? undefined,
      tags: p.get("tags") ?? undefined,
      rendering: p.has("rendering"),
    };
  }, []);
}
