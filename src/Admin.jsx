import { useEffect, useRef, useState } from 'react'
import {
  onAuthStateChanged, signOut,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, arrayUnion,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import QRCode from 'qrcode'
import { fileToDataUrl, bottleCutout, WINE_COLORS, WINE_TASTES, WINE_AREAS, isWineCat, isAlcCat, CASA_IG, isCasa } from './util'
import { resolveMap, DEFAULT_MAP, DEFAULT_BG, labelClass } from './winemap'

const SUGGEST = ['Салати', 'Предястия', 'Основни ястия', 'Пици', 'Паста', 'Десерти', 'Напитки']
const COLORS = ['#e9b45c', '#e8691a', '#c0392b', '#1f6b4f', '#1d4e89', '#333333']
const ALC = ['Бира', 'Вино', 'Водка', 'Уиски', 'Отлежало уиски', 'Джин и Мартини', 'Узо и ракия', 'Ром и Коняк', 'Ликьори']

export default function Admin() {
  const [user, setUser] = useState(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  if (user === undefined) return <main className="wrap"><p>Зареждане…</p></main>
  return user ? <Panel user={user} /> : <Login />
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      await signInWithEmailAndPassword(auth, email, pass)
    } catch {
      setErr('Неуспешен вход. Провери имейла и паролата.')
    }
  }

  return (
    <main className="wrap narrow">
      <h1>Вход за собственици</h1>
      <form onSubmit={submit} className="stack">
        <input type="email" placeholder="Имейл" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Парола" value={pass} onChange={e => setPass(e.target.value)} required />
        {err && <p className="err">{err}</p>}
        <button>Влез</button>
      </form>
    </main>
  )
}

function Panel({ user }) {
  const [slug, setSlug] = useState(undefined) // undefined = търси се, null = няма заведение

  useEffect(() => {
    getDocs(query(collection(db, 'restaurants'), where('ownerId', '==', user.uid)))
      .then(s => setSlug(s.empty ? null : s.docs[0].id))
  }, [user.uid])

  if (slug === undefined) return <main className="wrap"><p>Зареждане…</p></main>
  return (
    <main className="wrap">
      <p className="bar">{user.email} <button className="link" onClick={() => signOut(auth)}>Изход</button></p>
      {slug ? <Dashboard slug={slug} /> : <><h1>Няма свързано заведение</h1><p className="muted">Този акаунт още няма заведение. Свържи се с нас, за да го настроим.</p></>}
    </main>
  )
}

