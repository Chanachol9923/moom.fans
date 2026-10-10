"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function browserClient(url: string, key: string) {
  client ??= createBrowserClient<Database>(url, key);
  return client;
}
