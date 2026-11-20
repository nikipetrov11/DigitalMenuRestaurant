import { useState, useCallback } from 'react'

export const LANGS = ['bg', 'en', 'de']
const KEY = 'menuLang'

// Език: ?lang=de в адреса -> запомнен избор -> език на телефона -> български
function initialLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang')
    if (LANGS.includes(q)) return q
    const s = localStorage.getItem(KEY)
    if (LANGS.includes(s)) return s
  } catch {}
  const n = (navigator.language || 'bg').slice(0, 2).toLowerCase()
  return LANGS.includes(n) ? n : 'bg'
}

export function useLang() {
  const [lang, setL] = useState(initialLang)
  const setLang = useCallback(l => {
    setL(l)
    try { localStorage.setItem(KEY, l) } catch {}
    document.documentElement.lang = l
  }, [])
  return [lang, setLang]
}

// Текстове на интерфейса
const UI = {
  bg: {
    loading: 'Зареждане…', notFound: 'Не намираме това заведение', notFoundHint: 'Провери адреса или QR кода.',
    info: 'Информация', hours: 'Работно време', address: 'Адрес', phone: 'Телефон',
    follow: 'Последвайте ни', rate: 'Оценете преживяването си',
    showPass: 'Покажи паролата', hidePass: 'Скрий паролата',
    open: 'Отворено', closed: 'Затворено', until: 'до', opensAt: 'отваря в',
    openUntil: t => `Отворено до ${t}`, closedOpens: t => `Затворено · отваря в ${t}`,
    recommend: 'Препоръчваме', menus: 'Менюта', categories: 'Категории', subcategories: 'Подкатегории',
    menu: 'Меню', others: 'Други', empty: 'Менюто още е празно.', soldOut: 'изчерпано',
    prev: 'Назад', next: 'Напред', close: 'Затвори', language: 'Език',
    product: n => (n === 1 ? 'продукт' : 'продукта'), wine: n => (n === 1 ? 'вино' : 'вина'),
    ml: 'мл', glass: 'Чаша', bottle: 'Бутилка',
    mapAlt: 'Карта на винените райони на България', mapHint: 'Натисни бутилка от картата, за да видиш вината',
    allWines: 'Всички вина и подреждане', sort: 'Подреди', type: 'Вид', price: 'Цена', all: 'Всички', byGlass: 'На чаша',
    sTaste: 'По вкус', sName: 'По име', sPrice: 'По цена', sColor: 'По вид',
  },
  en: {
    loading: 'Loading…', notFound: 'We can’t find this venue', notFoundHint: 'Check the address or the QR code.',
    info: 'Information', hours: 'Opening hours', address: 'Address', phone: 'Phone',
    follow: 'Follow us', rate: 'Rate your experience',
    showPass: 'Show password', hidePass: 'Hide password',
    open: 'Open', closed: 'Closed', until: 'until', opensAt: 'opens at',
    openUntil: t => `Open until ${t}`, closedOpens: t => `Closed · opens at ${t}`,
    recommend: 'Our recommendations', menus: 'Menus', categories: 'Categories', subcategories: 'Subcategories',
    menu: 'Menu', others: 'Other', empty: 'The menu is still empty.', soldOut: 'sold out',
    prev: 'Previous', next: 'Next', close: 'Close', language: 'Language',
    product: n => (n === 1 ? 'item' : 'items'), wine: n => (n === 1 ? 'wine' : 'wines'),
    ml: 'ml', glass: 'Glass', bottle: 'Bottle',
    mapAlt: 'Map of the wine regions of Bulgaria', mapHint: 'Tap a bottle on the map to see the wines',
    allWines: 'All wines and sorting', sort: 'Sort', type: 'Type', price: 'Price', all: 'All', byGlass: 'By the glass',
    sTaste: 'By taste', sName: 'By name', sPrice: 'By price', sColor: 'By type',
  },
  de: {
    loading: 'Wird geladen…', notFound: 'Dieses Lokal wurde nicht gefunden', notFoundHint: 'Prüfe die Adresse oder den QR-Code.',
    info: 'Informationen', hours: 'Öffnungszeiten', address: 'Adresse', phone: 'Telefon',
    follow: 'Folge uns', rate: 'Bewerte dein Erlebnis',
    showPass: 'Passwort anzeigen', hidePass: 'Passwort verbergen',
    open: 'Geöffnet', closed: 'Geschlossen', until: 'bis', opensAt: 'öffnet um',
    openUntil: t => `Geöffnet bis ${t}`, closedOpens: t => `Geschlossen · öffnet um ${t}`,
    recommend: 'Unsere Empfehlungen', menus: 'Karten', categories: 'Kategorien', subcategories: 'Unterkategorien',
    menu: 'Speisekarte', others: 'Weitere', empty: 'Die Karte ist noch leer.', soldOut: 'ausverkauft',
    prev: 'Zurück', next: 'Weiter', close: 'Schließen', language: 'Sprache',
    product: n => (n === 1 ? 'Artikel' : 'Artikel'), wine: n => (n === 1 ? 'Wein' : 'Weine'),
    ml: 'ml', glass: 'Glas', bottle: 'Flasche',
    mapAlt: 'Karte der Weinregionen Bulgariens', mapHint: 'Tippe auf eine Flasche auf der Karte, um die Weine zu sehen',
    allWines: 'Alle Weine und Sortierung', sort: 'Sortieren', type: 'Art', price: 'Preis', all: 'Alle', byGlass: 'Glasweise',
    sTaste: 'Nach Geschmack', sName: 'Nach Name', sPrice: 'Nach Preis', sColor: 'Nach Art',
  },
}
export const ui = lang => UI[lang] || UI.bg

