"use client";
import { useState, useTransition } from "react";
import { AnimatedSprite } from "@moom/shared/ui/AnimatedSprite";
import { Button, Field, Input, Panel } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import {
  IMAGE_SPECIES,
  imagePetPath,
  isPresetSpecies,
  MAX_PETS,
  PRESET_SPECIES,
  PRESETS,
  resolveSprite,
  type PetSprite,
  type PresetSpecies,
} from "@moom/shared/pets/sprites";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { MAX_GIF_BYTES } from "@moom/shared/overlay/design";
import { errorText } from "@/lib/errors";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import { pictureToSprite } from "./picture";
import type { PetRow } from "@/lib/supabase/database.types";
import { deletePet, savePet, togglePet } from "../actions";
import { PixelEditor } from "./PixelEditor";

type Pet = PetRow & { resolved: PetSprite | null };

export function PetsManager({ pets, userId, supabase }: { pets: Pet[]; userId: string; supabase: SupabasePublic }) {
  const { d } = useT();
  const [editing, setEditing] = useState<Pet | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      {editing ? (
        <PetForm pet={editing === "new" ? null : editing} onDone={() => setEditing(null)} userId={userId} supabase={supabase} />
      ) : (
        <div>
          <Button variant="primary" disabled={pets.length >= MAX_PETS} onClick={() => setEditing("new")}>
            + {d.pets.add}
          </Button>
        </div>
      )}

      {pets.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((p) => (
            <li key={p.id} className="px-frame flex flex-col items-center bg-paper p-4 text-center">
              <div className="grid h-24 place-items-end">
                {p.resolved ? <AnimatedSprite sprite={p.resolved} size={80} sleeping={!p.is_active} /> : null}
              </div>
              <div className="mt-2 font-display text-lg">{p.name}</div>
              <div className="text-sm text-ink-faint">
                {d.pets.speciesNames[p.species as keyof typeof d.pets.speciesNames] ?? p.species}
                {p.chatter ? ` · @${p.chatter}` : ""}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1">
                <Button size="sm" onClick={() => setEditing(p)}>
                  {d.common.edit}
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => togglePet(p.id, !p.is_active))}>
                  {p.is_active ? "◉" : "○"} {d.pets.active}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-tomato"
                  disabled={pending}
                  onClick={() => start(() => deletePet(p.id))}
                >
                  {d.common.delete}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !editing && (
          <Panel>
            <p className="text-ink-soft">{d.pets.empty}</p>
          </Panel>
        )
      )}
    </>
  );
}

type Mode = "preset" | "draw" | "picture";

