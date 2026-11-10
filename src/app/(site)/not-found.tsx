import Link from "next/link";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { MASCOT } from "@moom/shared/mascot";
import { buttonClass } from "@moom/shared/ui/kit";
import { getT } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/hosts";

export default async function NotFound() {
  const { d } = await getT();
  return (
    <main className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-4 text-center">
      <div>
        <PixelSprite sprite={MASCOT} frame="sleep" size={112} />
        <h1 className="mt-4 text-3xl">{d.notFound.title}</h1>
        <p className="mt-2 text-ink-soft">{d.notFound.body}</p>
        <Link href={siteUrl("/")} className={buttonClass("primary", "md", "mt-6")}>
          {d.notFound.home}
        </Link>
      </div>
    </main>
  );
}