// Вино: етикети по код (кодовете са в базата, затова се превеждат без админ панела)
export const WINE = {
  colors: {
    bg: { red: 'Червено', white: 'Бяло', rose: 'Розе', sparkling: 'Пенливо', orange: 'Оранжево' },
    en: { red: 'Red', white: 'White', rose: 'Rosé', sparkling: 'Sparkling', orange: 'Orange' },
    de: { red: 'Rot', white: 'Weiß', rose: 'Rosé', sparkling: 'Schaumwein', orange: 'Orange' },
  },
  tastes: {
    bg: { dry: 'Сухо', 'semi-dry': 'Полусухо', 'semi-sweet': 'Полусладко', sweet: 'Сладко' },
    en: { dry: 'Dry', 'semi-dry': 'Off-dry', 'semi-sweet': 'Medium-sweet', sweet: 'Sweet' },
    de: { dry: 'Trocken', 'semi-dry': 'Halbtrocken', 'semi-sweet': 'Lieblich', sweet: 'Süß' },
  },
  areas: {
    en: {
      nw: 'Northwestern Bulgaria', dunav: 'Central Danube Plain', sever: 'Northern Black Sea Coast',
      yuzh: 'Southern Black Sea Coast', sakar: 'Sakar and Eastern Rhodopes', iztrak: 'Eastern Thracian Lowland',
      zaptrak: 'Western Thracian Lowland', roza: 'Rose Valley', struma: 'Struma River Valley',
    },
    de: {
      nw: 'Nordwestbulgarien', dunav: 'Zentrale Donauebene', sever: 'Nördliche Schwarzmeerküste',
      yuzh: 'Südliche Schwarzmeerküste', sakar: 'Sakar und Ostrhodopen', iztrak: 'Ostthrakische Tiefebene',
      zaptrak: 'Westthrakische Tiefebene', roza: 'Rosental', struma: 'Struma-Tal',
    },
  },
}

