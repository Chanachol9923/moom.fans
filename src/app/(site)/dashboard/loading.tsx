// Shown the moment a dashboard link is pressed, while the server renders the page,
// so navigation never feels like it didn't register.
export default function Loading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-live="polite">
      <div className="px-skeleton h-9 w-56" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="px-skeleton h-16" />
        <div className="px-skeleton h-16" />
        <div className="px-skeleton h-16" />
      </div>
      <div className="px-skeleton h-48" />
      <div className="px-skeleton h-32" />
    </div>
  );
}
