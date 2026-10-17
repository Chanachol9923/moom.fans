import { useEffect, useMemo, useRef, useState } from "react";
import type { OverlayAlert, OverlayState } from "@moom/shared/alerts";
import { useT } from "@moom/shared/i18n/react";
import { httpApi, useOverlayEngine, type OverlayApi } from "@moom/shared/overlay/engine";
import { Button, Panel, cx } from "@moom/shared/ui/kit";
import { AccountTab } from "./AccountTab";
import { useDeviceSettings } from "./device";
import { DeviceTab } from "./DeviceTab";
import { HomeTab } from "./HomeTab";
import { appLink, openExternal, registerHotkey } from "./platform";
import { SITE, supabase } from "./session";
import { StageClients } from "./stage-link";

type Boot = { token: string; initial: OverlayState; name: string; email: string };

/** Loads what the engine needs: the overlay token (readable only by its owner) and the first state. */
export function Live({ userId }: { userId: string }) {
  const { d } = useT();
  const [boot, setBoot] = useState<Boot | "onboarding" | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let dead = false;
    void (async () => {
      const [priv, user] = await Promise.all([
        supabase.from("streamer_private").select("overlay_token").maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (dead) return;
      if (priv.error) return setBoot("error");
      if (!priv.data) return setBoot("onboarding");
      const token = priv.data.overlay_token as string;
      const initial = await httpApi(token, SITE).state().catch(() => null);
      if (dead) return;
      if (!initial) return setBoot("error");
      setBoot({ token, initial, name: initial.streamer.displayName, email: user.data.user?.email ?? "" });
    })();
    return () => {
      dead = true;
    };
  }, [userId, attempt]);

  if (boot === null) return <p className="m-6 text-ink-faint">{d.common.loading}</p>;
  if (boot === "error" || boot === "onboarding") {
    return (
      <main className="mx-auto grid w-full max-w-md flex-1 content-center px-4">
        <Panel>
          <p>{boot === "onboarding" ? d.desktop.needOnboarding : d.desktop.loadFailed}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {boot === "onboarding" ? (
              <Button variant="primary" onClick={() => openExternal(`${SITE}/onboarding`)}>
                {d.desktop.openWeb}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setBoot(null);
                setAttempt((n) => n + 1);
              }}
            >
              {d.desktop.retry}
            </Button>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              {d.desktop.signOut}
            </Button>
          </div>
        </Panel>
      </main>
    );
  }
  return <Running {...boot} />;
}

const TEST_PREFIX = "test-";

/** The real API, plus local test alerts that never touch the server. */
function appApi(token: string): OverlayApi {
  const real = httpApi(token, SITE);
  const local = (id: string) => id.startsWith(TEST_PREFIX);
  return {
    state: real.state,
    claim: (id) => (local(id) ? Promise.resolve(true) : real.claim(id)),
    finish: (id, skipped) => (local(id) ? Promise.resolve() : real.finish(id, skipped)),
    ttsUrl: (id) => (local(id) ? null : real.ttsUrl(id)),
  };
}

export type Tab = "home" | "device" | "account";

