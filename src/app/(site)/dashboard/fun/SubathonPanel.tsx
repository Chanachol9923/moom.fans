"use client";
import { useEffect, useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { formatClock } from "@moom/shared/widgets";
import { subathonControl } from "../more-actions";

export function SubathonPanel({ rate, endsAt, pausedLeft }: { rate: number; endsAt: string | null; pausedLeft: number | null }) {
  const { d } = useT();
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(60);
  const [addMin, setAddMin] = useState(10);
  const [rateVal, setRateVal] = useState(rate);
  const [pending, start] = useTransition();
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = endsAt ? Math.max(0, (new Date(endsAt).getTime() - now) / 1000) : 0;
  const running = Boolean(endsAt) && left > 0;
  const run = (a: Parameters<typeof subathonControl>[0], m = 0) => start(() => subathonControl(a, m, rateVal));

  return (
    <div>
      <div className="mb-3 font-num text-4xl">
        {pausedLeft !== null
          ? fmt(d.fun.subathonPaused, { time: formatClock(pausedLeft) })
          : running
            ? fmt(d.fun.subathonLeft, { time: formatClock(left) })
            : d.fun.subathonIdle}
      </div>
      <Field label={d.fun.subathonRate}>
        <Input type="number" min={0} step="0.5" className="max-w-40" value={rateVal} onChange={(e) => setRateVal(Math.max(0, Number(e.target.value) || 0))} />
      </Field>
      <div className="flex flex-wrap items-end gap-2">
        {!running && pausedLeft === null && (
          <>
            <Field label={d.fun.subathonStart}>
              <Input type="number" min={1} className="w-28" value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
            <Button variant="primary" disabled={pending} onClick={() => run("start", minutes)} className="mb-3">
              ▶
            </Button>
          </>
        )}
        {(running || pausedLeft !== null) && (
          <>
            <Field label={d.fun.subathonAdd}>
              <Input type="number" min={1} className="w-28" value={addMin} onChange={(e) => setAddMin(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
            <Button disabled={pending} onClick={() => run("add", addMin)} className="mb-3">
              +
            </Button>
            {running ? (
              <Button disabled={pending} onClick={() => run("pause")} className="mb-3">
                {d.fun.subathonPause}
              </Button>
            ) : (
              <Button disabled={pending} onClick={() => run("resume")} className="mb-3">
                {d.fun.subathonResume}
              </Button>
            )}
            <Button variant="ghost" disabled={pending} onClick={() => run("stop")} className="mb-3">
              {d.fun.subathonStop}
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => subathonControl("add", 0, rateVal))} className="mb-3">
          {d.common.save}
        </Button>
      </div>
    </div>
  );
}
