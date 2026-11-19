import { useEffect, useState } from 'react'
import {
  onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, arrayUnion,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import QRCode from 'qrcode'
import { fileToDataUrl, slugify } from './util'

const SUGGEST = ['Салати', 'Предястия', 'Основни ястия', 'Пици', 'Паста', 'Десерти', 'Напитки']
const COLORS = ['#e9b45c', '#e8691a', '#c0392b', '#1f6b4f', '#1d4e89', '#333333']
const nameOf = c => (typeof c === 'string' ? c : c.name)

export default function Admin() {
  const [user, setUser] = useState(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  if (user === undefined) return <main className="wrap"><p>Зареждане…</p></main>
  return user ? <Panel user={user} /> : <Login />
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      if (isNew) await createUserWithEmailAndPassword(auth, email, pass)
      else await signInWithEmailAndPassword(auth, email, pass)
    } catch (ex) {
      setErr('Неуспешен вход. Провери имейла и паролата (поне 6 символа). ' + (ex.code || ''))
    }
  }

  return (
    <main className="wrap narrow">
      <h1>{isNew ? 'Нова регистрация' : 'Вход за собственици'}</h1>
      <form onSubmit={submit} className="stack">
        <input type="email" placeholder="Имейл" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Парола" value={pass} onChange={e => setPass(e.target.value)} required />
        {err && <p className="err">{err}</p>}
        <button>{isNew ? 'Регистрирай се' : 'Влез'}</button>
      </form>
      <button className="link" onClick={() => setIsNew(!isNew)}>
        {isNew ? 'Вече имам акаунт' : 'Нямам акаунт'}
      </button>
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
      {slug ? <Dashboard slug={slug} /> : <CreateRestaurant uid={user.uid} onDone={setSlug} />}
    </main>
  )
}

