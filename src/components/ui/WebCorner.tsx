/** Quarter spider-web ornament for card corners (pure SVG, scales crisply). */
export function WebCorner({ className = '', flip = '' }: { className?: string; flip?: string }) {
  const spokes = [0, 15, 30, 45, 60, 75, 90]
  const rings = [18, 34, 52, 72, 94]
  const toXY = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180
    return [Math.cos(a) * r, Math.sin(a) * r] as const
  }
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ transform: flip }} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
        {spokes.map((d) => {
          const [x, y] = toXY(d, 100)
          return <line key={d} x1="0" y1="0" x2={x} y2={y} />
        })}
        {rings.map((r) =>
          spokes.slice(0, -1).map((d, i) => {
            const [x0, y0] = toXY(d, r)
            const [x1, y1] = toXY(spokes[i + 1], r)
            const [cx, cy] = toXY((d + spokes[i + 1]) / 2, r * 0.86)
            return <path key={`${r}-${d}`} d={`M${x0},${y0} Q${cx},${cy} ${x1},${y1}`} />
          }),
        )}
      </g>
    </svg>
  )
}
