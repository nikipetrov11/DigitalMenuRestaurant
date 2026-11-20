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
