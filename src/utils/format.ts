export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatPlayCount(count?: number) {
  if (!count) return ''
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M plays`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K plays`
  return `${count} plays`
}
