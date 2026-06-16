export interface SongTheme {
  accent: string
  accentSoft: string
  accentGlow: string
  surface: string
  surfaceStrong: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toRgbString(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

function toRgbaString(r: number, g: number, b: number, a: number) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
}

function brightenChannel(value: number, amount: number) {
  return clamp(value + amount, 0, 255)
}

function darkenChannel(value: number, amount: number) {
  return clamp(value - amount, 0, 255)
}

function buildTheme(r: number, g: number, b: number): SongTheme {
  const boostedR = brightenChannel(r, 20)
  const boostedG = brightenChannel(g, 12)
  const boostedB = brightenChannel(b, 12)

  return {
    accent: toRgbString(boostedR, boostedG, boostedB),
    accentSoft: toRgbaString(boostedR, boostedG, boostedB, 0.16),
    accentGlow: toRgbaString(boostedR, boostedG, boostedB, 0.34),
    surface: toRgbString(
      darkenChannel(boostedR, 150),
      darkenChannel(boostedG, 150),
      darkenChannel(boostedB, 150)
    ),
    surfaceStrong: toRgbString(
      darkenChannel(boostedR, 205),
      darkenChannel(boostedG, 205),
      darkenChannel(boostedB, 205)
    ),
  }
}

function fallbackTheme(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }

  const r = 120 + ((hash >> 0) & 0x3f)
  const g = 40 + ((hash >> 8) & 0x4f)
  const b = 60 + ((hash >> 16) & 0x6f)
  return buildTheme(r, g, b)
}

export async function extractSongTheme(imageUrl: string, seed: string) {
  if (typeof window === 'undefined') return fallbackTheme(seed)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return fallbackTheme(seed)

    const size = 24
    canvas.width = size
    canvas.height = size
    context.drawImage(image, 0, 0, size, size)

    const { data } = context.getImageData(0, 0, size, size)
    let r = 0
    let g = 0
    let b = 0
    let samples = 0

    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3]
      if (alpha < 120) continue

      const pixelR = data[i]
      const pixelG = data[i + 1]
      const pixelB = data[i + 2]
      const brightness = (pixelR + pixelG + pixelB) / 3

      if (brightness < 28) continue

      r += pixelR
      g += pixelG
      b += pixelB
      samples += 1
    }

    if (!samples) return fallbackTheme(seed)

    return buildTheme(r / samples, g / samples, b / samples)
  } catch {
    return fallbackTheme(seed)
  }
}
