import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { WINE_COLORS, WINE_TASTES, CASA_IG, isCasa } from './util'
import { resolveMap, labelClass } from './winemap'

const Bottle = ({ src }) => src ? <img src={src} alt="" aria-hidden="true" /> : (
  <svg viewBox="0 0 24 48" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M9.5 1h5v3h-.8v9.5c0 2 4.3 3.6 4.3 9.5v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V23c0-5.900 4.300-7.500 4.300-9.500V4h-.8z" />
  </svg>
)
const byName = (a, b) => a.name.localeCompare(b.name, 'bg')
const catOf = i => i.category || 'Меню'
const norm = c => (typeof c === 'string' ? { name: c, group: '', parent: '' } : { name: c.name, group: c.group || '', parent: c.parent || '' })
const slidesOf = r => (r?.slides?.length ? r.slides : r?.cover ? [r.cover] : [])

// тъмен или светъл текст върху избрания цвят
function onAccent(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#1a1a1a'
  const n = parseInt(m[1], 16)
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#1a1a1a' : '#fff'
}

// "Отворено до 23:00" според часа на телефона на клиента
function openStatus(opens, closes) {
  if (!opens || !closes) return null
  const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
  const o = mins(opens), c = mins(closes)
  const d = new Date(), now = d.getHours() * 60 + d.getMinutes()
  const open = o <= c ? now >= o && now < c : now >= o || now < c
  return open ? { open, text: `Отворено до ${closes}` } : { open, text: `Затворено · отваря в ${opens}` }
}