// Съдържание (имена на категории, ястия, описания): по български текст -> превод.
// Попълва се ръчно тук; ако липсва превод, се показва оригиналът.
// Пример: 'Салати': { en: 'Salads', de: 'Salate' }
export const CONTENT = {
  'Добре дошли': { en: 'Welcome', de: 'Willkommen' },
  'Меню': { en: 'Menu', de: 'Speisekarte' },
  'Вино': { en: 'Wine', de: 'Wein' },
  'Алкохол': { en: 'Spirits', de: 'Spirituosen' },
  'Салати': { en: 'Salads', de: 'Salate' },
  'Супи': { en: 'Soups', de: 'Suppen' },
  'Предястия': { en: 'Starters', de: 'Vorspeisen' },
  'Основни': { en: 'Main courses', de: 'Hauptgerichte' },
  'Десерти': { en: 'Desserts', de: 'Desserts' },
  'Напитки': { en: 'Drinks', de: 'Getränke' },
  'Безалкохолни': { en: 'Soft drinks', de: 'Alkoholfreie Getränke' },
  'Бира': { en: 'Beer', de: 'Bier' },
  'Кафе': { en: 'Coffee', de: 'Kaffee' },
  'Коктейли': { en: 'Cocktails', de: 'Cocktails' },
}

// Кирилица -> латиница (опростена българска транслитерация)
const LAT = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' }
export const translit = s =>
  (s || '').replace(/[А-Яа-я]/g, c => {
    const l = LAT[c.toLowerCase()]
    return c === c.toLowerCase() ? l : l[0].toUpperCase() + l.slice(1)
  })

// Известни сортове и имена на изби: българският текст -> общоприетото име (не се транслитерира).
// Различните изписвания на едно и също име са отделни редове. Работи за всички текстове.
const NAMES = {
  'Каберне Совиньон': 'Cabernet Sauvignon', 'Каберне Сувиньон': 'Cabernet Sauvignon', 'Каберне Сьовиньон': 'Cabernet Sauvignon',
  'Каберне Фран': 'Cabernet Franc', 'Каберне': 'Cabernet',
  'Совиньон Блан': 'Sauvignon Blanc', 'Сувиньон Блан': 'Sauvignon Blanc', 'Совиньон': 'Sauvignon', 'Сувиньон': 'Sauvignon',
  'Мерло': 'Merlot', 'Шардоне': 'Chardonnay', 'Пино Ноар': 'Pinot Noir', 'Пино Гри': 'Pinot Gris', 'Пино Гриджо': 'Pinot Grigio',
  'Пино Блан': 'Pinot Blanc', 'Пино': 'Pinot', 'Сира': 'Syrah', 'Шираз': 'Shiraz', 'Малбек': 'Malbec', 'Гренаш': 'Grenache',
  'Темпранийо': 'Tempranillo', 'Санджовезе': 'Sangiovese', 'Небиоло': 'Nebbiolo', 'Зинфандел': 'Zinfandel', 'Вионие': 'Viognier',
  'Пти Вердо': 'Petit Verdot', 'Алиготе': 'Aligoté', 'Рислинг': 'Riesling', 'Ризлинг': 'Riesling', 'Рейнски Ризлинг': 'Rhine Riesling',
  'Траминер': 'Traminer', 'Гевюрцтраминер': 'Gewürztraminer', 'Мускат Отонел': 'Muscat Ottonel', 'Мускат': 'Muscat',
  'Семийон': 'Sémillon', 'Семилон': 'Sémillon', 'Коломбар': 'Colombard', 'Колумбар': 'Colombard', 'Уни Блан': 'Ugni Blanc',
  'Мавруд': 'Mavrud', 'Мелник': 'Melnik', 'Широка мелнишка лоза': 'Shiroka Melnishka Loza', 'Димят': 'Dimiat', 'Гъмза': 'Gamza',
  'Памид': 'Pamid', 'Ркацители': 'Rkatsiteli', 'Рубин': 'Rubin', 'Мискет': 'Misket', 'Червен мискет': 'Red Misket',
  'Бургундско': 'Burgundy', 'Шампанско': 'Champagne', 'Просеко': 'Prosecco',
  // изби
  'Вила Юстина': 'Villa Yustina', 'Вила Мелник': 'Villa Melnik', 'Домейн Бойар': 'Domaine Boyar', 'Загреус': 'Zagreus',
  'Логодаж': 'Logodaj', 'Старосел': 'Starosel', 'Дамяница': 'Damianitza', 'Телиш': 'Telish', 'Катаржина': 'Katarzyna',
  'Едоардо Миролио': 'Edoardo Miroglio', 'Шато Копса': 'Château Copsa',
}
const NAMES_DE = { 'Rhine Riesling': 'Rheinriesling', 'Red Misket': 'Roter Misket', 'Burgundy': 'Burgunder', 'Champagne': 'Champagner' }