function Running({ token, initial, name, email }: Boot) {
  const { d, locale } = useT();
  const [device, setDevice] = useDeviceSettings();
  const [tab, setTab] = useState<Tab>("home");
  const api = useMemo(() => appApi(token), [token]);

  const link = useRef<ReturnType<typeof appLink> | null>(null);
  const engine = useOverlayEngine({
    api,
    initial,
    vts: true,
    vtsTokenKey: "moom_vts_token_desktop",
    holdInitial: true,
    sinkId: device.sinkId,
    volumeOverride: device.volume,
    onSpeak: (user, text) => link.current?.send({ t: "speak", user, text }),
  });
  const { view, wheelTick, panic, resume } = engine;

  // ---- talk to the OBS pages -----------------------------------------------------
  const latestView = useRef(view);
  const tickRef = useRef(wheelTick);
  useEffect(() => {
    latestView.current = view;
    tickRef.current = wheelTick;
  });
  const clients = useRef(new StageClients());
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    const l = appLink((m) => {
      if (m.t === "hello") {
        if (clients.current.hello(m.id, m.preview)) l.send({ t: "view", view: latestView.current });
      } else if (m.t === "bye") clients.current.bye(m.id);
      else if (m.t === "tick") tickRef.current();
      setClientCount(clients.current.count());
    });
    link.current = l;
    const t = setInterval(() => setClientCount(clients.current.count()), 2000);
    return () => {
      clearInterval(t);
      l.close();
      link.current = null;
    };
  }, []);

  useEffect(() => {
    link.current?.send({ t: "view", view });
    // view is rebuilt every render; send only when one of its parts changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.config, view.pets, view.current, view.paused]);

  // ---- panic hotkey: press to stop everything, press again to resume ---------------
  const pausedRef = useRef(view.paused);
  useEffect(() => {
    pausedRef.current = view.paused;
  }, [view.paused]);
  const [hotkeyOk, setHotkeyOk] = useState(true);
  useEffect(() => {
    let off: (() => void) | null = null;
    let dead = false;
    void registerHotkey(device.hotkey, () => (pausedRef.current ? resume() : panic())).then((un) => {
      if (dead) un?.();
      else {
        off = un;
        setHotkeyOk(un !== null);
      }
    });
    return () => {
      dead = true;
      off?.();
    };
  }, [device.hotkey, panic, resume]);

  // ---- "updated from the web" note when account settings change while running -------
  const cfgJson = JSON.stringify(engine.state.config) + JSON.stringify(engine.state.pets);
  const firstCfg = useRef(cfgJson);
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (cfgJson === firstCfg.current) return;
    firstCfg.current = cfgJson;
    const show = setTimeout(() => setSynced(true), 0);
    const hide = setTimeout(() => setSynced(false), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [cfgJson]);

  // ---- slips waiting for review (refreshed whenever the engine refreshes) ------------
  const [reviewCount, setReviewCount] = useState(0);
  useEffect(() => {
    let dead = false;
    void supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review")
      .then(({ count }) => {
        if (!dead) setReviewCount(count ?? 0);
      });
    return () => {
      dead = true;
    };
  }, [engine.state]);

  const sendTest = () => {
    const a: OverlayAlert = {
      id: `${TEST_PREFIX}${crypto.randomUUID()}`,
      kind: "test",
      createdAt: new Date().toISOString(),
      payload: {
        name: "Moom",
        amount: 99,
        message: d.desktop.testMessage,
        productTitle: null,
        media: null,
        tts: false,
        locale,
      },
    };
    engine.enqueueLocal(a);
  };

  const tabs: Array<[Tab, string]> = [
    ["home", d.desktop.tabHome],
    ["device", d.desktop.tabDevice],
    ["account", d.desktop.tabAccount],
  ];

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex gap-1 border-b-[3px] border-ink bg-paper px-3 pt-2" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              "-mb-[3px] border-[3px] border-b-0 px-3 py-1.5 font-display text-sm",
              tab === id ? "border-ink bg-paper-2" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {label}
            {id === "home" && reviewCount > 0 && (
              <span className="ml-1.5 bg-beak px-1 font-num text-xs text-ink">{reviewCount}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        {synced && <span className="self-center font-display text-xs text-leaf">{d.desktop.syncedFromWeb}</span>}
      </nav>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {tab === "home" && (
          <HomeTab
            engine={engine}
            clientCount={clientCount}
            reviewCount={reviewCount}
            hotkey={device.hotkey}
            hotkeyOk={hotkeyOk}
            onTest={sendTest}
          />
        )}
        {tab === "device" && (
          <DeviceTab
            device={device}
            setDevice={setDevice}
            accountVolume={engine.state.config.volume}
            hotkeyOk={hotkeyOk}
            onTest={sendTest}
          />
        )}
        {tab === "account" && <AccountTab name={name} email={email} />}
      </main>
    </div>
  );
}