function CreateRestaurant({ uid, onDone }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const [err, setErr] = useState('')
  const final = slugify(slug)

  async function create(e) {
    e.preventDefault()
    setErr('')
    if (final.length < 3) return setErr('Адресът трябва да е поне 3 букви или цифри.')
    try {
      await setDoc(doc(db, 'restaurants', final), {
        name: name.trim(), ownerId: uid, color: '#e9b45c', currency: '€', categories: [],
      })
      onDone(final)
    } catch {
      setErr('Този адрес е зает. Опитай с друг.')
    }
  }

  return (
    <>
      <h1>Създай заведението си</h1>
      <form onSubmit={create} className="stack narrow">
        <label>Име на заведението
          <input value={name} required placeholder="Напр. Рафи Бар"
            onChange={e => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)) }} />
        </label>
        <label>Адрес в интернет
          <input value={slug} required placeholder="Напр. rafi"
            onChange={e => { setTouched(true); setSlug(e.target.value) }} />
        </label>
        <small>Менюто ще е на: {location.origin}/{final || 'rafi'}</small>
        {err && <p className="err">{err}</p>}
        <button>Създай</button>
      </form>
    </>
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
  const catObjs = (rest.categories || []).map(c => (typeof c === 'string' ? { name: c, group: '' } : { name: c.name, group: c.group || '' }))
  items.forEach(i => { if (i.category && !catObjs.some(c => c.name === i.category)) catObjs.push({ name: i.category, group: '' }) })

  return (
    <>
      <div className="head">
        <h1>{rest.name}</h1>
        <a className="btn" href={`/${slug}`} target="_blank" rel="noreferrer">Виж менюто</a>
      </div>
      <div className="tabs">
        {[['items', 'Ястия'], ['cats', 'Категории'], ['look', 'Външен вид'], ['qr', 'QR код']].map(([k, t]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      {tab === 'items' && <Dishes docRef={docRef} col={col} items={items} catObjs={catObjs} cur={rest.currency || '€'} />}
      {tab === 'cats' && <Categories docRef={docRef} catObjs={catObjs} items={items} />}
      {tab === 'look' && <Look docRef={docRef} rest={rest} />}
      {tab === 'qr' && <QrTab slug={slug} name={rest.name} />}
    </>
  )
}

function Dishes({ docRef, col, items, catObjs, cur }) {
  const cats = catObjs.map(c => c.name)
  const empty = { name: '', price: '', category: '', newCat: '', desc: '', photo: '', featured: false }
  const [f, setF] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })
  // избраната категория; ако още няма категории, се показва поле за нова
  const category = f.category === '__new' || cats.includes(f.category) ? f.category : (cats[0] || '__new')

  async function pick(e) {
    const file = e.target.files[0]
    if (file) setF({ ...f, photo: await fileToDataUrl(file, 800, 0.72) })
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      let cat = category
      if (cat === '__new') {
        cat = f.newCat.trim()
        if (!cat) throw new Error('NEED_CAT')
        if (!cats.includes(cat)) await updateDoc(docRef, { categories: [...catObjs, { name: cat, group: '' }] })
      }
      const data = { name: f.name.trim(), price: Number(f.price), category: cat, desc: f.desc.trim(), photo: f.photo, featured: f.featured }
      if (editId) await updateDoc(doc(col, editId), data)
      else await addDoc(col, { ...data, visible: true })
      setF({ ...empty, category: cat })
      setEditId(null)
      setMsg('Запазено ✓')
    } catch (ex) {
      setMsg(ex.message === 'NEED_CAT' ? 'Напиши име на категорията.' : 'Не се запази: ' + (ex.code || ex.message))
    }
    setBusy(false)
  }

  function edit(i) {
    setEditId(i.id)
    setMsg('')
    setF({ name: i.name, price: i.price, category: i.category || '', newCat: '', desc: i.desc || '', photo: i.photo || '', featured: !!i.featured })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sorted = [...items].sort((a, b) =>
    (a.category || '').localeCompare(b.category || '', 'bg') || a.name.localeCompare(b.name, 'bg'))

  return (
    <>
      <form onSubmit={save} className="stack card">
        <h2>{editId ? 'Редакция на ястие' : 'Добави ястие'}</h2>

        <label className="upload">
          {f.photo ? <img src={f.photo} alt="" /> : <span>Натисни, за да добавиш снимка</span>}
          <input type="file" accept="image/*" onChange={pick} hidden />
        </label>
        {f.photo && <button type="button" className="link" onClick={() => setF({ ...f, photo: '' })}>Махни снимката</button>}

        <label>Име <input value={f.name} onChange={set('name')} required /></label>
        <label>Цена ({cur}) <input type="number" step="0.01" min="0" value={f.price} onChange={set('price')} required /></label>
        <label>Категория
          <select value={category} onChange={set('category')}>
            {catObjs.map(c => <option key={c.name} value={c.name}>{c.group ? `${c.group} · ${c.name}` : c.name}</option>)}
            <option value="__new">+ Нова категория…</option>
          </select>
        </label>
        {category === '__new' && (
          <input value={f.newCat} onChange={set('newCat')} placeholder="Име на новата категория, напр. Салати" />
        )}
        <label>Описание (по желание) <input value={f.desc} onChange={set('desc')} /></label>
        <label className="check"><input type="checkbox" checked={f.featured} onChange={e => setF({ ...f, featured: e.target.checked })} /> Препоръчваме (показва се най-горе с голяма снимка)</label>

        <button disabled={busy}>{editId ? 'Запази промените' : 'Добави в менюто'}</button>
        {editId && <button type="button" className="link" onClick={() => { setEditId(null); setF(empty); setMsg('') }}>Отказ</button>}
        {msg && <p className={msg.startsWith('Запазено') ? 'ok' : 'err'}>{msg}</p>}
      </form>

      <h2>Ястия ({items.length})</h2>
      {sorted.length === 0 && <p className="muted">Още няма добавени ястия. Попълни формата по-горе.</p>}
      {sorted.map(i => (
        <div className="item" key={i.id}>
          {i.photo ? <img className="thumb" src={i.photo} alt="" /> : <div className="thumb" />}
          <div className="grow">
            <strong>{i.name}</strong>
            <div className="muted">
              {i.category} · {Number(i.price).toFixed(2)} {cur}{i.visible ? '' : ' · скрито'}{i.soldOut ? ' · изчерпано' : ''}{i.featured ? ' · препоръчвано' : ''}
            </div>
          </div>
          <div className="actions">
            <button className="link" onClick={() => edit(i)}>Промени</button>
            <button className="link" onClick={() => updateDoc(doc(col, i.id), { visible: !i.visible })}>{i.visible ? 'Скрий' : 'Покажи'}</button>
            <button className="link" onClick={() => updateDoc(doc(col, i.id), { soldOut: !i.soldOut })}>{i.soldOut ? 'Налично' : 'Изчерпано'}</button>
            <button className="link danger" onClick={() => confirm(`Изтриване на „${i.name}“?`) && deleteDoc(doc(col, i.id))}>Изтрий</button>
          </div>
        </div>
      ))}
    </>
  )
}

