import { useEffect, useState } from "react";
import { useT } from "@moom/shared/i18n/react";
import { Button, Input, Panel } from "@moom/shared/ui/kit";
import { isTauri, onDeepLink } from "./platform";
import { finishSignIn, hasPendingSignIn, parseAuthLink, startSignIn } from "./session";

export function SignIn() {
  const { d } = useT();
  const [waiting, setWaiting] = useState(hasPendingSignIn);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState("");

  const finish = async (c: string, state?: string) => {
    setBusy(true);
    setFailed(false);
    const ok = await finishSignIn(c, state);
    // On success the auth listener in App swaps this screen out.
    if (!ok) {
      setFailed(true);
      setBusy(false);
    }
  };

  useEffect(
    () =>
      onDeepLink((url) => {
        const link = parseAuthLink(url);
        if (link) void finish(link.code, link.state);
      }),
    [],
  );

  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-center gap-4 px-4 py-8">
      <Panel title={d.desktop.signInTitle} raised>
        <p className="text-ink-soft">{d.desktop.signInBody}</p>
        <Button
          variant="primary"
          className="mt-4 w-full"
          disabled={busy}
          onClick={async () => {
            setFailed(false);
            await startSignIn();
            setWaiting(true);
          }}
        >
          {d.desktop.signInButton}
        </Button>
        {waiting && !failed && <p className="mt-3 animate-pulse text-sm text-ink-soft">{d.desktop.waiting}</p>}
        {failed && <p className="mt-3 text-sm text-tomato">{d.desktop.signInFailed}</p>}

        {waiting && (
          <form
            className="mt-5 border-t-[3px] border-dashed border-paper-3 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) void finish(code);
            }}
          >
            <label className="px-label" htmlFor="code">
              {d.desktop.pasteCode}
            </label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={d.desktop.codePlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
              <Button type="submit" disabled={busy || !code.trim()}>
                {d.desktop.submitCode}
              </Button>
            </div>
          </form>
        )}
      </Panel>
      {!isTauri && <p className="text-center text-xs text-ink-faint">{d.desktop.browserMode}</p>}
    </main>
  );
}
