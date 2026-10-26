"use client";
import { StreamError } from "@/components/StreamError";

export default function OnStreamError({ error, retry }: { error: Error; retry: () => void }) {
  return <StreamError error={error} retry={retry} />;
}
