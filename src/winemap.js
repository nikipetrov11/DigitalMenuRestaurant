import mapImg from './vino-karta.webp'
import fonImg from './vino-fon.webp'
import { WINE_AREAS, isDrinksOnly } from './util'

export const DEFAULT_MAP = mapImg
export const DEFAULT_BG = fonImg
export const DEFAULT_RATIO = 903 / 604

// Настройки на картата с винените области: от заведението, а ако липсват – стандартните
export function resolveMap(rest) {
  const w = rest?.wineMap || {}
  return {
    on: w.on ?? isDrinksOnly(rest),
    areas: Array.isArray(w.areas) ? w.areas : WINE_AREAS,
    image: w.image || mapImg,
    ratio: w.image && w.ratio ? w.ratio : DEFAULT_RATIO,
    bg: w.bg || fonImg,
    bottle: w.bottle || '',
    names: w.names ?? true,
    size: Number(w.size) > 0 ? Number(w.size) : 1,
  }
}

// Къде да стои надписът на областта, за да не излиза извън картата
export function labelClass(a) {
  let s = a.side || 'b'
  if (s === 'r' && a.x > 82) s = 'l'
  else if (s === 'l' && a.x < 18) s = 'r'
  if (s === 'b' && a.y > 86) s = 't'
  else if (s === 't' && a.y < 14) s = 'b'
  const edge = (s === 'b' || s === 't') ? (a.x < 13 ? ' el' : a.x > 87 ? ' er' : '') : ''
  return s + edge
}

// ---pick-start
// Докосване по област: взима цвета на картата под пръста и намира бутилката на същата област
const pxCache = new Map()
function loadPixels(src) {
  if (!pxCache.has(src)) {
    pxCache.set(src, new Promise(res => {
      const im = new Image()
      im.onload = () => {
        try {
          const s = Math.min(1, 300 / Math.max(im.width, im.height))
          const c = document.createElement('canvas')
          c.width = Math.max(1, Math.round(im.width * s))
          c.height = Math.max(1, Math.round(im.height * s))
          const g = c.getContext('2d', { willReadFrequently: true })
          g.drawImage(im, 0, 0, c.width, c.height)
          res({ w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data })
        } catch { res(null) }
      }
      im.onerror = () => res(null)
      im.src = src
    }))
  }
  return pxCache.get(src)
}
const colorAt = (p, x, y) => {
  const ix = Math.min(p.w - 1, Math.max(0, Math.round((x / 100) * (p.w - 1))))
  const iy = Math.min(p.h - 1, Math.max(0, Math.round((y / 100) * (p.h - 1))))
  const k = (iy * p.w + ix) * 4
  return [p.d[k], p.d[k + 1], p.d[k + 2], p.d[k + 3]]
}
// x и y са в % от картинката; връща id на областта или null
export async function pickArea(src, areas, x, y) {
  const nearest = () => {
    let id = null, bd = 18
    areas.forEach(a => { const g = Math.hypot(a.x - x, a.y - y); if (g < bd) { bd = g; id = a.id } })
    return id
  }
  const p = await loadPixels(src)
  if (!p) return nearest()
  if (colorAt(p, x, y)[3] < 128) return null
  const refs = areas.map(a => ({ id: a.id, c: colorAt(p, a.x, a.y), a })).filter(r => r.c[3] >= 128)
  // гласуват 9 точки около пръста, за да не решава случайно тъмна линия между областите
  const votes = new Map()
  for (const dy of [-1.2, 0, 1.2]) for (const dx of [-1.2, 0, 1.2]) {
    const t = colorAt(p, x + dx, y + dy)
    if (t[3] < 128) continue
    let id = null, bd = 60
    refs.forEach(r => { const d = Math.hypot(t[0] - r.c[0], t[1] - r.c[1], t[2] - r.c[2]); if (d < bd) { bd = d; id = r.id } })
    if (id) votes.set(id, (votes.get(id) || 0) + 1)
  }
  let id = null, top = 0
  votes.forEach((n, k) => { if (n > top) { top = n; id = k } })
  return id || nearest()
}
// ---pick-end
