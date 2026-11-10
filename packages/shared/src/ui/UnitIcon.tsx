import { mediaKindOf } from "../overlay/design";
import { iconSprite, isIconId } from "../pets/icons";
import { PixelSprite } from "./PixelSprite";

/**
 * A gift unit's picture: the streamer's own image/GIF/WebM when they uploaded one,
 * otherwise the built-in pixel icon. Shared by the tip page and the OBS alert.
 */
export function UnitIcon({ icon, url, size }: { icon: string; url?: string | null; size: number }) {
  if (url) {
    const style = { height: size, width: "auto", maxWidth: size * 2 } as const;
    return mediaKindOf(url) === "video" ? (
      <video className="moom-unit-icon inline-block" style={style} src={url} autoPlay muted loop playsInline />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- shared with the desktop app
      <img className="moom-unit-icon inline-block" style={style} src={url} alt="" />
    );
  }
  return isIconId(icon) ? <PixelSprite sprite={iconSprite(icon)} size={size} /> : null;
}
