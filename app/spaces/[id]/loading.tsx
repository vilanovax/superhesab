export default function SpaceLoading() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-28 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-36 animate-pulse rounded-[1.25rem] bg-primary/15" />
      <div className="grid h-11 grid-cols-4 gap-1 rounded-2xl bg-muted/70 p-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-card/80" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl bg-card ring-1 ring-border/40"
          />
        ))}
      </div>
    </div>
  );
}
