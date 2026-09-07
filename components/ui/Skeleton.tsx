export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-dash-border/70 ${className}`} />;
}
