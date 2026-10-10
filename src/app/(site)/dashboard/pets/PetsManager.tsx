"use client";
import { useState, useTransition } from "react";
import { AnimatedSprite } from "@/components/AnimatedSprite";
import { Button, Field, Input, Panel, Select } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { MAX_PETS, PRESET_SPECIES, PRESETS, resolveSprite, type PetSprite } from "@/lib/pets/sprites";
import type { PetRow } from "@/lib/supabase/database.types";
import { deletePet, savePet, togglePet } from "../actions";
import { PixelEditor } from "./PixelEditor";

type Pet = PetRow & { resolved: PetSprite | null };

export function PetsManager({ pets }: { pets: Pet[] }) {
  const { d } = useT();
  const [editing, setEditing] = useState<Pet | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      {editing ? (
        <PetForm pet={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
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

function PetForm({ pet, onDone }: { pet: Pet | null; onDone: () => void }) {
  const { d } = useT();
  const pal = (pet?.palette ?? {}) as { body?: string; accent?: string };
  const [species, setSpecies] = useState(pet?.species ?? "bird");
  const [body, setBody] = useState(pal.body ?? "");
  const [accent, setAccent] = useState(pal.accent ?? "");
  const [custom, setCustom] = useState<PetSprite>(
    (pet?.species === "custom" && pet.resolved) || structuredClone(PRESETS.bird),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const preview =
    species === "custom"
      ? custom
      : resolveSprite(species, { ...(body ? { body } : {}), ...(accent ? { accent } : {}) }, null);

  return (
    <Panel title={pet ? pet.name : d.pets.add} raised>
      <form
        action={(form) =>
          start(async () => {
            setError(null);
            try {
              await savePet(pet?.id ?? null, {
                name: String(form.get("name")),
                species,
                body: body || undefined,
                accent: accent || undefined,
                chatter: String(form.get("chatter") ?? ""),
                sprite: species === "custom" ? custom : undefined,
              });
              onDone();
            } catch {
              setError(d.common.error);
            }
          })
        }
        className="grid gap-5 md:grid-cols-[1fr_200px]"
      >
        <div>
          <div className="grid gap-x-5 sm:grid-cols-2">
            <Field label={d.pets.name} htmlFor="pet-name">
              <Input id="pet-name" name="name" required maxLength={24} defaultValue={pet?.name} />
            </Field>
            <Field label={d.pets.species} htmlFor="pet-species">
              <Select id="pet-species" value={species} onChange={(e) => setSpecies(e.target.value)}>
                {[...PRESET_SPECIES, "custom"].map((s) => (
                  <option key={s} value={s}>
                    {d.pets.speciesNames[s as keyof typeof d.pets.speciesNames]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {species !== "custom" && (
            <div className="flex flex-wrap gap-5">
              <ColorField label={d.pets.body} value={body || PRESETS[species as keyof typeof PRESETS]?.palette.b} onChange={setBody} />
              <ColorField label={d.pets.accent} value={accent || PRESETS[species as keyof typeof PRESETS]?.palette.a} onChange={setAccent} />
            </div>
          )}

          {species === "custom" && <PixelEditor value={custom} onChange={setCustom} />}

          <Field label={d.pets.chatter} hint={d.pets.chatterHint} htmlFor="pet-chatter">
            <Input
              id="pet-chatter"
              name="chatter"
              maxLength={25}
              defaultValue={pet?.chatter ?? ""}
              pattern="[a-zA-Z0-9_]*"
              autoComplete="off"
            />
          </Field>
          {error && <p className="mb-2 text-tomato">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "…" : d.common.save}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              {d.common.cancel}
            </Button>
          </div>
        </div>
        <div className="grid place-items-center bg-paper-2 p-4">
          {preview && <AnimatedSprite sprite={preview} size={128} />}
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
