const UNITS: [limit: number, seconds: number, label: string][] = [
  [3600, 60, "minute"],
  [86_400, 3600, "hour"],
  [Infinity, 86_400, "day"],
];

/** "19 hours ago", "1 day ago" — how the lists show when something was last done. */
export function timeAgo(date: string | Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const [, size, label] = UNITS.find(([limit]) => seconds < limit)!;
  const count = Math.floor(seconds / size);
  return `${count} ${label}${count === 1 ? "" : "s"} ago`;
}

export function formatDay(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/** "6:30 pm" from a Date, an ISO timestamp, or a bare "18:30" time column. */
export function formatClock(time: string | Date) {
  const at = typeof time === "string" && /^\d{2}:\d{2}/.test(time) ? new Date(`1970-01-01T${time}`) : new Date(time);
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

export function genderLabel(gender: string | null | undefined) {
  return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "—";
}
