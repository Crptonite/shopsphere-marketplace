/** Minimal line chart (SVG) for the sample index history. */
export default function SparkLine({ values, height = 140 }: { values: number[]; height?: number }) {
  const w = 600;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - ((v - min) / span) * (height - 12) - 6}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label="Sample index trend" preserveAspectRatio="none">
    <polyline fill="none" stroke="var(--green, #2f7d4f)" strokeWidth="2.5" points={points} />
  </svg>;
}
