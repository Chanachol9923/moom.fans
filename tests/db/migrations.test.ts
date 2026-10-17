// Runs the real migrations against an in-process Postgres (PGlite) with small
// stand-ins for the Supabase `auth` and `storage` schemas, then checks the RLS rules
// that matter most. This is not a substitute for `supabase start`, but it catches
// SQL errors and policy mistakes without Docker.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = join(__dirname, "../../supabase/migrations");

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id), name text, owner uuid
  );
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated, service_role;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
`;

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
// Owns the aggregate test data so the RLS checks on ALICE/BOB keep their expectations.
const CAROL = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;

async function as<T>(role: "anon" | "authenticated", sub: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, email) values ('${ALICE}', 'a@x.test'), ('${BOB}', 'b@x.test');
    insert into public.profiles (id, slug, display_name) values
      ('${ALICE}', 'alice', 'Alice'), ('${BOB}', 'bob', 'Bob');
    insert into public.streamer_private
      (streamer_id, promptpay_type, promptpay_id, overlay_token, control_token, overlay_channel) values
      ('${ALICE}', 'phone', '0812345678', 'ov-a', 'ct-a', 'ch-a'),
      ('${BOB}', 'phone', '0899999999', 'ov-b', 'ct-b', 'ch-b');
    insert into public.overlay_settings (streamer_id) values ('${ALICE}'), ('${BOB}');
    insert into public.products (streamer_id, title, price, file_path, is_published) values
      ('${ALICE}', 'Voice pack', 99, '${ALICE}/vp.zip', true),
      ('${ALICE}', 'Draft', 50, null, false);
    insert into public.transactions
      (streamer_id, kind, supporter_name, amount, public_token, expires_at) values
      ('${ALICE}', 'tip', 'fan', 50, 'tok-1', now() + interval '30 minutes');
  `);
});

describe("migrations", () => {
  it("creates the storage buckets", async () => {
    const r = await db.query<{ id: string; public: boolean }>(
      "select id, public from storage.buckets order by id",
    );
    expect(r.rows).toEqual([
      { id: "product-files", public: false },
      { id: "public-media", public: true },
      { id: "slips", public: false },
    ]);
  });

  it("rejects bad slugs", async () => {
    await expect(
      db.exec(`insert into public.profiles (id, slug, display_name) values ('${BOB}', 'Bad Slug', 'x')`),
    ).rejects.toThrow();
    await expect(
      db.exec(`insert into public.profiles (id, slug, display_name) values ('${BOB}', 'a--b', 'x')`),
    ).rejects.toThrow();
  });

  it("does not allow publishing a product without a file", async () => {
    await expect(
      db.exec(`update public.products set is_published = true where title = 'Draft'`),
    ).rejects.toThrow(/products_publish_needs_file/);
  });

  it("keeps slip references unique", async () => {
    await db.exec(`update public.transactions set slip_trans_ref = 'REF1' where public_token = 'tok-1'`);
    await expect(
      db.exec(`
        insert into public.transactions
          (streamer_id, kind, supporter_name, amount, public_token, expires_at, slip_trans_ref)
        values ('${BOB}', 'tip', 'x', 1, 'tok-2', now(), 'REF1')`),
    ).rejects.toThrow();
  });
});

describe("goals", () => {
  it("allows only one active goal per streamer", async () => {
    await db.exec(`insert into public.goals (streamer_id, title, target_amount) values ('${ALICE}', 'mic', 3000)`);
    await expect(
      db.exec(`insert into public.goals (streamer_id, title, target_amount) values ('${ALICE}', 'cam', 5000)`),
    ).rejects.toThrow(/goals_one_active/);
    await db.exec(`update public.goals set is_active = false where streamer_id = '${ALICE}'`);
    await db.exec(`insert into public.goals (streamer_id, title, target_amount) values ('${ALICE}', 'cam', 5000)`);
  });

  it("is publicly readable but only the owner can write", async () => {
    const r = await as("anon", null, () => db.query("select title from public.goals"));
    expect(r.rows.length).toBeGreaterThan(0);
    await expect(
      as("authenticated", BOB, () =>
        db.exec(`insert into public.goals (streamer_id, title, target_amount) values ('${ALICE}', 'x', 1)`),
      ),
    ).rejects.toThrow(/row-level security/);
    await as("authenticated", BOB, () => db.exec(`update public.goals set title = 'hacked'`));
    const t = await db.query<{ title: string }>(`select title from public.goals where is_active`);
    expect(t.rows[0].title).toBe("cam");
  });

  it("rejects bad alert styles and page config types", async () => {
    await expect(db.exec(`update public.overlay_settings set alert_style = 'neon'`)).rejects.toThrow();
    await expect(db.exec(`update public.profiles set page = '[]'::jsonb`)).rejects.toThrow();
  });
});

