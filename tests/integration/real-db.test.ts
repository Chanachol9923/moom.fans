// End-to-end check of the server code against the real Supabase project:
// auth, RLS, storage, the payment pipeline, alerts and the public aggregates.
// Creates one throw-away user and removes everything it made afterwards.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

Object.assign(process.env, loadEnv("", process.cwd(), ""));

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const tag = Math.random().toString(36).slice(2, 8);
const slug = `it-${tag}`;
const overlayToken = `ov-${tag}-${"x".repeat(20)}`;
let admin: SupabaseClient;
let userId = "";
let userClient: SupabaseClient;
let tx: typeof import("@/lib/domain/transactions");
let wall: typeof import("@/lib/domain/wall");

const anonClient = () => createClient(URL_, ANON, { auth: { persistSession: false } });

beforeAll(async () => {
  if (!URL_ || !ANON || !SECRET) throw new Error("Supabase env vars missing in .env.local");
  admin = createClient(URL_, SECRET, { auth: { persistSession: false } });
  const email = `moom-it-${tag}@example.com`;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  // the same three rows the onboarding action writes
  expect((await admin.from("profiles").insert({ id: userId, slug, display_name: "IT Bird" })).error).toBeNull();
  expect(
    (
      await admin.from("streamer_private").insert({
        streamer_id: userId,
        promptpay_type: "phone",
        promptpay_id: "0812345678",
        overlay_token: overlayToken,
        control_token: `ct-${tag}-${"x".repeat(20)}`,
        overlay_channel: `ch-${tag}-${"x".repeat(8)}`,
      })
    ).error,
  ).toBeNull();
  expect((await admin.from("overlay_settings").insert({ streamer_id: userId })).error).toBeNull();

  // a real signed-in session, so RLS runs as the `authenticated` role
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  userClient = anonClient();
  const v = await userClient.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  expect(v.error).toBeNull();

  tx = await import("@/lib/domain/transactions");
  wall = await import("@/lib/domain/wall");
});

afterAll(async () => {
  if (!userId) return;
  // storage objects are not removed by FK cascades
  for (const bucket of ["slips", "public-media", "product-files"]) {
    const { data } = await admin.storage.from(bucket).list(userId, { limit: 100 });
    if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
  }
  await admin.auth.admin.deleteUser(userId);
});

describe("real Supabase project", () => {
  it("lets the user edit their own profile, and hides private rows from anonymous callers", async () => {
    const up = await userClient.from("profiles").update({ bio: "hello" }).eq("id", userId).select("bio");
    expect(up.data?.[0]?.bio).toBe("hello");
    const mine = await userClient.from("streamer_private").select("promptpay_id");
    expect(mine.data).toEqual([{ promptpay_id: "0812345678" }]);
    const anon = anonClient();
    expect((await anon.from("streamer_private").select("*")).data).toEqual([]);
    expect((await anon.from("profiles").select("slug").eq("slug", slug)).data).toEqual([{ slug }]);
  });

  let token = "";
  let txId = "";

  it("creates a tip, stores the slip in the private bucket and queues it for review", async () => {
    token = await tx.createTransaction(slug, {
      kind: "tip",
      name: "it-fan",
      message: "integration hello",
      amount: 50,
      anonymous: false,
      showOnWall: true,
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    const status = await tx.submitSlip(token, new File([PNG], "slip.png", { type: "image/png" }));
    expect(status).toBe("pending_review");
    const row = await tx.getTransactionByToken(token);
    txId = row!.id;
    expect(row!.slip_path).toBe(`${userId}/${txId}.png`);

    const seen = await userClient.from("transactions").select("id,status").eq("id", txId);
    expect(seen.data).toEqual([{ id: txId, status: "pending_review" }]);
    expect((await anonClient().from("transactions").select("id")).data).toEqual([]);
  });

  it("verifies exactly once and queues exactly one alert", async () => {
    expect(await tx.verifyTransaction(txId, "manual")).toBe(true);
    expect(await tx.verifyTransaction(txId, "manual")).toBe(false);
    const alerts = await userClient.from("alerts").select("status,payload").eq("transaction_id", txId);
    expect(alerts.data).toHaveLength(1);
    expect(alerts.data![0].status).toBe("queued");
    expect((alerts.data![0].payload as { name: string }).name).toBe("it-fan");
  });

  it("reflects the verified tip in goal progress, the wall and the leaderboard", async () => {
    const g = await userClient
      .from("goals")
      .insert({ streamer_id: userId, title: "it goal", target_amount: 100, starting_amount: 10 });
    expect(g.error).toBeNull();
    // A goal counts money verified after it starts, plus its starting amount.
    expect(await wall.activeGoal(userId)).toMatchObject({ title: "it goal", target: 100, raised: 10 });

    const second = await tx.createTransaction(slug, { kind: "tip", name: "it-fan", message: "", amount: 50, anonymous: false, showOnWall: true });
    const secondRow = await tx.getTransactionByToken(second);
    expect(await tx.verifyTransaction(secondRow!.id, "manual")).toBe(true);

    expect(await wall.activeGoal(userId)).toMatchObject({ raised: 60 });
    const data = await wall.wallData(userId, { recentCount: 5, topCount: 5, topPeriod: "30d", locale: "en" });
    expect(data.recent.map((r) => r.name)).toContain("it-fan");
    expect(data.top[0]).toMatchObject({ name: "it-fan", total: 100 });
  });

  it("serves overlay state and widget data for the overlay token", async () => {
    const overlay = await import("@/lib/domain/overlay");
    const widgets = await import("@/lib/domain/widgets");
    const state = await overlay.loadOverlayState(overlayToken);
    expect(state?.streamer.slug).toBe(slug);
    expect(state?.alerts).toHaveLength(2);
    expect((await widgets.loadWidgetData(overlayToken))?.goal?.raised).toBe(60);
  });

  it("extends the subathon clock atomically", async () => {
    await admin
      .from("overlay_settings")
      .update({ subathon_ends_at: new Date(Date.now() + 600_000).toISOString() })
      .eq("streamer_id", userId);
    await admin.rpc("subathon_add", { p_streamer: userId, p_seconds: 120 });
    const { data } = await admin.from("overlay_settings").select("subathon_ends_at").eq("streamer_id", userId).single();
    const left = (new Date(data!.subathon_ends_at!).getTime() - Date.now()) / 1000;
    expect(left).toBeGreaterThan(690);
    expect(left).toBeLessThan(725);
  });
});
