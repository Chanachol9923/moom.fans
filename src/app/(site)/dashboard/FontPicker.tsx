"use client";
import { useT } from "@moom/shared/i18n/react";
import { GOOGLE_FONTS, fontStack, googleFontsHref, type FontChoice } from "@moom/shared/fonts";
import { Select } from "@moom/shared/ui/kit";

const KINDS = ["sans", "display", "hand", "serif", "pixel"] as const;

/**
 * Pick a font: Moom's own, a Google Font, or the streamer's brand font. Shows a sample
 * line in the chosen face (loading it on demand) since <option>s can't show fonts.
 */
export function FontPicker({
  id,
  value,
  onChange,
  builtins,
  brand,
}: {
  id: string;
  value: FontChoice;
  onChange: (v: FontChoice) => void;
  /** "default" for surfaces with a theme font, or Moom's own faces for alerts. */
  builtins: Array<"default" | "pixel" | "display" | "body">;
  /** Whether a brand font has been uploaded. */
  brand: boolean;
}) {
  const { d } = useT();
  const F = d.fonts;
  const href = googleFontsHref([value]);
  return (
    <div>
      {href && <link rel="stylesheet" href={href} precedence="default" />}
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label={F.groupMoom}>
          {builtins.map((b) => (
            <option key={b} value={b}>
              {F.builtin[b]}
            </option>
          ))}
          {brand && <option value="brand">{F.brand}</option>}
        </optgroup>
        {KINDS.map((k) => (
          <optgroup key={k} label={F.kinds[k]}>
            {GOOGLE_FONTS.filter((f) => f.kind === k).map((f) => (
              <option key={f.family} value={`g:${f.family}`}>
                {f.family}
                {f.thai ? "" : ` (${F.latinOnly})`}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <p className="mt-1 truncate bg-field px-2 py-1 text-lg" style={{ fontFamily: fontStack(value, "inherit") }}>
        {F.sample}
      </p>
    </div>
  );
}