describe("polls", () => {
  it("needs 2-10 options and one active poll", async () => {
    await expect(
      db.exec(`insert into public.polls (streamer_id, title, options) values ('${ALICE}', 'x', '["only"]')`),
    ).rejects.toThrow();
    await db.exec(`insert into public.polls (streamer_id, title, options) values ('${ALICE}', 'next game', '["a","b"]')`);
    await expect(
      db.exec(`insert into public.polls (streamer_id, title, options) values ('${ALICE}', 'y', '["a","b"]')`),
    ).rejects.toThrow(/polls_one_active/);
  });
});

describe("subathon_add", () => {
  it("extends a running timer, ignores stopped ones, and is not callable by users", async () => {
    await db.exec(`update public.overlay_settings set subathon_ends_at = now() + interval '10 minutes' where streamer_id = '${ALICE}'`);
    await db.exec(`select public.subathon_add('${ALICE}', 60)`);
    await db.exec(`select public.subathon_add('${BOB}', 60)`);
    const r = await db.query<{ left: number; bob: string | null }>(`
      select extract(epoch from (a.subathon_ends_at - now()))::int as left, b.subathon_ends_at as bob
      from public.overlay_settings a, public.overlay_settings b
      where a.streamer_id = '${ALICE}' and b.streamer_id = '${BOB}'`);
    expect(r.rows[0].left).toBeGreaterThan(655);
    expect(r.rows[0].bob).toBeNull();
    await expect(
      as("authenticated", ALICE, () => db.exec(`select public.subathon_add('${ALICE}', 9999)`)),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("aggregate functions", () => {
  let n = 0;
  const tx = (o: { name?: string; amount: number; at: string; status?: string; kind?: string; anon?: boolean; wall?: boolean; poll?: string; option?: number }) => {
    n += 1;
    const purchase = o.kind === "purchase";
    return db.exec(`
      insert into public.transactions
        (streamer_id, kind, supporter_name, amount, public_token, expires_at, status, verified_at,
         is_anonymous, show_on_wall, product_title, supporter_email, poll_id, poll_option)
      values ('${CAROL}', '${o.kind ?? "tip"}', '${o.name ?? "fan"}', ${o.amount}, 'agg-${n}', now(),
              '${o.status ?? "verified"}', '${o.at}', ${o.anon ?? false}, ${o.wall ?? true},
              ${purchase ? "'pack'" : "null"}, ${purchase ? "'b@x.test'" : "null"},
              ${o.poll ? `'${o.poll}'` : "null"}, ${o.option ?? "null"})`);
  };

  beforeAll(async () => {
    await db.exec(`
      insert into auth.users (id, email) values ('${CAROL}', 'c@x.test');
      insert into public.profiles (id, slug, display_name) values ('${CAROL}', 'carol', 'Carol');`);
    await tx({ name: "Nok", amount: 20, at: "2026-10-02T00:00:00Z" });
    await tx({ name: "nok ", amount: 30, at: "2026-10-03T00:00:00Z" });
    await tx({ name: "Mew", amount: 40, at: "2026-10-03T00:00:00Z" });
    await tx({ name: "secret", amount: 500, at: "2026-10-03T00:00:00Z", anon: true });
    await tx({ name: "shy", amount: 900, at: "2026-10-03T00:00:00Z", wall: false });
    await tx({ name: "-", amount: 5, at: "2026-10-03T00:00:00Z" });
    await tx({ name: "old", amount: 999, at: "2026-09-01T00:00:00Z" });
    await tx({ name: "buyer", amount: 30, at: "2026-10-02T00:00:00Z", kind: "purchase" });
    await tx({ name: "unpaid", amount: 70, at: "2026-10-02T00:00:00Z", status: "pending_review" });
  });

  it("goal_raised adds verified tips inside the goal window to the starting amount", async () => {
    await db.exec(`
      insert into public.goals (id, streamer_id, title, target_amount, starting_amount, starts_at, is_active) values
        ('00000000-0000-0000-0000-0000000000a1', '${CAROL}', 'tips only', 5000, 100, '2026-10-01', false),
        ('00000000-0000-0000-0000-0000000000a2', '${CAROL}', 'with shop', 5000, 0, '2026-10-01', false),
        ('00000000-0000-0000-0000-0000000000a3', '${CAROL}', 'ended', 5000, 0, '2026-10-01', false)`);
    await db.exec(`update public.goals set include_purchases = true where id = '00000000-0000-0000-0000-0000000000a2'`);
    await db.exec(`update public.goals set ends_at = '2026-10-02T12:00:00Z' where id = '00000000-0000-0000-0000-0000000000a3'`);
    const r = await db.query<{ a: string; b: string; c: string }>(`
      select public.goal_raised('00000000-0000-0000-0000-0000000000a1')::text as a,
             public.goal_raised('00000000-0000-0000-0000-0000000000a2')::text as b,
             public.goal_raised('00000000-0000-0000-0000-0000000000a3')::text as c`);
    // tips after Oct 1: 20+30+40+500+900+5 = 1495 (anonymous and hidden still count as money raised)
    expect(Number(r.rows[0].a)).toBe(1595);
    expect(Number(r.rows[0].b)).toBe(1525);
    expect(Number(r.rows[0].c)).toBe(20);
  });

  it("top_supporters ranks by name, skipping anonymous, hidden and blank names", async () => {
    const all = await db.query<{ name: string; total: string }>(
      `select name, total::text from public.top_supporters('${CAROL}', null, 10)`,
    );
    expect(all.rows.map((r) => [r.name, Number(r.total)])).toEqual([
      ["old", 999],
      ["Nok", 50],
      ["Mew", 40],
      ["buyer", 30],
    ]);
    const recent = await db.query<{ name: string }>(
      `select name from public.top_supporters('${CAROL}', '2026-10-01', 2)`,
    );
    expect(recent.rows.map((r) => r.name)).toEqual(["Nok", "Mew"]);
  });

  it("poll_totals sums by amount or counts votes", async () => {
    await db.exec(`
      insert into public.polls (id, streamer_id, title, options, weight_by) values
        ('00000000-0000-0000-0000-0000000000b1', '${CAROL}', 'game', '["a","b"]', 'amount')`);
    await tx({ amount: 10, at: "2026-10-04T00:00:00Z", poll: "00000000-0000-0000-0000-0000000000b1", option: 0 });
    await tx({ amount: 25, at: "2026-10-04T00:00:00Z", poll: "00000000-0000-0000-0000-0000000000b1", option: 1 });
    await tx({ amount: 5, at: "2026-10-04T00:00:00Z", poll: "00000000-0000-0000-0000-0000000000b1", option: 1 });
    await tx({ amount: 99, at: "2026-10-04T00:00:00Z", poll: "00000000-0000-0000-0000-0000000000b1", option: 1, status: "rejected" });
    const byAmount = await db.query<{ option: number; total: string }>(
      `select option, total::text from public.poll_totals('00000000-0000-0000-0000-0000000000b1') order by option`,
    );
    expect(byAmount.rows.map((r) => [r.option, Number(r.total)])).toEqual([[0, 10], [1, 30]]);
    await db.exec(`update public.polls set weight_by = 'count' where id = '00000000-0000-0000-0000-0000000000b1'`);
    const byCount = await db.query<{ option: number; total: string }>(
      `select option, total::text from public.poll_totals('00000000-0000-0000-0000-0000000000b1') order by option`,
    );
    expect(byCount.rows.map((r) => [r.option, Number(r.total)])).toEqual([[0, 1], [1, 2]]);
  });

  it("is not callable by client roles", async () => {
    for (const sql of [
      `select public.goal_raised('00000000-0000-0000-0000-0000000000a1')`,
      `select * from public.top_supporters('${CAROL}', null, 5)`,
      `select * from public.poll_totals('00000000-0000-0000-0000-0000000000b1')`,
    ]) {
      await expect(as("anon", null, () => db.exec(sql))).rejects.toThrow(/permission denied/);
    }
  });
});

describe("app_links", () => {
  const hash = "a".repeat(64);
  const challenge = "B".repeat(43);

  it("stores hashed codes with a 5 minute expiry", async () => {
    await db.exec(`insert into public.app_links (code_hash, user_id, challenge) values ('${hash}', '${ALICE}', '${challenge}')`);
    const r = await db.query<{ mins: number }>(
      `select round(extract(epoch from (expires_at - created_at)) / 60)::int as mins from public.app_links where code_hash = '${hash}'`,
    );
    expect(r.rows[0].mins).toBe(5);
  });

  it("rejects malformed hashes and challenges", async () => {
    await expect(
      db.exec(`insert into public.app_links (code_hash, user_id, challenge) values ('plain-code', '${ALICE}', '${challenge}')`),
    ).rejects.toThrow();
    await expect(
      db.exec(`insert into public.app_links (code_hash, user_id, challenge) values ('${"b".repeat(64)}', '${ALICE}', 'short')`),
    ).rejects.toThrow();
  });

  it("is invisible and unwritable to client roles", async () => {
    await expect(as("authenticated", ALICE, () => db.query("select * from public.app_links"))).rejects.toThrow(/permission denied/);
    await expect(
      as("anon", null, () =>
        db.exec(`insert into public.app_links (code_hash, user_id, challenge) values ('${"c".repeat(64)}', '${ALICE}', '${challenge}')`),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("row level security", () => {
  it("anon sees profiles and only published products", async () => {
    const r = await as("anon", null, () =>
      db.query<{ title: string }>("select title from public.products order by title"),
    );
    expect(r.rows.map((x) => x.title)).toEqual(["Voice pack"]);
    const p = await as("anon", null, () => db.query<{ slug: string }>("select slug from public.profiles"));
    expect(p.rows.map((r) => r.slug)).toEqual(expect.arrayContaining(["alice", "bob"]));
  });

  it("anon cannot read private settings, transactions or alerts", async () => {
    for (const table of ["streamer_private", "transactions", "alerts", "overlay_settings", "pets"]) {
      const r = await as("anon", null, () => db.query(`select * from public.${table}`));
      expect(r.rows, table).toHaveLength(0);
    }
  });

  it("owners see their own private rows only", async () => {
    const r = await as("authenticated", BOB, () =>
      db.query<{ promptpay_id: string }>("select promptpay_id from public.streamer_private"),
    );
    expect(r.rows).toEqual([{ promptpay_id: "0899999999" }]);
    const t = await as("authenticated", BOB, () => db.query("select * from public.transactions"));
    expect(t.rows).toHaveLength(0);
  });

  it("owners can edit payout settings but not rotate tokens", async () => {
    await as("authenticated", ALICE, () =>
      db.exec(`update public.streamer_private set promptpay_id = '0811111111'`),
    );
    await expect(
      as("authenticated", ALICE, () =>
        db.exec(`update public.streamer_private set overlay_token = 'mine'`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("owners cannot write transactions directly", async () => {
    await expect(
      as("authenticated", ALICE, () =>
        db.exec(`update public.transactions set status = 'verified'`).then(async () => {
          const r = await db.query<{ status: string }>(
            "select status from public.transactions where public_token = 'tok-1'",
          );
          if (r.rows[0]?.status === "verified") throw new Error("updated!");
          throw new Error("no policy matched, as expected");
        }),
      ),
    ).rejects.toThrow(/no policy matched|permission denied/);
  });

  it("a streamer cannot edit someone else's profile or products", async () => {
    await as("authenticated", BOB, async () => {
      await db.exec(`update public.profiles set display_name = 'hacked' where id = '${ALICE}'`);
      await db.exec(`update public.products set price = 1 where streamer_id = '${ALICE}'`);
    });
    const r = await db.query<{ display_name: string }>(
      `select display_name from public.profiles where id = '${ALICE}'`,
    );
    expect(r.rows[0].display_name).toBe("Alice");
    const p = await db.query<{ price: string }>(
      `select price::text from public.products where title = 'Voice pack'`,
    );
    expect(p.rows[0].price).toBe("99.00");
  });

  it("a streamer cannot create products for someone else", async () => {
    await expect(
      as("authenticated", BOB, () =>
        db.exec(`insert into public.products (streamer_id, title, price) values ('${ALICE}', 'x', 5)`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("storage: owners write only inside their own folder", async () => {
    await as("authenticated", ALICE, () =>
      db.exec(`insert into storage.objects (bucket_id, name) values ('public-media', '${ALICE}/avatar.png')`),
    );
    await expect(
      as("authenticated", ALICE, () =>
        db.exec(`insert into storage.objects (bucket_id, name) values ('public-media', '${BOB}/avatar.png')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as("authenticated", ALICE, () =>
        db.exec(`insert into storage.objects (bucket_id, name) values ('slips', '${ALICE}/s.png')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});
