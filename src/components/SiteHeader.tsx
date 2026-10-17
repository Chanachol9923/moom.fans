import Link from "next/link";
import { PRESETS } from "@moom/shared/pets/sprites";
import { LocaleSwitch } from "./LocaleSwitch";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <PixelSprite sprite={PRESETS.bird} size={size} />
      <span className="font-display text-2xl leading-none">Moom</span>
    </span>
  );
}

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" aria-label="Moom">
        <Logo />
      </Link>
      <div className="flex items-center gap-3">
        <LocaleSwitch />
        {right}
      </div>
    </header>
  );
}