function PetForm({ pet, onDone, userId, supabase }: { pet: Pet | null; onDone: () => void; userId: string; supabase: SupabasePublic }) {
  const { d } = useT();
  const pal = (pet?.palette ?? {}) as { body?: string; accent?: string };
  const startMode: Mode = pet?.species === "custom" ? "draw" : pet?.species === IMAGE_SPECIES ? "picture" : "preset";
  const [mode, setMode] = useState<Mode>(startMode);
  const [species, setSpecies] = useState<PresetSpecies>(pet && isPresetSpecies(pet.species) ? pet.species : "bird");
  const [body, setBody] = useState(pal.body ?? "");
  const [accent, setAccent] = useState(pal.accent ?? "");
  const [custom, setCustom] = useState<PetSprite>(
    (pet?.species === "custom" && pet.resolved) || structuredClone(PRESETS.bird),
  );
  const [picture, setPicture] = useState<{ path: string; url: string } | null>(() => {
    const path = pet?.species === IMAGE_SPECIES ? imagePetPath(pet.sprite) : null;
    const url = pet?.resolved?.image;
    return path && url ? { path, url } : null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const preview: PetSprite | null =
    mode === "draw"
      ? custom
      : mode === "picture"
        ? picture && { palette: {}, frames: custom.frames, image: picture.url }
        : resolveSprite(species, { ...(body ? { body } : {}), ...(accent ? { accent } : {}) }, null);

  const upload = async (f: File) => {
    setError(null);
    if (f.size > MAX_GIF_BYTES) return setError(d.common.errTooBig);
    setBusy(true);
    try {
      const path = await uploadPublicMedia(supabase, userId, f, "pets");
      setPicture({ path, url: URL.createObjectURL(f) });
    } catch (err) {
      setError(errorText((err as Error).message, d));
    } finally {
      setBusy(false);
    }
  };

  /** Picture to 16x16 pixels, then on to the drawing board. */
  const importPixels = async (src: Blob | string) => {
    setError(null);
    setBusy(true);
    try {
      const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
      setCustom(await pictureToSprite(blob));
      setMode("draw");
    } catch {
      setError(d.pets.importFailed);
    } finally {
      setBusy(false);
    }
  };

  const modes: Array<[Mode, string, string]> = [
    ["preset", d.pets.modePreset, d.pets.modePresetHint],
    ["draw", d.pets.modeDraw, d.pets.modeDrawHint],
    ["picture", d.pets.modePicture, d.pets.modePictureHint],
  ];

  return (
    <Panel title={pet ? pet.name : d.pets.add} raised>
      <form
        action={(form) =>
          start(async () => {
            setError(null);
            if (mode === "picture" && !picture) return setError(d.pets.needPicture);
            try {
              await savePet(pet?.id ?? null, {
                name: String(form.get("name")),
                species: mode === "draw" ? "custom" : mode === "picture" ? IMAGE_SPECIES : species,
                body: mode === "preset" ? body || undefined : undefined,
                accent: mode === "preset" ? accent || undefined : undefined,
                chatter: String(form.get("chatter") ?? ""),
                sprite: mode === "draw" ? custom : mode === "picture" ? { image: picture!.path } : undefined,
              });
              onDone();
            } catch {
              setError(d.common.error);
            }
          })
        }
        className="grid gap-5 md:grid-cols-[1fr_200px]"
      >
        <div className="min-w-0">
          <Field label={d.pets.name} htmlFor="pet-name">
            <Input id="pet-name" name="name" required maxLength={24} defaultValue={pet?.name} className="max-w-sm" />
          </Field>

          <div className="px-label">{d.pets.how}</div>
          <div className="mb-4 grid gap-2 sm:grid-cols-3" role="radiogroup">
            {modes.map(([m, label, hint]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`px-frame grid gap-0.5 p-3 text-left ${mode === m ? "bg-ink text-paper" : "bg-paper hover:bg-paper-2"}`}
              >
                <span className="font-display">{label}</span>
                <span className={`text-sm ${mode === m ? "text-paper/80" : "text-ink-soft"}`}>{hint}</span>
              </button>
            ))}
          </div>

          {mode === "preset" && (
            <>
              <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label={d.pets.species}>
                {PRESET_SPECIES.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    role="radio"
                    aria-checked={species === sp}
                    onClick={() => setSpecies(sp)}
                    className={`grid justify-items-center gap-1 p-2 ${species === sp ? "bg-ink/10 outline-[3px] outline-ink outline-solid" : "hover:bg-paper-2"}`}
                  >
                    <PixelSprite sprite={PRESETS[sp]} size={48} />
                    <span className="text-sm">{d.pets.speciesNames[sp]}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-5">
                <ColorField label={d.pets.body} value={body || PRESETS[species].palette.b} onChange={setBody} />
                <ColorField label={d.pets.accent} value={accent || PRESETS[species].palette.a} onChange={setAccent} />
              </div>
            </>
          )}

          {mode === "draw" && (
            <>
              <PixelEditor value={custom} onChange={setCustom} />
              <label className="px-btn px-btn-sm mb-4 inline-flex cursor-pointer">
                {busy ? d.common.loading : d.pets.importPicture}
                <input
                  type="file"
                  accept="image/png,image/gif,image/webp,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void importPixels(f);
                  }}
                />
              </label>
            </>
          )}

          {mode === "picture" && (
            <div className="mb-4 grid gap-2">
              <p className="text-sm text-ink-soft">{d.pets.pictureHint}</p>
              <div className="flex flex-wrap gap-2">
                <label className="px-btn px-btn-sm cursor-pointer">
                  {busy ? d.common.uploading : picture ? d.pets.pictureChange : d.pets.pictureUpload}
                  <input
                    type="file"
                    accept="image/png,image/gif,image/webp,image/jpeg"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void upload(f);
                    }}
                  />
                </label>
                {picture && (
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void importPixels(picture.url)}>
                    {d.pets.toPixels}
                  </Button>
                )}
              </div>
            </div>
          )}

          <Field label={d.pets.chatter} hint={d.pets.chatterHint} htmlFor="pet-chatter">
            <Input
              id="pet-chatter"
              name="chatter"
              maxLength={25}
              defaultValue={pet?.chatter ?? ""}
              pattern="[a-zA-Z0-9_]*"
              autoComplete="off"
              className="max-w-sm"
            />
          </Field>
          {error && <p className="mb-2 text-tomato">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending || busy}>
              {pending ? "…" : d.common.save}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              {d.common.cancel}
            </Button>
          </div>
        </div>
        <div className="grid place-items-center self-start bg-paper-2 p-4 md:sticky md:top-4">
          {preview ? <AnimatedSprite sprite={preview} size={128} /> : <p className="text-center text-sm text-ink-faint">{d.pets.needPicture}</p>}
        </div>
      </form>
    </Panel>
  );
}

function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="mb-3 flex items-center gap-2">
      <input type="color" value={value ?? "#888888"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer" />
      <span className="px-label mb-0">{label}</span>
    </label>
  );
}
