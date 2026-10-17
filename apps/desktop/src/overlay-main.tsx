import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { StageView } from "@moom/shared/overlay/engine";
import { OverlayStage } from "@moom/shared/ui/overlay/OverlayStage";
import { stageLink } from "./platform";
import { HELLO_MS } from "./stage-link";
import "./styles.css";

// The OBS browser source. It draws whatever the app window tells it to and holds
// no secrets: no account token, no Supabase keys. Sound is played by the app.

const params = new URLSearchParams(location.search);
const preview = params.has("preview");
const mode = params.has("bc") ? "bc" : "ws";
const id = crypto.randomUUID();

function Stage() {
  const [view, setView] = useState<StageView | null>(null);
  const speakRef = useRef<((user: string, text: string) => void) | null>(null);
  const link = useRef<ReturnType<typeof stageLink> | null>(null);

  useEffect(() => {
    const l = stageLink((m) => {
      if (m.t === "view") setView(m.view);
      else if (m.t === "speak") speakRef.current?.(m.user, m.text);
    }, mode);
    link.current = l;
    const hello = () => l.send({ t: "hello", id, preview });
    hello();
    const t = setInterval(hello, HELLO_MS);
    const bye = () => l.send({ t: "bye", id });
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", bye);
      bye();
      l.close();
      link.current = null;
    };
  }, []);

  if (!view) return null;
  return (
    <OverlayStage
      view={view}
      speakRef={speakRef}
      onWheelTick={preview ? undefined : () => link.current?.send({ t: "tick" })}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Stage />
  </StrictMode>,
);
