"use client";
import { useEffect, useState, useTransition } from "react";
import { Button, Input } from "@moom/shared/ui/kit";
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

  const per100 = Math.round(rateVal * 100);

  return (
    <div className="grid gap-5">
      <section>
        <div className="px-label">1 · {d.fun.subathonRateTitle}</div>
        <label className="flex flex-wrap items-center gap-2">
          <span>{d.fun.subathonRateA}</span>
          <Input
            type="number"
            min={0}
            step="0.5"
            className="w-24"
            value={rateVal}
            onChange={(e) => setRateVal(Math.max(0, Number(e.target.value) || 0))}
          />
          <span>{d.fun.subathonRateB}</span>
          <Button size="sm" disabled={pending} onClick={() => start(() => subathonControl("add", 0, rateVal))}>
            {d.fun.subathonRateSave}
          </Button>
        </label>
        <p className="mt-1 text-sm text-ink-faint">
          {rateVal > 0 ? fmt(d.fun.subathonExample, { time: formatClock(per100) }) : d.fun.subathonNoAdd}
        </p>
      </section>

      <section>
        <div className="px-label">2 · {d.fun.subathonClockTitle}</div>
        <div className="mb-3 font-num text-4xl">
          {pausedLeft !== null
            ? fmt(d.fun.subathonPaused, { time: formatClock(pausedLeft) })
            : running
              ? fmt(d.fun.subathonLeft, { time: formatClock(left) })
              : d.fun.subathonIdle}
        </div>
        {!running && pausedLeft === null ? (
          <label className="flex flex-wrap items-center gap-2">
            <span>{d.fun.subathonStartA}</span>
            <Input type="number" min={1} className="w-24" value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
            <span>{d.fun.minutes}</span>
            <Button variant="primary" disabled={pending} onClick={() => run("start", minutes)}>
              {d.fun.subathonStartBtn}
            </Button>
          </label>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              className="w-20"
              aria-label={d.fun.subathonAdd}
              value={addMin}
              onChange={(e) => setAddMin(Math.max(1, Number(e.target.value) || 1))}
            />
            <Button disabled={pending} onClick={() => run("add", addMin)}>
              {fmt(d.fun.subathonAddBtn, { n: addMin })}
            </Button>
            {running ? (
              <Button disabled={pending} onClick={() => run("pause")}>
                {d.fun.subathonPause}
              </Button>
            ) : (
              <Button variant="primary" disabled={pending} onClick={() => run("resume")}>
                {d.fun.subathonResume}
              </Button>
            )}
            <Button variant="ghost" disabled={pending} onClick={() => run("stop")}>
              {d.fun.subathonStop}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
