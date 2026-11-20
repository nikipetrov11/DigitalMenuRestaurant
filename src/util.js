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

// Изрязва бутилка от снимка: маха фона (flood fill от краищата), реже по бутилката и връща прозрачен PNG.
// Ако фонът не може да се отдели, връща цялата снимка без да я приближава.
export async function bottleCutout(file, H = 360) {
  const img = await new Promise((res, rej) => {
    const im = new Image(), url = URL.createObjectURL(file)
    im.onload = () => { URL.revokeObjectURL(url); res(im) }
    im.onerror = rej
    im.src = url
  })
  const s = Math.min(1, 640 / Math.max(img.width, img.height))
  const w = Math.max(2, Math.round(img.width * s)), h = Math.max(2, Math.round(img.height * s))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0, w, h)
  const im = g.getImageData(0, 0, w, h), d = im.data
  const dist = (a, b) => Math.hypot(d[a] - d[b], d[a + 1] - d[b + 1], d[a + 2] - d[b + 2])
  // еталонни цветове на фона: 40 точки по краищата на снимката
  const pts = []
  for (let t = 0; t < 10; t++) {
    const x = Math.round((t / 9) * (w - 1)), y = Math.round((t / 9) * (h - 1))
    pts.push((0 * w + x) * 4, ((h - 1) * w + x) * 4, (y * w + 0) * 4, (y * w + (w - 1)) * 4)
  }
  const TOL = 20
  const near = k => pts.some(r => dist(k, r) < TOL)
  const bg = new Uint8Array(w * h), q = []
  const push = (x, y) => { const i = y * w + x; if (!bg[i] && near(i * 4)) { bg[i] = 1; q.push(i) } }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  // фон е само това, което е близо до цвета на краищата (без „протичане“ през меките ръбове на бутилката)
  while (q.length) {
    const i = q.pop(), x = i % w, y = (i / w) | 0
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const j = ny * w + nx
      if (!bg[j] && near(j * 4)) { bg[j] = 1; q.push(j) }
    }
  }
  // бутилката е изпъкнала по хоризонтала: запълваме всичко между най-лявата и най-дясната точка на реда
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1
    for (let x = 0; x < w; x++) if (!bg[y * w + x]) { if (l < 0) l = x; r = x }
    if (l >= 0 && r - l > 1) for (let x = l; x <= r; x++) bg[y * w + x] = 0
  }
  let minX = w, minY = h, maxX = -1, maxY = -1, left = 0
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) { d[i * 4 + 3] = 0; continue }
    left++
    const x = i % w, y = (i / w) | 0
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const share = left / (w * h)
  if (share < 0.03 || share > 0.9 || maxX < 0) return fileToDataUrl(file, 480, 0.7)
  // изглаждане: пиксели до фона стават полупрозрачни
  const a0 = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) a0[i] = d[i * 4 + 3]
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    if (!a0[i]) continue
    let n = 0
    if (!a0[i - 1]) n++
    if (!a0[i + 1]) n++
    if (!a0[i - w]) n++
    if (!a0[i + w]) n++
    if (n >= 2) d[i * 4 + 3] = 90
    else if (n === 1) d[i * 4 + 3] = 200
  }
  g.putImageData(im, 0, 0)
  const cw = maxX - minX + 1, ch = maxY - minY + 1
  const k = Math.min(1, H / ch)
  const o = document.createElement('canvas')
  o.width = Math.max(1, Math.round(cw * k)); o.height = Math.max(1, Math.round(ch * k))
  o.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, o.width, o.height)
  return o.toDataURL('image/png')
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