function Dashboard({ slug }) {
  const [tab, setTab] = useState('items')
  const [rest, setRest] = useState(null)
  const [items, setItems] = useState([])
  const docRef = doc(db, 'restaurants', slug)
  const col = collection(docRef, 'items')

  useEffect(() => {
    const a = onSnapshot(docRef, s => setRest(s.data()))
    const b = onSnapshot(col, s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { a(); b() }
  }, [slug])

  if (!rest) return <p>Зареждане…</p>
  const catObjs = (rest.categories || []).map(c => (typeof c === 'string' ? { name: c, group: '', parent: '' } : { name: c.name, group: c.group || '', parent: c.parent || '' }))
  items.forEach(i => { if (i.category && !catObjs.some(c => c.name === i.category)) catObjs.push({ name: i.category, group: '', parent: '' }) })

  const drinks = rest.drinksOnly ?? /casa\s*noma/i.test(rest.name || '')
  const W = drinks
    ? { tab: 'Напитки', add: 'Добави напитка', edit: 'Редакция на напитка', list: 'Напитки', search: 'Търси напитка по име…', none: 'Още няма добавени напитки. Попълни формата по-горе.', of: 'напитки' }
    : { tab: 'Ястия', add: 'Добави ястие', edit: 'Редакция на ястие', list: 'Ястия', search: 'Търси ястие по име…', none: 'Още няма добавени ястия. Попълни формата по-горе.', of: 'ястия' }

  return (
    <>
      <div className="head">
        <h1>{rest.name}</h1>
        <a className="btn" href={`/${slug}`} target="_blank" rel="noreferrer">Виж менюто</a>
      </div>
      <div className="tabs">
        {[['items', W.tab], ['cats', 'Категории'], ...(drinks || items.some(i => i.wineColor || i.taste) ? [['map', 'Карта']] : []), ['look', 'Външен вид'], ['qr', 'QR код']].map(([k, t]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      {tab === 'items' && <Dishes docRef={docRef} col={col} items={items} catObjs={catObjs} cur={rest.currency || '€'} W={W} areas={resolveMap(rest).areas} />}
      {tab === 'cats' && <Categories docRef={docRef} catObjs={catObjs} items={items} W={W} />}
      {tab === 'map' && <MapTab docRef={docRef} rest={rest} items={items} />}
      {tab === 'look' && <Look docRef={docRef} rest={rest} />}
      {tab === 'qr' && <QrTab slug={slug} name={rest.name} />}
    </>
  )
}

function Dishes({ docRef, col, items, catObjs, cur, W, areas }) {
  const cats = catObjs.map(c => c.name)
  const empty = { name: '', price: '', category: '', newCat: '', desc: '', photo: '', featured: false, wineColor: '', taste: '', area: '', grape: '', region: '', year: '', volume: '', glass: '', wineType: '', glassMl: '' }
  const [f, setF] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [noCut, setNoCut] = useState(false)
  const [msg, setMsg] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })
  // избраната категория; ако още няма категории, се показва поле за нова
  const category = f.category === '__new' || cats.includes(f.category) ? f.category : (cats[0] || '__new')
  // за „Вино“ и „Алкохол“ се показват допълнителни (незадължителни) полета
  const catObj = catObjs.find(c => c.name === category)
  const wine = !!catObj && isWineCat(catObj.name, catObj.parent)
  const alc = !!catObj && isAlcCat(catObj.name, catObj.parent)

  async function pick(e) {
    const file = e.target.files[0]
    if (!file) return
    setBusy(true)
    try {
      // за вино: автоматично изрязана бутилка (прозрачен фон); за останалите – обикновена снимка
      const url = wine && !noCut ? await bottleCutout(file) : await fileToDataUrl(file, 480, 0.6)
      setF(p => ({ ...p, photo: url }))
    } catch { setMsg('Снимката не се зареди.') }
    setBusy(false)
    e.target.value = ''
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      if (wine && (!f.wineColor || (areas.length > 0 && !f.area) || f.glass === '')) throw new Error('NEED_WINE')
      let cat = category
      if (cat === '__new') {
        cat = f.newCat.trim()
        if (!cat) throw new Error('NEED_CAT')
        if (!cats.includes(cat)) await updateDoc(docRef, { categories: [...catObjs, { name: cat, group: '', parent: '' }] })
      }
      const w = wine
        ? { wineColor: f.wineColor, taste: f.taste, area: f.area, grape: f.grape.trim(), region: f.region.trim(), year: f.year.trim(), wineType: f.wineType.trim(), glassPrice: f.glass === '' ? null : Number(f.glass), glassMl: f.glassMl === '' ? null : Number(f.glassMl) }
        : { wineColor: '', taste: '', area: '', grape: '', region: '', year: '', wineType: '', glassPrice: null, glassMl: null }
      const data = { name: f.name.trim(), price: wine && f.price === '' ? null : Number(f.price), category: cat, desc: f.desc.trim(), photo: f.photo, featured: f.featured, ...w, volume: wine || alc ? f.volume.trim() : '' }
      if (editId) await updateDoc(doc(col, editId), data)
      else await addDoc(col, { ...data, visible: true })
      setF({ ...empty, category: cat })
      setEditId(null)
      setMsg('Запазено ✓')
    } catch (ex) {
      setMsg(ex.message === 'NEED_CAT' ? 'Напиши име на категорията.' : ex.message === 'NEED_WINE' ? 'Попълни задължителните полета: вид, регион и цена на чаша.' : 'Не се запази: ' + (ex.code || ex.message))
    }
    setBusy(false)
  }

  function edit(i) {
    setEditId(i.id)
    setMsg('')
    setF({
      name: i.name, price: i.price ?? '', category: i.category || '', newCat: '', desc: i.desc || '', photo: i.photo || '', featured: !!i.featured,
      wineColor: i.wineColor || '', taste: i.taste || '', area: i.area || '', grape: i.grape || '', region: i.region || '', year: i.year || '', volume: i.volume || '',
      glass: i.glassPrice ?? '', wineType: i.wineType || '', glassMl: i.glassMl ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const matches = i => !term || i.name.toLowerCase().includes(term) || (i.desc || '').toLowerCase().includes(term)
  const itemsOf = n => items.filter(i => i.category === n && matches(i)).sort((a, b) => a.name.localeCompare(b.name, 'bg'))
  const isChild = c => c.parent && catObjs.some(p => p.name === c.parent)
  const tops = catObjs.filter(c => !isChild(c))
  const kidsOf = n => catObjs.filter(c => c.parent === n)
  const totalOf = c => itemsOf(c.name).length + kidsOf(c.name).reduce((sum, k) => sum + itemsOf(k.name).length, 0)
  const loose = items.filter(i => !i.category && matches(i)).sort((a, b) => a.name.localeCompare(b.name, 'bg'))

  const hasP = v => v !== undefined && v !== null && v !== ''
  const priceText = i => (hasP(i.glassPrice)
    ? `чаша ${Number(i.glassPrice).toFixed(2)} ${cur}${hasP(i.price) ? ` · бутилка ${Number(i.price).toFixed(2)} ${cur}` : ''}`
    : hasP(i.price) ? `${Number(i.price).toFixed(2)} ${cur}` : '—')

  const row = i => (
    <div className="item" key={i.id}>
      {i.photo ? <img className="thumb" src={i.photo} alt="" /> : <div className="thumb" />}
      <div className="grow">
        <strong>{i.name}</strong>
        <div className="muted">
          {priceText(i)}{i.visible ? '' : ' · скрито'}{i.soldOut ? ' · изчерпано' : ''}{i.featured ? ' · препоръчвано' : ''}
        </div>
      </div>
      <div className="actions">
        <button className="link" onClick={() => edit(i)}>Промени</button>
        <button className="link" onClick={() => updateDoc(doc(col, i.id), { visible: !i.visible })}>{i.visible ? 'Скрий' : 'Покажи'}</button>
        <button className="link" onClick={() => updateDoc(doc(col, i.id), { soldOut: !i.soldOut })}>{i.soldOut ? 'Налично' : 'Изчерпано'}</button>
        <button className="link danger" onClick={() => confirm(`Изтриване на „${i.name}“?`) && deleteDoc(doc(col, i.id))}>Изтрий</button>
      </div>
    </div>
  )

  // винa: подредени по регион (както в картата) и групирани със заглавие за региона
  const areaIdx = id => { const k = areas.findIndex(a => a.id === id); return k < 0 ? 999 : k }
  const areaName = id => areas.find(a => a.id === id)?.name || 'Без регион'
  const list = arr => {
    if (!arr.some(i => i.area)) return arr.map(row)
    const sorted = [...arr].sort((a, b) => areaIdx(a.area) - areaIdx(b.area) || a.name.localeCompare(b.name, 'bg'))
    const out = []
    sorted.forEach((i, n) => {
      if (n === 0 || sorted[n - 1].area !== i.area) out.push(<div className="region-h" key={'r' + (i.area || 'none') + n}>{areaName(i.area)} <span className="cnt">{sorted.filter(x => x.area === i.area).length}</span></div>)
      out.push(row(i))
    })
    return out
  }

  return (
    <>
      <form onSubmit={save} className="stack card">
        <h2>{editId ? W.edit : W.add}</h2>

        <label className={`upload${wine && !noCut && f.photo ? ' cut' : ''}`}>
          {f.photo ? <img src={f.photo} alt="" /> : <span>{wine ? 'Качи снимка на бутилката – фонът се маха автоматично' : 'Натисни, за да добавиш снимка'}</span>}
          <input type="file" accept="image/*" onChange={pick} hidden />
        </label>
        {f.photo && <button type="button" className="link" onClick={() => setF({ ...f, photo: '' })}>Махни снимката</button>}
        {wine && <label className="check"><span>Не изрязвай бутилката (качи снимката такава, каквато е)</span><input type="checkbox" checked={noCut} onChange={e => setNoCut(e.target.checked)} /></label>}

        <label>Име <input value={f.name} onChange={set('name')} required /></label>
        {!wine && <label>Цена ({cur}) <input type="number" step="0.01" min="0" value={f.price} onChange={set('price')} required /></label>}
        <label>Категория
          <select value={category} onChange={set('category')}>
            {catObjs.map(c => <option key={c.name} value={c.name}>{c.parent ? `${c.parent} › ${c.name}` : c.group ? `${c.group} · ${c.name}` : c.name}</option>)}
            <option value="__new">+ Нова категория…</option>
          </select>
        </label>
        {category === '__new' && (
          <input value={f.newCat} onChange={set('newCat')} placeholder="Име на новата категория, напр. Салати" />
        )}
        {wine && (
          <div className="stack winebox">
            <strong>Данни за виното <span className="muted">(* задължително)</span></strong>
            <div className="row2">
              <label>Вид *
                <select value={f.wineColor} onChange={set('wineColor')} required>
                  <option value="">Избери…</option>
                  {WINE_COLORS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label>Регион *
                <select value={f.area} onChange={set('area')} required={areas.length > 0}>
                  <option value="">Избери…</option>
                  {f.area && !areas.some(x => x.id === f.area) && <option value={f.area}>(изтрита област)</option>}
                  {areas.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
            </div>
            <div className="row2">
              <label>Цена на чаша ({cur}) * <input type="number" step="0.01" min="0" value={f.glass} onChange={set('glass')} required /></label>
              <label>Мл на чашата <input type="number" min="0" value={f.glassMl} onChange={set('glassMl')} placeholder="Напр. 150" /></label>
            </div>
            <div className="row2">
              <label>Цена за бутилка ({cur}) <span className="muted">по желание</span> <input type="number" step="0.01" min="0" value={f.price} onChange={set('price')} /></label>
              <label>Обем на бутилката (мл) <span className="muted">по желание</span> <input type="number" min="0" value={f.volume} onChange={set('volume')} placeholder="750" /></label>
            </div>
            <div className="row2">
              <label>Сорт / купаж <input value={f.grape} onChange={set('grape')} placeholder="Напр. Мавруд, Каберне, Шардоне" /></label>
              <label>Тип <input value={f.wineType} onChange={set('wineType')} placeholder="Напр. ЕПВ - Тр. метод - бяло" /></label>
            </div>
            <div className="row2">
              <label>Вкус
                <select value={f.taste} onChange={set('taste')}>
                  <option value="">Не е посочено</option>
                  {WINE_TASTES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label>Година <input value={f.year} onChange={set('year')} placeholder="2023" inputMode="numeric" /></label>
            </div>
            <label>Производител <span className="muted">по желание</span> <input value={f.region} onChange={set('region')} placeholder="Напр. Мелник" /></label>
          </div>
        )}
        {alc && !wine && (
          <div className="stack winebox">
            <strong>Данни за напитката <span className="muted">(всичко е по желание)</span></strong>
            <label>Обем (мл) <input type="number" min="0" value={f.volume} onChange={set('volume')} placeholder="50" /></label>
          </div>
        )}
        <label>Описание (по желание) <input value={f.desc} onChange={set('desc')} /></label>
        <label className="check"><span>Препоръчваме (показва се най-горе с голяма снимка)</span><input type="checkbox" checked={f.featured} onChange={e => setF({ ...f, featured: e.target.checked })} /></label>

        <button disabled={busy}>{editId ? 'Запази промените' : 'Добави в менюто'}</button>
        {editId && <button type="button" className="link" onClick={() => { setEditId(null); setF(empty); setMsg('') }}>Отказ</button>}
        {msg && <p className={msg.startsWith('Запазено') ? 'ok' : 'err'}>{msg}</p>}
      </form>

      <h2>{W.list} ({items.length})</h2>
      {items.length > 0 && <input className="search" type="search" placeholder={W.search} value={q} onChange={e => setQ(e.target.value)} />}
      {items.length === 0 && <p className="muted">{W.none}</p>}
      {term && items.length > 0 && !items.some(matches) && <p className="muted">Няма намерени {W.of}.</p>}

      {tops.map(c => {
        const total = totalOf(c)
        if (!total) return null
        return (
          <details className="cat" key={c.name} open={term ? true : undefined}>
            <summary><span>{c.name}{c.group && <span className="sub-tag"> · {c.group}</span>}</span><span className="cnt">{total}</span></summary>
            <div className="cat-body">
              {list(itemsOf(c.name))}
              {kidsOf(c.name).map(k => itemsOf(k.name).length > 0 && (
                <details className="cat" key={k.name} open={term ? true : undefined}>
                  <summary><span>{k.name}</span><span className="cnt">{itemsOf(k.name).length}</span></summary>
                  <div className="cat-body">{list(itemsOf(k.name))}</div>
                </details>
              ))}
            </div>
          </details>
        )
      })}
      {loose.length > 0 && (
        <details className="cat" open={term ? true : undefined}>
          <summary><span>Без категория</span><span className="cnt">{loose.length}</span></summary>
          <div className="cat-body">{loose.map(row)}</div>
        </details>
      )}
    </>
  )
}

function Categories({ docRef, catObjs, items, W }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [parent, setParent] = useState('')
  const [msg, setMsg] = useState('')
  const isChild = c => c.parent && catObjs.some(p => p.name === c.parent)
  const tops = catObjs.filter(c => !isChild(c))
  const kidsOf = n => catObjs.filter(c => c.parent === n)
  const sibsOf = c => (isChild(c) ? catObjs.filter(x => x.parent === c.parent) : tops)
  const groups = [...new Set(tops.map(c => c.group).filter(Boolean))]
  const parentObj = tops.find(c => c.name === parent)
  const par = parentObj ? parentObj.name : ''

  async function save(list) {
    setMsg('')
    try { await updateDoc(docRef, { categories: list }) }
    catch (ex) { setMsg('Не се запази: ' + (ex.code || ex.message)) }
  }

  function add(n) {
    n = n.trim()
    if (!n) return
    if (catObjs.some(c => c.name.toLowerCase() === n.toLowerCase())) return setMsg('Тази категория вече я има.')
    save([...catObjs, { name: n, group: parentObj ? parentObj.group : group.trim(), parent: par }])
  }

  // „Алкохол“ с готовите подкатегории
  function addAlcohol() {
    const list = [...catObjs]
    const has = n => list.some(c => c.name.toLowerCase() === n.toLowerCase())
    if (!has('Алкохол')) list.push({ name: 'Алкохол', group: '', parent: '' })
    const p = list.find(c => c.name.toLowerCase() === 'алкохол')
    ALC.forEach(n => { if (!has(n)) list.push({ name: n, group: p.group || '', parent: p.name }) })
    save(list)
  }

  // винена карта: „Вино“ и отделно „Алкохол“ с подкатегории (без Вино)
  function addWineCard() {
    const list = [...catObjs]
    const has = n => list.some(c => c.name.toLowerCase() === n.toLowerCase())
    if (!has('Вино')) list.push({ name: 'Вино', group: '', parent: '' })
    if (!has('Алкохол')) list.push({ name: 'Алкохол', group: '', parent: '' })
    const p = list.find(c => c.name.toLowerCase() === 'алкохол')
    ALC.filter(n => n !== 'Вино').forEach(n => { if (!has(n)) list.push({ name: n, group: p.group || '', parent: p.name }) })
    save(list)
  }

  function move(c, d) {
    const sibs = sibsOf(c)
    const o = sibs[sibs.findIndex(x => x.name === c.name) + d]
    if (!o) return
    const l = [...catObjs]
    const a = l.findIndex(x => x.name === c.name), b = l.findIndex(x => x.name === o.name)
    ;[l[a], l[b]] = [l[b], l[a]]
    save(l)
  }

  function remove(c) {
    if (kidsOf(c.name).length) return alert('Тази категория има подкатегории. Първо ги изтрий или ги премести.')
    if (items.some(i => i.category === c.name)) return alert(`В тази категория има ${W.of}. Първо ги изтрий или им смени категорията.`)
    save(catObjs.filter(x => x.name !== c.name))
  }

  function regroup(c, value) {
    let g = value
    if (value === '__new') {
      g = (prompt('Име на новото меню, напр. Зимно меню') || '').trim()
      if (!g) return
    }
    save(catObjs.map(x => (x.name === c.name || x.parent === c.name ? { ...x, group: g } : x)))
  }

  function reparent(c, value) {
    const p = catObjs.find(x => x.name === value)
    save(catObjs.map(x => (x.name === c.name ? { ...x, parent: value, group: p ? p.group : x.group } : x)))
  }

  const left = SUGGEST.filter(s => !catObjs.some(c => c.name === s))
  const alcLeft = !catObjs.some(c => c.name.toLowerCase() === 'алкохол') || ALC.some(n => !catObjs.some(c => c.name.toLowerCase() === n.toLowerCase()))

  const row = c => {
    const sibs = sibsOf(c)
    const k = sibs.findIndex(x => x.name === c.name)
    const kids = kidsOf(c.name)
    return (
      <div className={`item${isChild(c) ? ' sub' : ''}`} key={c.name}>
        <div className="grow">
          <strong>{c.name}</strong> <span className="muted">{items.filter(x => x.category === c.name).length} {W.of}{kids.length ? ` · ${kids.length} подкатегории` : ''}</span>
          {!isChild(c) && (
            <select className="mini" value={c.group} onChange={e => regroup(c, e.target.value)} aria-label="Меню">
              <option value="">Без отделно меню</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="__new">+ Ново меню…</option>
            </select>
          )}
          {kids.length === 0 && (
            <select className="mini" value={isChild(c) ? c.parent : ''} onChange={e => reparent(c, e.target.value)} aria-label="Подкатегория на">
              <option value="">Основна категория</option>
              {tops.filter(t => t.name !== c.name).map(t => <option key={t.name} value={t.name}>Подкатегория на: {t.name}</option>)}
            </select>
          )}
        </div>
        <div className="actions">
          <button className="link" disabled={k === 0} onClick={() => move(c, -1)} aria-label="Нагоре">↑</button>
          <button className="link" disabled={k === sibs.length - 1} onClick={() => move(c, 1)} aria-label="Надолу">↓</button>
          <button className="link danger" onClick={() => remove(c)}>Изтрий</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="stack card">
        <h2>Добави категория</h2>
        {!catObjs.some(c => c.name.toLowerCase() === 'вино') && (
          <div>
            <p className="muted">За винена карта: категория Вино (с вид и вкус) и отделно Алкохол.</p>
            <div className="chips"><button type="button" className="chip" onClick={addWineCard}>+ Винена карта (Вино + Алкохол)</button></div>
          </div>
        )}
        {alcLeft && (
          <div>
            <p className="muted">Готов пример с подкатегории: Алкохол → Бира, Вино, Водка, Уиски…</p>
            <div className="chips"><button type="button" className="chip" onClick={addAlcohol}>+ Алкохол с подкатегории</button></div>
          </div>
        )}
        <label>Подкатегория на (по желание)
          <select value={par} onChange={e => setParent(e.target.value)}>
            <option value="">Не, това е основна категория</option>
            {tops.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </label>
        {!par && (
          <label>Меню (по желание)
            <input list="groups" value={group} onChange={e => setGroup(e.target.value)} placeholder="Напр. Зимно меню. Остави празно, ако няма отделни менюта." />
          </label>
        )}
        <datalist id="groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
        {!par && left.length > 0 && (
          <>
            <p className="muted">Натисни, за да добавиш с един клик:</p>
            <div className="chips">{left.map(s => <button key={s} type="button" className="chip" onClick={() => add(s)}>+ {s}</button>)}</div>
          </>
        )}
        <form className="inline" onSubmit={e => { e.preventDefault(); add(name); setName('') }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={par ? `Подкатегория на ${par}, напр. Бира` : 'Или напиши своя, напр. Мезета'} />
          <button>Добави</button>
        </form>
        {msg && <p className="err">{msg}</p>}
      </div>

      <h2>Категории ({catObjs.length})</h2>
      {catObjs.length === 0 && <p className="muted">Още няма категории.</p>}
      {tops.map(t => (
        <div key={t.name}>
          {row(t)}
          {kidsOf(t.name).map(row)}
        </div>
      ))}
    </>
  )
}

function Look({ docRef, rest }) {
  const casaLike = isCasa(rest) || /casa\s*noma/i.test(rest.name || '') || (rest.drinksOnly ?? false)
  const [v, setV] = useState({
    name: rest.name, theme: rest.theme || 'classic', hideName: !!rest.hideName, color: rest.color || '#e9b45c', currency: rest.currency || '€',
    logo: rest.logo || '', logoBg: rest.logoBg || 'dark', logoShape: rest.logoShape || 'circle', opens: rest.opens || '', closes: rest.closes || '',
    drinksOnly: rest.drinksOnly ?? /casa\s*noma/i.test(rest.name || ''), tagline: rest.tagline || '', wifi: rest.wifi || '', wifiPass: rest.wifiPass || '',
    address: rest.address || '', phone: rest.phone || '', facebook: rest.facebook || '', google: rest.google || '',
    hideStatus: !!rest.hideStatus, coverIdentity: rest.coverIdentity ?? isCasa(rest), instagram: rest.instagram ?? (isCasa(rest) ? CASA_IG : ''), hideInfo: rest.hideInfo ?? isCasa(rest),
    hideLogo: rest.hideLogo ?? casaLike, hideIg: rest.hideIg ?? casaLike, hideTagline: rest.hideTagline ?? casaLike, igOnImage: rest.igOnImage ?? casaLike,
    slides: rest.slides?.length ? rest.slides : rest.cover ? [rest.cover] : [],
  })
  const [msg, setMsg] = useState('')

  async function addSlide(e) {
    const file = e.target.files[0]
    if (file && v.slides.length < 3) setV({ ...v, slides: [...v.slides, await fileToDataUrl(file, 900, 0.55)] })
  }

  async function pickLogo(e) {
    const file = e.target.files[0]
    if (file) setV({ ...v, logo: await fileToDataUrl(file, 640, 0.9, 'image/png') })
  }

  async function save(e) {
    e.preventDefault()
    setMsg('')
    if (JSON.stringify(v).length > 950000) return setMsg('Снимките са твърде тежки. Махни една.')
    try {
      await updateDoc(docRef, { ...v, name: v.name.trim(), cover: '' })
      setMsg('Запазено ✓')
    } catch (ex) {
      setMsg('Не се запази: ' + (ex.code || ex.message))
    }
  }

  const chk = (k, text) => (
    <label className="check"><span>{text}</span><input type="checkbox" checked={!!v[k]} onChange={e => setV({ ...v, [k]: e.target.checked })} /></label>
  )

  return (
    <form onSubmit={save} className="look">
      <section className="sect">
        <h2>Основно</h2>
        <label>Име на заведението <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} required /></label>
        <div className="row2">
          <label>Валута
            <select value={v.currency} onChange={e => setV({ ...v, currency: e.target.value })}>
              <option value="€">€ (евро)</option>
              <option value="лв.">лв.</option>
            </select>
          </label>
          <div className="field">
            <span className="lbl">Стил на менюто</span>
            <div className="modes">
              <button type="button" className={`mode${v.theme !== 'luxury' ? ' on' : ''}`} onClick={() => setV({ ...v, theme: 'classic' })}>Светъл</button>
              <button type="button" className={`mode${v.theme === 'luxury' ? ' on' : ''}`} onClick={() => setV({ ...v, theme: 'luxury' })}>Тъмен</button>
            </div>
          </div>
        </div>
        {chk('drinksOnly', 'Само напитки (в панела пише „напитки“ вместо „ястия“)')}
        <div className="field">
          <span className="lbl">Цвят на менюто</span>
          <div className="chips">
            {COLORS.map(c => (
              <button key={c} type="button" className={`swatch${v.color === c ? ' on' : ''}`} style={{ background: c }}
                aria-label={c} onClick={() => setV({ ...v, color: c })} />
            ))}
            <input type="color" value={v.color} onChange={e => setV({ ...v, color: e.target.value })} aria-label="Друг цвят" />
          </div>
        </div>
      </section>

      <section className="sect">
        <h2>Лого</h2>
        <p className="muted">Най-добре PNG с прозрачен фон. Показва се вляво, върху долния ръб на банера.</p>
        <label className="upload small"><span>{v.logo ? 'Смени логото' : '+ Качи лого'}</span><input type="file" accept="image/*" onChange={pickLogo} hidden /></label>
        {v.logo && (
          <div className="logo-row">
            <img className={`avatar-prev ${v.logoShape}${v.logoBg === 'light' ? ' light' : ''}`} src={v.logo} alt="" />
            <button type="button" className="link danger" onClick={() => setV({ ...v, logo: '' })}>Махни</button>
          </div>
        )}
        <div className="field">
          <span className="lbl">Форма</span>
          <div className="modes wrapmodes">
            {[['circle', 'Кръг'], ['rounded', 'Закръглен'], ['square', 'Квадрат'], ['wide', 'Правоъгълник'], ['free', 'Без рамка']].map(([k, t]) => (
              <button key={k} type="button" className={`mode${v.logoShape === k ? ' on' : ''}`} onClick={() => setV({ ...v, logoShape: k })}>{t}</button>
            ))}
          </div>
        </div>
        {v.logoShape !== 'free' && (
          <div className="field">
            <span className="lbl">Фон на логото</span>
            <div className="modes">
              <button type="button" className={`mode${v.logoBg !== 'light' ? ' on' : ''}`} onClick={() => setV({ ...v, logoBg: 'dark' })}>Тъмен</button>
              <button type="button" className={`mode${v.logoBg === 'light' ? ' on' : ''}`} onClick={() => setV({ ...v, logoBg: 'light' })}>Светъл</button>
            </div>
          </div>
        )}
      </section>

      <section className="sect">
        <h2>Банер</h2>
        <p className="muted">Широка снимка най-горе (до 3). Без нея банерът е тъмен и елегантен. Не качвай тук логото.</p>
        <div className="slides">
          {v.slides.map((s, i) => (
            <div key={i} className="slide">
              <img src={s} alt="" />
              <button type="button" className="link danger" onClick={() => setV({ ...v, slides: v.slides.filter((_, k) => k !== i) })}>Махни</button>
            </div>
          ))}
        </div>
        {v.slides.length < 3 && (
          <label className="upload small"><span>+ Добави снимка</span><input type="file" accept="image/*" onChange={addSlide} hidden /></label>
        )}
        <div className="opts">
          {chk('coverIdentity', 'Лого, име и Instagram върху снимката на банера (като постер)')}
          {chk('igOnImage', 'Instagram бутонът е този от снимката (натиска се директно върху нея)')}
          {chk('hideName', 'Скрий името до логото (ако логото вече го съдържа)')}
          {chk('hideLogo', 'Скрий кръглото лого')}
          {chk('hideIg', 'Скрий Instagram иконата до името')}
          {chk('hideTagline', 'Скрий приветствието („Добре дошли“) върху банера')}
        </div>
      </section>

      <section className="sect">
        <h2>Работно време</h2>
        <p className="muted">Показва „Отворено до 23:00“ под името. Остави празно, за да не се показва.</p>
        <div className="row2">
          <label>Отваря в <input type="time" value={v.opens} onChange={e => setV({ ...v, opens: e.target.value })} /></label>
          <label>Затваря в <input type="time" value={v.closes} onChange={e => setV({ ...v, closes: e.target.value })} /></label>
        </div>
        {chk('hideStatus', 'Скрий реда „Отворено / Затворено“ в менюто')}
      </section>

      <section className="sect">
        <h2>Информация и контакти</h2>
        <p className="muted">Показва се в бутон „Информация“ до името. Празните полета не се показват.</p>
        <label>Кратко приветствие под името <input value={v.tagline} onChange={e => setV({ ...v, tagline: e.target.value })} placeholder="Напр. Добре дошли в мястото за чаша ароматно кафе" /></label>
        <div className="row2">
          <label>Wi-Fi мрежа <input value={v.wifi} onChange={e => setV({ ...v, wifi: e.target.value })} /></label>
          <label>Wi-Fi парола <input value={v.wifiPass} onChange={e => setV({ ...v, wifiPass: e.target.value })} /></label>
        </div>
        <label>Адрес <input value={v.address} onChange={e => setV({ ...v, address: e.target.value })} placeholder="гр. Първомай, ул. Княз Борис I 1Б" /></label>
        <label>Телефон <input type="tel" value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })} placeholder="+359 ..." /></label>
        <label>Instagram профил (линк) <input value={v.instagram} onChange={e => setV({ ...v, instagram: e.target.value })} placeholder="https://www.instagram.com/..." /></label>
        <label>Facebook страница (линк) <input value={v.facebook} onChange={e => setV({ ...v, facebook: e.target.value })} placeholder="https://facebook.com/..." /></label>
        <label>Google отзиви (линк) <input value={v.google} onChange={e => setV({ ...v, google: e.target.value })} placeholder="https://g.page/r/.../review" /></label>
        {chk('hideInfo', 'Скрий бутона „Информация“ в менюто')}
      </section>

      <div className="savebar">
        {msg && <p className={msg.startsWith('Запазено') ? 'ok' : 'err'}>{msg}</p>}
        <button>Запази</button>
      </div>
    </form>
  )
}

function MapTab({ docRef, rest, items }) {
  const base = resolveMap(rest)
  const [v, setV] = useState({
    on: base.on, names: base.names, size: base.size,
    areas: base.areas.map(a => ({ ...a })),
    image: rest.wineMap?.image || '', ratio: rest.wineMap?.ratio || 0,
    bg: rest.wineMap?.bg || '', bottle: rest.wineMap?.bottle || '',
  })
  const [sel, setSel] = useState(base.areas[0]?.id || '')
  const [newName, setNewName] = useState('')
  const [msg, setMsg] = useState('')
  const box = useRef(null)
  const drag = useRef('')
  const ratio = v.image && v.ratio ? v.ratio : 903 / 604
  const SIDES = [['b', 'Името отдолу'], ['t', 'Името отгоре'], ['r', 'Името вдясно'], ['l', 'Името вляво']]

  const setArea = (id, patch) => setV(p => ({ ...p, areas: p.areas.map(a => (a.id === id ? { ...a, ...patch } : a)) }))
  function move(id, e) {
    const r = box.current.getBoundingClientRect()
    const c = n => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10
    setArea(id, { x: c(((e.clientX - r.left) / r.width) * 100), y: c(((e.clientY - r.top) / r.height) * 100) })
  }
  function addArea() {
    const name = newName.trim()
    if (!name) return
    const id = 'a' + Date.now().toString(36)
    setV(p => ({ ...p, areas: [...p.areas, { id, name, x: 50, y: 50, side: 'b' }] }))
    setSel(id)
    setNewName('')
  }
  function removeArea(a) {
    const n = items.filter(i => i.area === a.id).length
    if (!confirm(n ? `В „${a.name}“ има ${n} вина. Те няма да се губят, но ще останат без област. Махане на областта?` : `Махане на „${a.name}“?`)) return
    setV(p => ({ ...p, areas: p.areas.filter(x => x.id !== a.id) }))
  }
  async function pick(key, e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setMsg('')
    try {
      if (key === 'image') {
        const url = await fileToDataUrl(file, 900, 0.82, 'image/webp')
        const r = await new Promise(res => { const im = new Image(); im.onload = () => res(im.width / im.height); im.onerror = () => res(0); im.src = url })
        setV(p => ({ ...p, image: url, ratio: Math.round(r * 1000) / 1000 }))
      } else if (key === 'bg') {
        setV(p => ({ ...p, bg: '' }))
        const url = await fileToDataUrl(file, 1000, 0.6)
        setV(p => ({ ...p, bg: url }))
      } else {
        const url = await fileToDataUrl(file, 160, 1, 'image/png')
        setV(p => ({ ...p, bottle: url }))
      }
    } catch {
      setMsg('Снимката не се зареди.')
    }
  }
  async function pickAreaBottle(id, e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try { setArea(id, { bottle: await fileToDataUrl(file, 160, 1, 'image/png') }) }
    catch { setMsg('Снимката не се зареди.') }
  }
  async function save(e) {
    e.preventDefault()
    setMsg('')
    const areas = v.areas.map(a => ({ id: a.id, name: a.name.trim(), x: a.x, y: a.y, side: a.side || 'b', bottle: a.bottle || '' }))
    if (areas.some(a => !a.name)) return setMsg('Всяка област трябва да има име.')
    const wineMap = { on: v.on, names: v.names, size: v.size, areas, image: v.image, ratio: v.ratio, bg: v.bg, bottle: v.bottle }
    if (JSON.stringify({ ...rest, wineMap }).length > 950000) return setMsg('Снимките са твърде тежки. Върни стандартната карта или фон.')
    try {
      await updateDoc(docRef, { wineMap })
      setMsg('Запазено ✓')
    } catch (ex) {
      setMsg('Не се запази: ' + (ex.code || ex.message))
    }
  }

  return (
    <form onSubmit={save} className="stack card">
      <h2>Карта на винените области</h2>
      <label className="check"><span>Показвай картата във винената карта на менюто</span><input type="checkbox" checked={v.on} onChange={e => setV({ ...v, on: e.target.checked })} /></label>
      <label className="check"><span>Показвай имената на областите до бутилките (изключено: остава само броят вина)</span><input type="checkbox" checked={v.names} onChange={e => setV({ ...v, names: e.target.checked })} /></label>
      <label>Размер на бутилките: ×{Number(v.size).toFixed(1)}
        <input type="range" min="0.8" max="2.4" step="0.1" value={v.size} onChange={e => setV({ ...v, size: Number(e.target.value) })} />
      </label>
      <p className="muted">Хвани бутилка и я дръпни върху желаната област. Всяка област може да има своя бутилка (PNG). Така показваш къде са вината от нея. Във формата на всяко вино избираш областта му.</p>

      <div className="wmapedit" style={{ '--fon': `url("${v.bg || DEFAULT_BG}")`, '--accent': rest.color || '#e9b45c', '--on-accent': '#1a1a1a', '--bs': v.size }}>
        <div className="wmapbox">
          <div className="wmap" ref={box} style={{ aspectRatio: ratio }}
            onPointerMove={e => { if (drag.current) move(drag.current, e) }}
            onPointerUp={() => { drag.current = '' }} onPointerCancel={() => { drag.current = '' }}
            onClick={e => { if (sel && e.target === e.currentTarget) move(sel, e) }}>
            <img src={v.image || DEFAULT_MAP} alt="Карта" />
            {v.areas.map(a => (
              <button type="button" key={a.id} className={`wpin${sel === a.id ? ' on' : ''}`} style={{ left: `${a.x}%`, top: `${a.y}%` }}
                aria-label={a.name}
                onPointerDown={e => { e.preventDefault(); setSel(a.id); drag.current = a.id; e.currentTarget.setPointerCapture(e.pointerId) }}
                onClick={e => e.stopPropagation()}>
                {a.bottle || v.bottle ? <img src={a.bottle || v.bottle} alt="" /> : (
                  <svg viewBox="0 0 24 48" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.5 1h5v3h-.8v9.5c0 2 4.3 3.6 4.3 9.5v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V23c0-5.900 4.300-7.500 4.300-9.500V4h-.8z" /></svg>
                )}
                <span className={`wlab ${labelClass(a)}`}><em>{a.name || '…'}</em></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <strong>Области ({v.areas.length})</strong>
        <div className="stack" style={{ marginTop: 8 }}>
          {v.areas.map(a => (
            <div key={a.id} className={`arow${sel === a.id ? ' on' : ''}`} onClick={() => setSel(a.id)}>
              <input value={a.name} onChange={e => setArea(a.id, { name: e.target.value })} aria-label="Име на областта" />
              <select value={a.side || 'b'} onChange={e => setArea(a.id, { side: e.target.value })} aria-label="Къде да е името">
                {SIDES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button type="button" className="link" onClick={ev => { ev.stopPropagation(); removeArea(a) }}>Махни</button>
              <div className="abottle" onClick={ev => ev.stopPropagation()}>
                {a.bottle ? <img src={a.bottle} alt="" /> : <span className="abph" />}
                <label className="link">{a.bottle ? 'Смени бутилката' : 'Качи своя бутилка (PNG)'}<input type="file" accept="image/*" hidden onChange={e => pickAreaBottle(a.id, e)} /></label>
                {a.bottle && <button type="button" className="link" onClick={() => setArea(a.id, { bottle: '' })}>Махни</button>}
              </div>
            </div>
          ))}
          <div className="row2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Нова област, напр. Мелнишки район"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addArea() } }} />
            <button type="button" onClick={addArea}>Добави област</button>
          </div>
          <button type="button" className="link" onClick={() => { setV(p => ({ ...p, areas: WINE_AREAS.map(a => ({ ...a })) })); setSel(WINE_AREAS[0].id) }}>Върни 9-те стандартни области</button>
        </div>
      </div>

      <div className="stack">
        <strong>Снимки (по желание)</strong>
        <label>Карта (най-добре PNG с прозрачен фон)
          <input type="file" accept="image/*" onChange={e => pick('image', e)} />
        </label>
        {v.image && <button type="button" className="link" onClick={() => setV({ ...v, image: '', ratio: 0 })}>Върни стандартната карта</button>}
        <label>Фон зад картата
          <input type="file" accept="image/*" onChange={e => pick('bg', e)} />
        </label>
        {v.bg && <button type="button" className="link" onClick={() => setV({ ...v, bg: '' })}>Върни стандартния фон</button>}
        <label>Икона на бутилката (PNG)
          <input type="file" accept="image/*" onChange={e => pick('bottle', e)} />
        </label>
        {v.bottle && <button type="button" className="link" onClick={() => setV({ ...v, bottle: '' })}>Върни стандартната бутилка</button>}
      </div>

      <button>Запази</button>
      {msg && <p className={msg.startsWith('Запазено') ? 'ok' : 'err'}>{msg}</p>}
    </form>
  )
}

function QrTab({ slug, name }) {
  const [base, setBase] = useState(location.origin)
  const [png, setPng] = useState('')
  const url = `${base.trim().replace(/\/+$/, '')}/${slug}`
  const local = /localhost|127\.0\.0\.1|192\.168\./.test(base)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' }).then(setPng).catch(() => setPng(''))
  }, [url])

  async function downloadSvg() {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2 })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    a.download = `qr-${slug}.svg`
    a.click()
  }

  return (
    <>
      <div className="stack card">
        <h2>QR код за менюто</h2>
        <p className="muted">Клиентите сканират кода и виждат само менюто на {name}, защото кодът води точно до адреса му.</p>
        <label>Адрес на сайта
          <input value={base} onChange={e => setBase(e.target.value)} placeholder="https://menuto.bg" />
        </label>
        <p>Кодът води към: <strong>{url}</strong></p>
        {local && <p className="err">Този адрес работи само на твоя компютър. Преди да печаташ, публикувай сайта и напиши по-горе истинския му адрес.</p>}
        <div className="inline">
          <a className="btn" href={png} download={`qr-${slug}.png`}>Свали PNG</a>
          <button type="button" onClick={downloadSvg}>Свали SVG</button>
          <button type="button" onClick={() => window.print()}>Принтирай</button>
        </div>
      </div>

      <div className="tent">
        <h3>{name}</h3>
        {png && <img src={png} alt={`QR код за менюто на ${name}`} />}
        <p>Сканирай за менюто</p>
      </div>
    </>
  )
}
