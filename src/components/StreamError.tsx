"use client";
import { useEffect, useRef } from "react";

/**
 * Error boundary content for pages OBS shows on stream. Never draws anything (a red
 * error card live on stream is worse than a blank moment); retries by itself, and
 * reloads the page if retrying keeps failing.
 */
export function StreamError({ error, retry }: { error: Error; retry: () => void }) {
  const tries = useRef(0);
  useEffect(() => {
    console.error(error);
    tries.current += 1;
    const t = setTimeout(() => (tries.current > 3 ? location.reload() : retry()), Math.min(30_000, 3000 * tries.current));
    return () => clearTimeout(t);
  }, [error, retry]);
  return null;
}
