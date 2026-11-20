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
