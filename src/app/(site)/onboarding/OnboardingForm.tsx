"use client";
import { useActionState, useEffect, useState } from "react";
import { Button, Field, Input, Tag } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import { detectPromptPayType, formatPromptPayId, isValidNationalId, normalizePromptPayId } from "@/lib/promptpay";
import { checkSlug, createCorner, type OnboardingState, type SlugCheck } from "./actions";

/** A link name from a display name, when it has Latin letters to work with. */
function suggestSlug(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

/** The page address around the slug field: "<slug>.moom.fans" or "moom-fans.vercel.app/s/<slug>". */
export function OnboardingForm({ before, after }: { before: string; after: string }) {
  const { d } = useT();
  const O = d.onboarding;
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createCorner, {});
  const [name, setName] = useState(state.values?.displayName ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  // Follow the display name until the streamer types a link name themselves.
  const [slugEdited, setSlugEdited] = useState(!!state.values?.slug);
  const [pp, setPp] = useState(state.values?.promptpay ?? "");
  const e = state.errors ?? {};

  const shownSlug = slugEdited ? slug : suggestSlug(name);
  const check = useSlugCheck(shownSlug);

  const ppId = normalizePromptPayId(pp);
  const ppType = detectPromptPayType(ppId);
  const ppOk = !!ppType && (ppType !== "national_id" || isValidNationalId(ppId));

  return (
    <form action={action}>
      <Field label={O.displayName} htmlFor="displayName" hint={O.displayNameHint} error={e.displayName && d.common.error}>
        <Input
          id="displayName"
          name="displayName"
          required
          maxLength={60}
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          autoComplete="nickname"
        />
      </Field>
      <Field
        label={O.slug}
        htmlFor="slug"
        hint={O.slugHint}
        error={e.slug === "taken" ? O.slugTaken : e.slug ? O.slugInvalid : undefined}
      >
        <div className="flex items-center gap-2">
          {before && <span className="shrink-0 font-display text-ink-soft">{before}</span>}
          <Input
            id="slug"
            name="slug"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9\-]+"
            value={shownSlug}
            onChange={(ev) => {
              setSlugEdited(true);
              setSlug(ev.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {after && <span className="shrink-0 font-display text-ink-soft">{after}</span>}
        </div>
        {shownSlug.length >= 3 && check && (
          <div className="mt-1">
            {check === "checking" ? (
              <Tag tone="muted">{d.common.loading}</Tag>
            ) : check === "ok" ? (
              <Tag tone="ok">✓ {O.slugFree}</Tag>
            ) : (
              <Tag tone="bad">{check === "taken" ? O.slugTaken : O.slugInvalid}</Tag>
            )}
          </div>
        )}
      </Field>
      <Field
        label={O.promptpay}
        htmlFor="promptpay"
        hint={O.promptpayHint}
        error={e.promptpay && O.promptpayInvalid}
      >
        <Input
          id="promptpay"
          name="promptpay"
          required
          inputMode="numeric"
          autoComplete="off"
          value={pp}
          onChange={(ev) => setPp(ev.target.value)}
          placeholder="08x-xxx-xxxx"
        />
        {ppId.length >= 10 && (
          <div className="mt-1">
            {ppOk && ppType ? (
              <Tag tone="ok">
                ✓ {O.ppTypes[ppType]} {formatPromptPayId(ppType, ppId)}
              </Tag>
            ) : (
              <Tag tone="bad">{O.promptpayInvalid}</Tag>
            )}
          </div>
        )}
      </Field>
      <p className="mb-3 text-sm text-ink-faint">{O.promptpayPrivacy}</p>
      {e.form && <p className="mb-3 text-tomato">{d.common.error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? d.common.loading : O.submit}
      </Button>
    </form>
  );
}

/** Asks the server whether a link name is free, once typing pauses. */
function useSlugCheck(slug: string): SlugCheck | "checking" | null {
  const [result, setResult] = useState<{ slug: string; r: SlugCheck } | null>(null);
  useEffect(() => {
    if (slug.length < 3) return;
    let dead = false;
    const t = setTimeout(() => {
      void checkSlug(slug)
        .then((r) => {
          if (!dead && r) setResult({ slug, r });
        })
        .catch(() => {});
    }, 400);
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [slug]);
  if (slug.length < 3) return null;
  return result?.slug === slug ? result.r : "checking";
}
