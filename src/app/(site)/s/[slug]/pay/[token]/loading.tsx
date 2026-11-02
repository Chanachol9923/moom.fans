// The supporter just pressed pay: show the shape of the QR page straight away.
export default function Loading() {
  return (
    <main className="mx-auto grid w-full max-w-md gap-4 px-4 py-8" aria-busy="true">
      <div className="px-skeleton h-8 w-40" />
      <div className="px-skeleton h-20" />
      <div className="px-skeleton aspect-square w-full" />
      <div className="px-skeleton h-12" />
    </main>
  );
}
