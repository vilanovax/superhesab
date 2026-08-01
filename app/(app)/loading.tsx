export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-5">
      <div className="h-28 animate-pulse rounded-[1.25rem] bg-primary/15" />
      <div className="flex gap-2">
        <div className="h-11 flex-1 animate-pulse rounded-2xl bg-muted/80" />
        <div className="h-11 flex-1 animate-pulse rounded-2xl bg-muted/80" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-2xl bg-card ring-1 ring-border/40"
          />
        ))}
      </div>
    </div>
  );
}