function Categories({ docRef, catObjs, items }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [msg, setMsg] = useState('')
  const groups = [...new Set(catObjs.map(c => c.group).filter(Boolean))]

  async function save(list) {
    setMsg('')
    try { await updateDoc(docRef, { categories: list }) }
    catch (ex) { setMsg('Не се запази: ' + (ex.code || ex.message)) }
  }

  function add(n) {
    n = n.trim()
    if (!n) return
    if (catObjs.some(c => c.name.toLowerCase() === n.toLowerCase())) return setMsg('Тази категория вече я има.')
    save([...catObjs, { name: n, group: group.trim() }])
  }

  function move(i, d) {
    const l = [...catObjs]
    ;[l[i], l[i + d]] = [l[i + d], l[i]]
    save(l)
  }

  function remove(c) {
    if (items.some(i => i.category === c.name)) return alert('В тази категория има ястия. Първо ги изтрий или им смени категорията.')
    save(catObjs.filter(x => x.name !== c.name))
  }

  function regroup(i, value) {
    let g = value
    if (value === '__new') {
      g = (prompt('Име на новото меню, напр. Зимно меню') || '').trim()
      if (!g) return
    }
    save(catObjs.map((c, k) => (k === i ? { ...c, group: g } : c)))
  }

  const left = SUGGEST.filter(s => !catObjs.some(c => c.name === s))

  return (
    <>
      <div className="stack card">
        <h2>Добави категория</h2>
        <label>Меню (по желание)
          <input list="groups" value={group} onChange={e => setGroup(e.target.value)} placeholder="Напр. Зимно меню. Остави празно, ако няма отделни менюта." />
        </label>
        <datalist id="groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
        {left.length > 0 && (
          <>
            <p className="muted">Натисни, за да добавиш с един клик:</p>
            <div className="chips">{left.map(s => <button key={s} type="button" className="chip" onClick={() => add(s)}>+ {s}</button>)}</div>
          </>
        )}
        <form className="inline" onSubmit={e => { e.preventDefault(); add(name); setName('') }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Или напиши своя, напр. Мезета" />
          <button>Добави</button>
        </form>
        {msg && <p className="err">{msg}</p>}
      </div>

      <h2>Категории ({catObjs.length})</h2>
      {catObjs.length === 0 && <p className="muted">Още няма категории.</p>}
      {catObjs.map((c, i) => (
        <div className="item" key={c.name}>
          <div className="grow">
            <strong>{c.name}</strong> <span className="muted">{items.filter(x => x.category === c.name).length} ястия</span>
            <select className="mini" value={c.group} onChange={e => regroup(i, e.target.value)} aria-label="Меню">
              <option value="">Без отделно меню</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="__new">+ Ново меню…</option>
            </select>
          </div>
          <div className="actions">
            <button className="link" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Нагоре">↑</button>
            <button className="link" disabled={i === catObjs.length - 1} onClick={() => move(i, 1)} aria-label="Надолу">↓</button>
            <button className="link danger" onClick={() => remove(c)}>Изтрий</button>
          </div>
        </div>
      ))}
    </>
  )
}

function Look({ docRef, rest }) {
  const [v, setV] = useState({
    name: rest.name, hideName: !!rest.hideName, color: rest.color || '#e9b45c', currency: rest.currency || '€',
    logo: rest.logo || '', logoBg: rest.logoBg || 'dark', opens: rest.opens || '', closes: rest.closes || '',
    slides: rest.slides?.length ? rest.slides : rest.cover ? [rest.cover] : [],
  })
  const [msg, setMsg] = useState('')

  async function addSlide(e) {
    const file = e.target.files[0]
    if (file && v.slides.length < 3) setV({ ...v, slides: [...v.slides, await fileToDataUrl(file, 1100, 0.6)] })
  }

  async function pickLogo(e) {
    const file = e.target.files[0]
    if (file) setV({ ...v, logo: await fileToDataUrl(file, 500, 0.9, 'image/png') })
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

  return (
    <form onSubmit={save} className="stack card">
      <h2>Външен вид</h2>
      <label>Име на заведението <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} required /></label>
      <label className="check"><input type="checkbox" checked={v.hideName} onChange={e => setV({ ...v, hideName: e.target.checked })} /> Скрий името до логото (ако логото вече го съдържа)</label>

      <div>
        <strong>Лого (в кръг)</strong>
        <p className="muted">Най-добре PNG с прозрачен фон. Показва се в кръг вляво, върху долния ръб на банера.</p>
        <input type="file" accept="image/*" onChange={pickLogo} />
        {v.logo && (
          <div className="logo-row">
            <img className={`avatar-prev${v.logoBg === 'light' ? ' light' : ''}`} src={v.logo} alt="" />
            <button type="button" className="link" onClick={() => setV({ ...v, logo: '' })}>Махни</button>
          </div>
        )}
        <div className="modes">
          <button type="button" className={`mode${v.logoBg !== 'light' ? ' on' : ''}`} onClick={() => setV({ ...v, logoBg: 'dark' })}>Тъмен кръг</button>
          <button type="button" className={`mode${v.logoBg === 'light' ? ' on' : ''}`} onClick={() => setV({ ...v, logoBg: 'light' })}>Светъл кръг</button>
        </div>
      </div>

      <div>
        <strong>Снимка на банера (по желание, до 3)</strong>
        <p className="muted">Широка снимка най-горе. Без нея банерът е тъмен и елегантен. Не качвай тук логото.</p>
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
      </div>

      <div>
        <strong>Работно време (по желание)</strong>
        <p className="muted">Показва "Отворено до 23:00" под името. Остави празно, за да не се показва.</p>
        <div className="row2">
          <label>Отваря в <input type="time" value={v.opens} onChange={e => setV({ ...v, opens: e.target.value })} /></label>
          <label>Затваря в <input type="time" value={v.closes} onChange={e => setV({ ...v, closes: e.target.value })} /></label>
        </div>
      </div>

      <div>
        <strong>Цвят на менюто</strong>
        <div className="chips">
          {COLORS.map(c => (
            <button key={c} type="button" className={`swatch${v.color === c ? ' on' : ''}`} style={{ background: c }}
              aria-label={c} onClick={() => setV({ ...v, color: c })} />
          ))}
          <input type="color" value={v.color} onChange={e => setV({ ...v, color: e.target.value })} aria-label="Друг цвят" />
        </div>
      </div>

      <label>Валута
        <select value={v.currency} onChange={e => setV({ ...v, currency: e.target.value })}>
          <option value="€">€ (евро)</option>
          <option value="лв.">лв.</option>
        </select>
      </label>

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
