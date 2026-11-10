"use client";
import { Button, Field, Input, Panel, Textarea } from "@moom/shared/ui/kit";
import { fmt, type Dict } from "@moom/shared/i18n";
import type { TextBox } from "@/lib/page-config";
import { MAX_TEXTS } from "@/lib/page-grid";
import { Choice } from "../alerts/LookEditor";

/**
 * The streamer's own text boxes. Each one becomes a box on the page that can be dragged,
 * stretched and hidden with "Arrange boxes", like the built-in ones.
 */
export function TextsPanel({
  d,
  texts,
  onAdd,
  onChange,
  onRemove,
}: {
  d: Dict;
  texts: TextBox[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<TextBox>) => void;
  onRemove: (id: string) => void;
}) {
  const P = d.page;
  return (
    <Panel title={fmt(P.textsTitle, { n: texts.length, max: MAX_TEXTS })}>
      <p className="mb-3 text-sm text-ink-soft">{P.textsHint}</p>
      <div className="grid gap-3">
        {texts.map((t, i) => (
          <details key={t.id} open={!t.title && !t.body} className="bg-paper-2 p-2">
            <summary className="flex cursor-pointer items-center gap-2 font-display">
              <span className="min-w-0 flex-1 truncate">{t.title.trim() || fmt(P.textBoxN, { n: i + 1 })}</span>
            </summary>
            <div className="mt-2 grid gap-1">
              <Field label={P.textTitle} htmlFor={`${t.id}-title`}>
                <Input id={`${t.id}-title`} value={t.title} maxLength={80} placeholder={P.textTitlePh} onChange={(e) => onChange(t.id, { title: e.target.value })} />
              </Field>
              <Field label={P.textBody} hint={P.textBodyHint} htmlFor={`${t.id}-body`}>
                <Textarea id={`${t.id}-body`} value={t.body} maxLength={3000} rows={4} placeholder={P.textBodyPh} onChange={(e) => onChange(t.id, { body: e.target.value })} />
              </Field>
              <Choice label={P.textLook} value={t.look} options={P.textLooks} onChange={(look) => onChange(t.id, { look })} />
              <Choice label={P.textSize} value={t.size} options={P.textSizes} onChange={(size) => onChange(t.id, { size })} />
              <Choice label={P.textAlign} value={t.align} options={P.textAligns} onChange={(align) => onChange(t.id, { align })} />
              <div>
                <Button type="button" size="sm" variant="danger" onClick={() => onRemove(t.id)}>
                  {P.textRemove}
                </Button>
              </div>
            </div>
          </details>
        ))}
      </div>
      {texts.length < MAX_TEXTS ? (
        <Button type="button" size="sm" className="mt-3" onClick={onAdd}>
          + {P.textAdd}
        </Button>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">{fmt(P.textsFull, { max: MAX_TEXTS })}</p>
      )}
    </Panel>
  );
}
