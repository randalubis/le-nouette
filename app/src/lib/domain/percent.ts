/** Largest-remainder rounding: whole percents of `parts` over their sum, guaranteed to total 100 (all 0 when the sum is 0). */
export function percentShares(parts: number[]): number[] {
  const total = parts.reduce((a, b) => a + b, 0);
  if (total <= 0) return parts.map(() => 0);
  const raw = parts.map((p) => (p / total) * 100);
  const out = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < 100 - out.reduce((a, b) => a + b, 0); k++) out[order[k][1]]++;
  return out;
}
