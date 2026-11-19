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

const BG = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' }

// "Рафи Бар" или "Raffi Bar" -> "rafi-bar" (главни букви и кирилица са позволени при писане)
export const slugify = s =>
  s.toLowerCase().split('').map(c => BG[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