export default function Menu() {
  const slug = useParams().slug.toLowerCase()
  const [rest, setRest] = useState(undefined) // undefined = зарежда, null = няма такова
  const [items, setItems] = useState([])
  const [gActive, setGActive] = useState(null)
  const [cActive, setCActive] = useState(null)
  const [sActive, setSActive] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [slide, setSlide] = useState(0)
  const [info, setInfo] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [wColor, setWColor] = useState('')
  const [wMode, setWMode] = useState('all')
  const [wArea, setWArea] = useState('')
  const [wSort, setWSort] = useState('taste')
  const [wAll, setWAll] = useState(false)

  useEffect(() => {
    const offRest = onSnapshot(doc(db, 'restaurants', slug), s => setRest(s.exists() ? s.data() : null))
    const q = query(collection(db, 'restaurants', slug, 'items'), where('visible', '==', true))
    const offItems = onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { offRest(); offItems() }
  }, [slug])

  useEffect(() => { if (rest?.name) document.title = rest.name }, [rest])

  useEffect(() => {
    const n = slidesOf(rest).length
    if (n < 2) return
    const t = setInterval(() => setSlide(s => (s + 1) % n), 5000)
    return () => clearInterval(t)
  }, [rest])

  if (rest === undefined) return <main className="wrap"><p>Зареждане…</p></main>
  if (rest === null) return <main className="wrap"><h1>Не намираме това заведение</h1><p>Провери адреса или QR кода.</p></main>

  const slides = slidesOf(rest)
  const idx = slides.length ? slide % slides.length : 0
  const cur = rest.currency || '€'
  const accent = rest.color || '#e9b45c'
  const hasGlass = i => i.glassPrice !== undefined && i.glassPrice !== null && i.glassPrice !== ''
  const hasBottle = i => i.price !== undefined && i.price !== null && i.price !== ''
  const glassMoney = i => `${Number(i.glassPrice).toFixed(2)} ${cur}`
  const bottleMoney = i => `${Number(i.price).toFixed(2)} ${cur}`
  const money = i => (hasBottle(i) ? bottleMoney(i) : hasGlass(i) ? glassMoney(i) : '')
  const status = rest.hideStatus ? null : openStatus(rest.opens, rest.closes)
  const hasInfo = !!(rest.opens || rest.wifi || rest.address || rest.phone || rest.facebook || rest.google)
  const wm = resolveMap(rest)
  const showMap = wm.on && wm.areas.length > 0
  const link = u => (/^https?:\/\//i.test(u) ? u : `https://${u}`)
  const insta = rest.instagram ?? (isCasa(rest) ? CASA_IG : '')
  const ov = rest.coverIdentity ?? isCasa(rest) // лого, име и Instagram върху банера
  const showInfoBtn = hasInfo && !(rest.hideInfo ?? isCasa(rest))

  const all = (rest.categories || []).map(norm)
  items.forEach(i => { if (!all.some(c => c.name === catOf(i))) all.push({ name: catOf(i), group: '', parent: '' }) })
  const has = n => items.some(i => catOf(i) === n)
  const kids = n => all.filter(c => c.parent === n)
  const isTop = c => !c.parent || !all.some(p => p.name === c.parent)
  // основни категории (с ястия в тях или в подкатегориите им)
  const tops = all.filter(c => isTop(c) && (has(c.name) || kids(c.name).some(k => has(k.name))))
  const groups = [...new Set(tops.map(c => c.group))]
  const group = groups.includes(gActive) ? gActive : groups[0]
  const inGroup = tops.filter(c => c.group === group)
  const cat = inGroup.find(c => c.name === cActive)?.name || inGroup[0]?.name
  // подкатегории на избраната категория
  const subs = cat ? kids(cat).filter(k => has(k.name)).map(k => ({ name: k.name, label: k.name })) : []
  if (subs.length && has(cat)) subs.push({ name: cat, label: 'Други' })
  const sub = subs.find(x => x.name === sActive) || subs[0]
  const current = subs.length ? sub.name : cat
  const title = subs.length && sub.name !== cat ? sub.name : cat
  const shown = items.filter(i => catOf(i) === current).sort(byName)
  const featured = items.filter(i => i.featured)

  // винена карта: първо се вижда само картата; вината на областта се отварят в падащо меню
  const isWine = shown.some(i => i.wineColor || i.taste)
  const mapView = isWine && showMap
  const priceKey = i => (hasGlass(i) ? Number(i.glassPrice) : hasBottle(i) ? Number(i.price) : Infinity)
  const idxOf = (list, k) => { const n = list.findIndex(([x]) => x === k); return n < 0 ? 99 : n }
  const sorters = {
    name: byName,
    price: (a, b) => priceKey(a) - priceKey(b) || byName(a, b),
    taste: (a, b) => idxOf(WINE_TASTES, a.taste) - idxOf(WINE_TASTES, b.taste) || byName(a, b),
    color: (a, b) => idxOf(WINE_COLORS, a.wineColor) - idxOf(WINE_COLORS, b.wineColor) || byName(a, b),
  }
  const sortBy = sorters[wSort] || byName
  const areaCount = k => shown.filter(i => i.area === k).length
  const area = mapView && wArea && areaCount(wArea) ? wArea : ''
  const areaName = wm.areas.find(a => a.id === area)?.name
  const inArea = area ? shown.filter(i => i.area === area).sort(sortBy) : []
  const mode = wMode
  const byMode = !isWine || mode === 'all' ? shown : shown.filter(mode === 'glass' ? hasGlass : hasBottle)
  const wColors = WINE_COLORS.filter(([k]) => byMode.some(i => i.wineColor === k))
  const wc = wColors.some(([k]) => k === wColor) ? wColor : ''
  const view = isWine && wc ? byMode.filter(i => i.wineColor === wc) : byMode
  const blocks = isWine
    ? wSort === 'taste'
      ? [
          ...WINE_TASTES.map(([k, l]) => [l, view.filter(i => i.taste === k)]),
          ['Други', view.filter(i => !WINE_TASTES.some(([k]) => k === i.taste))],
        ].filter(b => b[1].length)
      : [['', [...view].sort(sortBy)]]
    : [['', view]]
  const count = shown.length
  const colorLabel = k => WINE_COLORS.find(([x]) => x === k)?.[1]
  const areaLabel = id => wm.areas.find(a => a.id === id)?.name
  const wline1 = (i, hideArea) => [colorLabel(i.wineColor), i.year, !hideArea && areaLabel(i.area)].filter(Boolean).join(' · ')
  const wline2 = i => [i.grape, i.wineType, i.region].filter(Boolean).join(' · ')
  // цена на вино: на чаша (с мл) е основната, бутилката е по желание
  const wprice = (i, m) => {
    const g = hasGlass(i), b = hasBottle(i)
    if (!g && !b) return null
    const first = m === 'bottle' ? (b ? 'b' : 'g') : (g ? 'g' : 'b')
    const second = first === 'g' ? (b ? 'b' : null) : (g ? 'g' : null)
    const txt = k => (k === 'g' ? glassMoney(i) : bottleMoney(i))
    const lab = k => (k === 'g' ? ['Чаша', i.glassMl] : ['Бутилка', i.volume])
    const row = (k, main) => {
      const [name, ml] = lab(k)
      return (
        <span className={`prow${main ? ' main' : ''}`}>
          <span className="plab">{name}{ml ? <em>{ml} мл</em> : null}</span>
          <b>{txt(k)}</b>
        </span>
      )
    }
    return (
      <>
        {row(first, true)}
        {second && row(second, false)}
      </>
    )
  }

  const dishIn = hideArea => i => (
    <button type="button" key={i.id}
      className={`dish${openId === i.id ? ' open' : ''}${i.soldOut ? ' out' : ''}`}
      onClick={() => setOpenId(openId === i.id ? null : i.id)}>
      {i.photo ? <img className="pic" src={i.photo} alt={i.name} loading="lazy" /> : isWine && <span className={`bt ${i.wineColor || ''}`}><Bottle src={wm.areas.find(a => a.id === i.area)?.bottle || wm.bottle} /></span>}
      <div className="info">
        <h3>{i.name}</h3>
        {isWine && wline1(i, hideArea) && <p className="wmeta">{wline1(i, hideArea)}</p>}
        {isWine && wline2(i) && <p className="wmeta">{wline2(i)}</p>}
        {!isWine && (i.volume ? <p className="wmeta">{i.volume} мл</p> : null)}
        {i.desc && <p>{i.desc}</p>}
        {i.soldOut && <em className="tag">изчерпано</em>}
      </div>
      <span className={`price${isWine ? ' wp' : ''}`}>{isWine ? wprice(i, mode === 'bottle' ? 'bottle' : 'glass') : money(i)}</span>
    </button>
  )
  const dish = dishIn(false)

  function goTo(i) {
    const c = all.find(x => x.name === catOf(i))
    const top = (c && c.parent && all.find(x => x.name === c.parent)) || c
    setGActive(top ? top.group : '')
    setCActive(top ? top.name : catOf(i))
    setSActive(catOf(i))
    setOpenId(i.id)
    setTimeout(() => document.getElementById('list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const ident = (
          <div className="idrow">
            <div className={`avatar${rest.logo ? ` ${rest.logoShape || 'circle'}${rest.logoBg === 'light' ? ' light' : ''}` : ' init'}`}>
              {rest.logo ? <img src={rest.logo} alt={rest.name} /> : <span>{rest.name.trim().charAt(0).toUpperCase()}</span>}
            </div>
            <div className="idtext">
              <div className="idline">
                {!rest.hideName && <h1 className="idname">{rest.name}</h1>}
                {insta && (
                  <a className="igbtn" href={link(insta)} target="_blank" rel="noreferrer" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                )}
              </div>
              {rest.tagline && <p className="tagline">{rest.tagline}</p>}
            </div>
          </div>
  )

  return (
    <div className={`page${rest.theme === 'luxury' ? ' luxe' : ''}`} style={{ '--accent': accent, '--on-accent': onAccent(accent) }}>
      <div className="shell">
        <header>
          <div className={`cover${ov ? ' ov' : ''}`}>
            {slides[idx] && <div key={idx} className="hero-bg" style={{ backgroundImage: `url("${slides[idx]}")` }} />}
            {slides.length > 1 && (
              <>
                <button className="arrow l" aria-label="Назад" onClick={() => setSlide((idx + slides.length - 1) % slides.length)}>‹</button>
                <button className="arrow r" aria-label="Напред" onClick={() => setSlide((idx + 1) % slides.length)}>›</button>
                <div className="dots">{slides.map((_, k) => <i key={k} className={k === idx ? 'on' : ''} />)}</div>
              </>
            )}
            {ov && ident}
          </div>

          {!ov && ident}

          {(status || showInfoBtn) && (
            <div className="meta">
              {status ? <div className={`status${status.open ? '' : ' closed'}`}><i />{status.text}</div> : <span />}
              {showInfoBtn && (
                <button type="button" className="infobtn" aria-expanded={info} onClick={() => setInfo(!info)}>Информация</button>
              )}
            </div>
          )}

          {info && hasInfo && (
            <div className="infopanel">
              {rest.opens && rest.closes && (
                <div className="irow"><span>Работно време</span><strong>{rest.opens} - {rest.closes}</strong></div>
              )}
              {rest.wifi && (
                <div className="irow">
                  <span>Wi-Fi</span>
                  <strong>
                    {rest.wifi}
                    {rest.wifiPass && (
                      <>
                        {' • '}
                        <button type="button" className="pass" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Скрий паролата' : 'Покажи паролата'}>
                          {showPass ? rest.wifiPass : '••••••••'}
                        </button>
                      </>
                    )}
                  </strong>
                </div>
              )}
              {rest.address && (
                <div className="irow">
                  <span>Адрес</span>
                  <strong><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rest.address)}`} target="_blank" rel="noreferrer">{rest.address}</a></strong>
                </div>
              )}
              {rest.phone && (
                <div className="irow">
                  <span>Телефон</span>
                  <strong><a href={`tel:${rest.phone.replace(/[^\d+]/g, '')}`}>{rest.phone}</a></strong>
                </div>
              )}
              {(rest.facebook || rest.google) && (
                <div className="ibtns">
                  {rest.facebook && <a className="ibtn" href={link(rest.facebook)} target="_blank" rel="noreferrer"><i>F</i>Последвайте ни</a>}
                  {rest.google && <a className="ibtn" href={link(rest.google)} target="_blank" rel="noreferrer"><i>G</i>Оценете преживяването си</a>}
                </div>
              )}
            </div>
          )}

        </header>

        {featured.length > 0 && (
          <section className="feat">
            <h2>Препоръчваме</h2>
            <div className="feat-row">
              {featured.map(i => (
                <button key={i.id} className="fcard" onClick={() => goTo(i)}>
                  <div className="fimg" style={i.photo ? { backgroundImage: `url("${i.photo}")` } : undefined}>
                    {money(i) && <span className="fprice">{money(i)}</span>}
                  </div>
                  <strong>{i.name}</strong>
                  {i.desc && <small>{i.desc}</small>}
                </button>
              ))}
            </div>
          </section>
        )}

        {(groups.length > 1 || inGroup.length > 0) && (
          <div className="sticky">
            {groups.length > 1 && (
              <nav className="gtabs" aria-label="Менюта">
                {groups.map(g => (
                  <button key={g} aria-pressed={g === group} onClick={() => { setGActive(g); setCActive(null); setSActive(null) }}>{g || 'Меню'}</button>
                ))}
              </nav>
            )}
            {inGroup.length > 0 && (
              <nav className="pills" aria-label="Категории">
                {inGroup.map(c => (
                  <button key={c.name} aria-pressed={c.name === cat} onClick={() => { setCActive(c.name); setSActive(null) }}>{c.name}</button>
                ))}
              </nav>
            )}
            {subs.length > 0 && (
              <nav className="subpills" aria-label="Подкатегории">
                {subs.map(x => (
                  <button key={x.name} aria-pressed={x.name === sub.name} onClick={() => setSActive(x.name)}>{x.label}</button>
                ))}
              </nav>
            )}
          </div>
        )}

        <main className="sec" id="list">
          {tops.length === 0 && <p className="empty">Менюто още е празно.</p>}
          {cat && (
            <>
              <h2>{title} <small>{count} {count === 1 ? 'продукт' : 'продукта'}</small></h2>
              {mapView && (
                <div className="wmapbox d3" style={{ '--fon': `url("${wm.bg}")`, '--bs': wm.size }}>
                  <div className={`wmap${area ? ' sel' : ''}${wm.names ? '' : ' nonames'}`} style={{ aspectRatio: wm.ratio }}>
                    <img src={wm.image} alt="Карта на винените райони на България" />
                    {wm.areas.map(a => {
                      const n = areaCount(a.id)
                      return (
                        <button type="button" key={a.id} className={`wpin${area === a.id ? ' on' : ''}${n ? '' : ' none'}`}
                          style={{ left: `${a.x}%`, top: `${a.y}%` }} disabled={!n} aria-pressed={area === a.id} aria-expanded={area === a.id}
                          aria-label={`${a.name}: ${n}`}
                          onClick={() => {
                            const next = area === a.id ? '' : a.id
                            setWArea(next)
                            if (next) setTimeout(() => document.getElementById('wdrop')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
                          }}>
                          <Bottle src={a.bottle || wm.bottle} />{n > 0 && <b>{n}</b>}
                          <span className={`wlab ${labelClass(a)}`}><em>{a.name}</em><small>{n} {n === 1 ? 'вино' : 'вина'}</small></span>
                        </button>
                      )
                    })}
                  </div>
                  {!area && <p className="warea hint">Натисни бутилка от картата, за да видиш вината</p>}
                </div>
              )}

              {mapView && area && (
                <section className="wdrop" id="wdrop" aria-label={areaName}>
                  <header>
                    <span className="whbt"><Bottle src={wm.areas.find(a => a.id === area)?.bottle || wm.bottle} /></span>
                    <div>
                      <strong>{areaName}</strong>
                      <small>{inArea.length} {inArea.length === 1 ? 'вино' : 'вина'}</small>
                    </div>
                    <label className="wsort"><span>Подреди</span>
                      <select value={wSort} onChange={e => setWSort(e.target.value)}>
                        <option value="taste">По вкус</option>
                        <option value="name">По име</option>
                        <option value="price">По цена</option>
                        <option value="color">По вид</option>
                      </select>
                    </label>
                    <button type="button" className="x" aria-label="Затвори" onClick={() => setWArea('')}>✕</button>
                  </header>
                  <div className="list" key={area + wSort}>{inArea.map(dishIn(true))}</div>
                </section>
              )}

              {mapView && (
                <button type="button" className="wall-toggle" aria-expanded={wAll} onClick={() => setWAll(!wAll)}>
                  <span>Всички вина и подреждане</span>
                  <small>{shown.length}</small>
                  <i aria-hidden="true">{wAll ? '▴' : '▾'}</i>
                </button>
              )}

              {(!mapView || wAll) && (
                <>
                  {isWine && (
                    <div className="wtools">
                      {wColors.length > 0 && (
                        <label><span>Вид</span>
                          <select value={wc} onChange={e => setWColor(e.target.value)}>
                            <option value="">Всички</option>
                            {wColors.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                        </label>
                      )}
                      <label><span>Цена</span>
                        <select value={mode} onChange={e => setWMode(e.target.value)}>
                          <option value="all">Всички</option>
                          <option value="glass">На чаша</option>
                          <option value="bottle">Бутилка</option>
                        </select>
                      </label>
                      <label><span>Подреди</span>
                        <select value={wSort} onChange={e => setWSort(e.target.value)}>
                          <option value="taste">По вкус</option>
                          <option value="name">По име</option>
                          <option value="price">По цена</option>
                          <option value="color">По вид</option>
                        </select>
                      </label>
                    </div>
                  )}
                  <div className="list" key={current + wc + wSort + mode}>
                    {blocks.map(([label, arr]) => (
                      <div key={label || '_'}>
                        {isWine && label && <h4 className="wgroup">{label}</h4>}
                        {arr.map(dish)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
