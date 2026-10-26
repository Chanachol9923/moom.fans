"use client";
import { ErrorScreen } from "@/components/ErrorScreen";

// Keeps the dashboard nav around the error, so one broken page doesn't strand the streamer.
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} inDashboard />;
}
