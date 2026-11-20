// Смалява снимка в браузъра и я връща като текст (data URL), за да се пази във Firestore без Storage.
export function fileToDataUrl(file, max = 800, quality = 0.72, type = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL(type, quality))
    }
    img.onerror = reject
    img.src = url
  })
}

// Винена карта: цвят и вкус (сладост) на виното
export const WINE_COLORS = [['red', 'Червено'], ['white', 'Бяло'], ['rose', 'Розе'], ['sparkling', 'Пенливо'], ['orange', 'Оранжево']]
export const WINE_TASTES = [['dry', 'Сухо'], ['semi-dry', 'Полусухо'], ['semi-sweet', 'Полусладко'], ['sweet', 'Сладко']]
// Винени области върху картата (x/y са в % от картинката)
export const WINE_AREAS = [
  { id: 'nw', name: 'Северозападна България', x: 16.4, y: 25.3, side: 'r' },
  { id: 'dunav', name: 'Централна Дунавска равнина', x: 41.6, y: 33.4, side: 'r' },
  { id: 'sever', name: 'Северно Черноморие', x: 80.5, y: 21.5, side: 'r' },
  { id: 'yuzh', name: 'Южно Черноморие', x: 79.0, y: 50.0, side: 'r' },
  { id: 'sakar', name: 'Сакар и Източни Родопи', x: 60.0, y: 86.0, side: 'r' },
  { id: 'iztrak', name: 'Източна Тракийска низина', x: 63.0, y: 56.0, side: 'r' },
  { id: 'zaptrak', name: 'Западна Тракийска низина', x: 35.0, y: 65.9, side: 'r' },
  { id: 'roza', name: 'Розова долина', x: 46.3, y: 53.5, side: 'r' },
  { id: 'struma', name: 'Долината на река Струма', x: 16.1, y: 87.0, side: 'r' },
]
// Заведение само с напитки (по подразбиране Casa Noma), освен ако не е зададено ръчно
export const isDrinksOnly = r => r?.drinksOnly ?? /casa\s*noma/i.test(r?.name || '')
const low = s => (s || '').trim().toLowerCase()
// категория „Вино“ или подкатегория на „Вино“
export const isWineCat = (name, parent) => low(name).startsWith('вин') || low(parent).startsWith('вин')
// „Алкохол“ или подкатегория на „Алкохол“
export const isAlcCat = (name, parent) => low(name) === 'алкохол' || low(parent) === 'алкохол'

const BG = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' }

// "Рафи Бар" или "Raffi Bar" -> "rafi-bar" (главни букви и кирилица са позволени при писане)
export const slugify = s =>
  s.toLowerCase().split('').map(c => BG[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)

// Casa Noma: Instagram и скрит бутон „Информация“ по подразбиране, освен ако не е зададено ръчно
export const CASA_IG = 'https://www.instagram.com/casa_noma_osteria/'
export const isCasa = r => /casa\s*noma/i.test(r?.name || '')
