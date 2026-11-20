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

// Ред на търсене: полета в базата (i18n.<lang>) -> речникът CONTENT -> оригинал
export function tx(lang, bgText, fromDb) {
  if (lang === 'bg' || !bgText) return bgText
  return fromDb || CONTENT[bgText]?.[lang] || bgText
}
