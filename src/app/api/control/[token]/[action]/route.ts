import { streamerByControlToken } from "@/lib/domain/overlay";
import { notifyOverlay } from "@/lib/realtime";

// Stream Deck / bookmark friendly: GET or POST /api/control/<control token>/<panic|skip|resume>.
// The control token is separate from the overlay token so it can be rotated independently.
async function handle(_req: Request, ctx: RouteContext<"/api/control/[token]/[action]">) {
  const { token, action } = await ctx.params;
  if (action !== "panic" && action !== "skip" && action !== "resume") return new Response("unknown action", { status: 404 });
  const s = await streamerByControlToken(token);
  if (!s) return new Response("not found", { status: 404 });
  await notifyOverlay(s.overlay_channel, { type: "control", action });
  return new Response(`ok: ${action}\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}

export { handle as GET, handle as POST };
