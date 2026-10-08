function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

/** PKR amounts get abbreviated — a raw 8450000 is unreadable in a stat tile or a board card. */
export function formatMoney(value: number) {
  if (value >= 1_000_000) return `PKR ${trimDecimal(value / 1_000_000)} M`;
  if (value >= 1_000) return `PKR ${trimDecimal(value / 1_000)} K`;
  return `PKR ${value.toLocaleString()}`;
}

/** The bare figure in millions, for chart labels that already say "PKR million". */
export function formatMillions(value: number) {
  return trimDecimal(value / 1_000_000);
}
