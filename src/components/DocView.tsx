import type { DocPage } from "@/content/pages";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function DocView({ doc }: { doc: DocPage }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h1 className="mt-6 text-4xl">{doc.title}</h1>
        {doc.intro && <p className={`mt-2 ${doc.draft ? "inline-block bg-beak px-2 py-0.5 font-display text-sm" : "text-ink-soft"}`}>{doc.intro}</p>}
        <div className="mt-8 grid gap-6">
          {doc.sections.map((s) => (
            <section key={s.h} className="px-frame bg-paper p-5">
              <h2 className="text-xl">{s.h}</h2>
              {s.p.length > 1 ? (
                <ul className="mt-2 grid list-none gap-1.5">
                  {s.p.map((line) => (
                    <li key={line} className="flex gap-2 text-ink-soft">
                      <span className="mt-2 size-2 shrink-0 bg-accent" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ink-soft">{s.p[0]}</p>
              )}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
