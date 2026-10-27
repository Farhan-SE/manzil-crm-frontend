function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

/** PKR amounts get abbreviated — a raw 8450000 is unreadable in a stat tile or a board card. */
export function formatMoney(value: number) {
  if (value >= 1_000_000) return `PKR ${trimDecimal(value / 1_000_000)} M`;
  if (value >= 1_000) return `PKR ${trimDecimal(value / 1_000)} K`;
  return `PKR ${value.toLocaleString()}`;
}

/** Lakh/crore, the way the chatbot quotes prices to clients: 18500000 → "PKR 1.85 crore", 75000 → "PKR 75,000". */
export function formatLakhCrore(value: number) {
  const trim = (n: number) => String(+n.toFixed(2));
  if (value >= 10_000_000) return `PKR ${trim(value / 10_000_000)} crore`;
  if (value >= 100_000) return `PKR ${trim(value / 100_000)} lakh`;
  return `PKR ${value.toLocaleString("en-US")}`;
}

/** The bare figure in millions, for chart labels that already say "PKR million". */
export function formatMillions(value: number) {
  return trimDecimal(value / 1_000_000);
}
