import { useState, type ReactNode } from "react";
import { ALERT_ANIMATIONS } from "@moom/shared/alerts";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { CopyField } from "@moom/shared/ui/CopyField";
import { FontPicker } from "@moom/shared/ui/FontPicker";
import { Button, Check, Field, Input, Panel, Select, Tag, Textarea, cx } from "@moom/shared/ui/kit";
import { ChatStage } from "./chat/ChatStage";
import { CHAT_LOOKS, CHAT_PRESETS, DEFAULT_CHAT_STYLE, parseChatStyle, type ChatStyle } from "./chat/style";
import type { ChatLine } from "./chat/types";
import type { ChatStatus } from "./chat/useChat";
import type { DeviceSettings } from "./device";
import { obsUrl } from "./platform";

type Chat = { lines: ChatLine[]; status: ChatStatus; test: (name: string, text: string, paid?: boolean) => void; clear: () => void };

export function ChatTab({
  device,
  setDevice,
  chat,
  accountTwitch,
  brandFontUrl,
}: {
  device: DeviceSettings;
  setDevice: (p: Partial<DeviceSettings>) => void;
  chat: Chat;
  /** The Twitch channel saved on the website, used unless this PC overrides it. */
  accountTwitch: string | null;
  brandFontUrl: string | null;
}) {
  const { d } = useT();
  const C = d.desktop.chat;
  const s = device.chatStyle;
  const setStyle = (patch: Partial<ChatStyle>) => setDevice({ chatStyle: parseChatStyle({ ...s, ...patch }) });
  const setColor = (k: keyof ChatStyle["colors"], v: string | number) => setStyle({ colors: { ...s.colors, [k]: v } });
  const [n, setN] = useState(0);

  const sendTest = (paid = false) => {
    const i = n % C.testNames.length;
    chat.test(C.testNames[i], paid ? C.testPaid : C.testTexts[i], paid);
    setN(n + 1);
  };

  const yt = chat.status.youtube;
  const ytTone = yt === "live" ? "ok" : yt === "off" ? "muted" : yt === "connecting" || yt === "not_live" ? "warn" : "bad";
  const useWebTwitch = device.twitch === null;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft">{C.intro}</p>

      <Panel title={C.step1}>
        <Field label={C.youtube} htmlFor="chat-yt" hint={C.youtubeHint}>
          <Input
            id="chat-yt"
            value={device.youtube}
            placeholder={C.youtubePlaceholder}
            onChange={(e) => setDevice({ youtube: e.target.value })}
            spellCheck={false}
          />
        </Field>
        <StatusLine tone={ytTone}>{C.st[yt]}</StatusLine>

        <div className="mt-3">
          <Field label={C.twitch} htmlFor="chat-tw">
            {accountTwitch && (
              <Check
                label={fmt(C.twitchFromWeb, { name: accountTwitch })}
                checked={useWebTwitch}
                onChange={(e) => setDevice({ twitch: e.target.checked ? null : accountTwitch })}
              />
            )}
            {(!useWebTwitch || !accountTwitch) && (
              <Input
                id="chat-tw"
                value={device.twitch ?? ""}
                placeholder={C.twitchPlaceholder}
                onChange={(e) => setDevice({ twitch: e.target.value })}
                spellCheck={false}
              />
            )}
          </Field>
          <StatusLine tone={chat.status.twitch ? "ok" : "muted"}>
            {chat.status.twitch ? fmt(C.st.twitchOn, { name: chat.status.twitch }) : C.st.off}
          </StatusLine>
        </div>
      </Panel>

      <Panel title={C.step2}>
        <Field label={C.obsUrl}>
          <CopyField value={obsUrl("view=chat")} />
        </Field>
        <p className="mt-2 text-sm text-ink-faint">{C.obsHint}</p>
      </Panel>

      <Panel title={C.step3}>
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,22rem)]">
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHAT_PRESETS) as Array<keyof typeof CHAT_PRESETS>).map((k) => (
                <Button key={k} size="sm" variant="ghost" onClick={() => setStyle(CHAT_PRESETS[k])}>
                  {C.presets[k]}
                </Button>
              ))}
            </div>
            <Choice label={C.look} value={s.look} options={Object.fromEntries(CHAT_LOOKS.map((l) => [l, C.looks[l]]))} onChange={(look) => setStyle({ look: look as ChatStyle["look"] })} />
            <Slider label={C.size} value={s.size} min={12} max={48} show={`${s.size}px`} onChange={(size) => setStyle({ size })} />
            <Slider label={C.maxLines} value={s.maxLines} min={1} max={20} show={String(s.maxLines)} onChange={(maxLines) => setStyle({ maxLines })} />
            <div className="flex flex-wrap gap-3">
              {(["text", "name", "bg", "highlight"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="color"
                    value={s.colors[k]}
                    onChange={(e) => setColor(k, e.target.value)}
                    className="h-8 w-10 cursor-pointer border-[3px] border-ink bg-paper"
                  />
                  {C.colors[k]}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => sendTest()}>
                {C.testLine}
              </Button>
              <Button size="sm" onClick={() => sendTest(true)}>
                {C.testPaid}
              </Button>
              <Button size="sm" variant="ghost" onClick={chat.clear} disabled={chat.lines.length === 0}>
                {C.clear}
              </Button>
            </div>
          </div>

          <div className="px-checker relative h-80 overflow-hidden p-3">
            {chat.lines.length === 0 ? (
              <p className="absolute inset-x-3 bottom-3 bg-paper/90 p-2 text-sm">{C.previewEmpty}</p>
            ) : (
              <ChatStage lines={chat.lines} style={s} brandFontUrl={brandFontUrl} className="absolute inset-3 overflow-hidden text-[0.7em]" />
            )}
          </div>
        </div>

        <details className="mt-4 border-t-[3px] border-dashed border-ink/30 pt-3">
          <summary className="cursor-pointer font-display">{C.more}</summary>
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label={C.font} htmlFor="chat-font">
              <FontPicker id="chat-font" value={s.font} onChange={(font) => setStyle({ font })} builtins={["pixel", "display", "body"]} brand={!!brandFontUrl} />
            </Field>
            <Field label={C.enter} htmlFor="chat-enter">
              <Select
                id="chat-enter"
                value={s.enter}
                onChange={(e) => setStyle({ enter: e.target.value as ChatStyle["enter"] })}
              >
                {ALERT_ANIMATIONS.map((a) => (
                  <option key={a} value={a}>
                    {d.design.animations[a]}
                  </option>
                ))}
              </Select>
            </Field>
            <Slider
              label={C.fadeAfter}
              value={s.fadeAfter}
              min={0}
              max={120}
              step={5}
              show={s.fadeAfter === 0 ? C.fadeNever : fmt(C.seconds, { n: s.fadeAfter })}
              onChange={(fadeAfter) => setStyle({ fadeAfter })}
            />
            <Slider label={C.bgAlpha} value={s.colors.bgAlpha} min={0} max={100} step={5} show={`${s.colors.bgAlpha}%`} onChange={(v) => setColor("bgAlpha", v)} />
            <Choice label={C.align} value={s.align} options={{ left: C.alignLeft, right: C.alignRight }} onChange={(align) => setStyle({ align: align as ChatStyle["align"] })} />
            <div className="grid content-start">
              <Check label={C.avatars} checked={s.avatars} onChange={(e) => setStyle({ avatars: e.target.checked })} />
              <Check label={C.badges} checked={s.badges} onChange={(e) => setStyle({ badges: e.target.checked })} />
              <Check label={C.userColors} checked={s.userColors} onChange={(e) => setStyle({ userColors: e.target.checked })} />
              <Check label={C.hideCommands} checked={s.hideCommands} onChange={(e) => setStyle({ hideCommands: e.target.checked })} />
            </div>
            <Field label={C.hideUsers} htmlFor="chat-hide" hint={C.hideUsersHint}>
              <Input
                id="chat-hide"
                defaultValue={s.hideUsers.join(", ")}
                onBlur={(e) => setStyle({ hideUsers: e.target.value.split(",") })}
              />
            </Field>
            <div className="sm:col-span-2">
            <Field label={C.css} htmlFor="chat-css" hint={C.cssHint}>
              <Textarea
                id="chat-css"
                rows={5}
                className="font-mono text-sm"
                defaultValue={s.css.replace(/\\3c /g, "<")}
                onBlur={(e) => setStyle({ css: e.target.value })}
                spellCheck={false}
              />
            </Field>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setDevice({ chatStyle: DEFAULT_CHAT_STYLE })}>
            {C.reset}
          </Button>
        </details>
      </Panel>

      <p className="text-xs text-ink-faint">{C.unofficial}</p>
    </div>
  );
}

function StatusLine({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  return (
    <div className="mt-1">
      <Tag tone={tone}>{children}</Tag>
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: ReactNode;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="px-label">{label}</div>
      <div className="flex flex-wrap gap-1" role="radiogroup">
        {Object.entries(options).map(([k, text]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            onClick={() => onChange(k)}
            className={cx("px-btn px-btn-sm", value === k ? "px-btn-primary" : "px-btn-ghost")}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  show,
  onChange,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  show: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="px-label flex justify-between">
        <span>{label}</span>
        <span className="font-num">{show}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}
