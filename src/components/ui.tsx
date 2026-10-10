import type { ComponentProps, ReactNode } from "react";

// Tiny set of pixel-styled primitives. Styles live in globals.css (.px-*).

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "default" | "primary" | "beak" | "danger" | "ghost";

export function buttonClass(variant: Variant = "default", size: "md" | "sm" = "md", extra?: string) {
  return cx(
    "px-btn",
    variant === "primary" && "px-btn-primary",
    variant === "beak" && "px-btn-beak",
    variant === "danger" && "px-btn-danger",
    variant === "ghost" && "px-btn-ghost",
    size === "sm" && "px-btn-sm",
    extra,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "md" | "sm" }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function Panel({
  title,
  aside,
  children,
  className,
  raised,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <section className={cx("px-frame", raised && "px-frame-raised", "p-4 sm:p-5", className)}>
      {(title || aside) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg leading-tight">{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="mb-3">
      <label className="px-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-tomato">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-sm text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx("px-input", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx("px-input min-h-20 resize-y", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx("px-input", props.className)} />;
}

export function Check({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="my-2 flex cursor-pointer items-center gap-2">
      <input type="checkbox" {...props} className="size-4 accent-[var(--accent)]" />
      <span>{label}</span>
    </label>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone?: "ok" | "warn" | "bad" | "muted" }) {
  const bg =
    tone === "ok" ? "bg-leaf text-paper" : tone === "warn" ? "bg-beak" : tone === "bad" ? "bg-tomato text-paper" : "";
  return <span className={cx("px-tag", bg)}>{children}</span>;
}

export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="px-frame bg-paper-2 px-3 py-2">
      <div className="px-label">{label}</div>
      <div className="font-num text-2xl">{value}</div>
    </div>
  );
}

export { cx };