// Думи от винената карта (само за вина): цвят, вкус, начин на производство
const COLORS = {
  'бяло': ['white', 'weiß'], 'бяла': ['white', 'weiß'], 'бели': ['white', 'weiß'],
  'червено': ['red', 'rot'], 'червена': ['red', 'rot'], 'червени': ['red', 'rot'],
  'розе': ['rosé', 'Rosé'], 'пенливо': ['sparkling', 'Schaumwein'], 'пенливи': ['sparkling', 'Schaumwein'],
  'оранжево': ['orange', 'orange'],
}
const TASTES = {
  'сухо': ['dry', 'trocken'], 'суха': ['dry', 'trocken'], 'сухи': ['dry', 'trocken'],
  'полусухо': ['off-dry', 'halbtrocken'], 'полусуха': ['off-dry', 'halbtrocken'],
  'полусладко': ['medium-sweet', 'lieblich'], 'полусладка': ['medium-sweet', 'lieblich'],
  'сладко': ['sweet', 'süß'], 'сладка': ['sweet', 'süß'],
}
const WORDS = {
  'и': ['and', 'und'], 'шарма': ['Charmat', 'Charmat'], 'купаж': ['blend', 'Cuvée'], 'резерва': ['Reserve', 'Reserve'],
  'ризерва': ['Reserve', 'Riserva'], 'розово': ['rosé', 'Rosé'], 'бъчва': ['barrel', 'Fass'],
  'класически метод': ['traditional method', 'klassische Flaschengärung'],
}
// „бяло сухо“ -> „dry white“ / „Weiß, trocken“ (и обратният ред)
for (const [c, [ce, cd]] of Object.entries(COLORS)) for (const [t, [te, td]] of Object.entries(TASTES)) {
  WORDS[`${c} ${t}`] = WORDS[`${t} ${c}`] = [`${te} ${ce}`, `${cd[0].toUpperCase()}${cd.slice(1)}, ${td}`]
}
Object.assign(WORDS, COLORS, TASTES)

const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const mk = keys => new RegExp('(?<![\\p{L}])(' + [...keys].sort((a, b) => b.length - a.length).map(k => esc(k).replace(/ /g, '\\s+')).join('|') + ')(?![\\p{L}])', 'giu')
const NAME_MAP = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [k.toLowerCase(), [v, NAMES_DE[v] || v]]))
const ALL_MAP = { ...WORDS, ...NAME_MAP }
const NAME_RE = mk(Object.keys(NAME_MAP)), ALL_RE = mk(Object.keys(ALL_MAP))

// Превежда известните имена (и при вина: цвят, вкус, „и“), а останалата кирилица транслитерира
function localize(lang, text, wine) {
  const map = wine ? ALL_MAP : NAME_MAP
  let out = '', last = 0
  for (const m of text.matchAll(wine ? ALL_RE : NAME_RE)) {
    const v = map[m[1].toLowerCase().replace(/\s+/g, ' ')]
    out += translit(text.slice(last, m.index)) + v[lang === 'de' ? 1 : 0]
    last = m.index + m[0].length
  }
  return out + translit(text.slice(last))
}

const find = txt => CONTENT[txt] || CONTENT[(txt || '').trim().replace(/[!.]+$/, '')]

// Ред на търсене: полета в базата (i18n.<lang>) -> речникът CONTENT -> известни имена + латиница (за en/de) -> оригинал
// wine = true за вината: превежда и цвят, вкус и „и“
export function tx(lang, bgText, fromDb, wine = false) {
  if (lang === 'bg' || !bgText) return bgText
  if (typeof bgText !== 'string') return bgText
  return fromDb || find(bgText)?.[lang] || localize(lang, bgText, wine)
}
