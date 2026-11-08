// Erinnerungsfotos der History: Verkleinern vor dem Upload und dauerhafter Geräte-Cache fürs Anzeigen.
// Dateien liegen im privaten Bucket "history-photos" (supabase/photos.sql) als "<user_id>/<uuid>.jpg".
// Der Name ändert sich nie, deshalb darf die Datei für immer zwischengespeichert werden - und weil die
// Signed URLs bei jedem Aufruf anders aussehen, steht der Cache unter dem Objektnamen, nicht unter der URL.
import { signPhotoPaths } from './supabase.js'

const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/
export const isPhotoPath = p => typeof p === 'string' && PATH_RE.test(p)
export const PHOTO_CACHE = 'lebe-photos'   // public/sw.js lässt diesen Cache beim Aufräumen stehen
const MAX_EDGE = 1200

// Verkleinert ein Foto aus der Mediathek auf höchstens 1200 px Kantenlänge (JPEG, ca. 100-250 KB) und
// dreht es nach den EXIF-Daten richtig herum. Wirft, wenn das Gerät das Bild nicht lesen kann (z. B. HEIC am Desktop).
export async function resizeToJpeg(file) {
  let src, close = () => {}
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' })
    close = () => src.close?.()
  } catch {
    // Ältere Browser: über ein <img> dekodieren (das berücksichtigt EXIF ebenfalls)
    const url = URL.createObjectURL(file)
    src = new Image()
    src.src = url
    try { await src.decode() } finally { URL.revokeObjectURL(url) }
    src.width = src.naturalWidth; src.height = src.naturalHeight
  }
  const w = src.width, h = src.height
  if (!w || !h) throw new Error('empty image')
  const k = Math.min(1, MAX_EDGE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * k)
  canvas.height = Math.round(h * k)
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height)
  close()
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
  if (!blob) throw new Error('jpeg failed')
  return blob
}

const cacheKey = path => `${import.meta.env.BASE_URL}_photo/${path}`
const urls = new Map()   // Objektname -> Promise<Blob-URL | null>

// Frisch hochgeladenes Foto sofort ablegen, damit es nicht noch einmal geladen werden muss
export function primePhoto(path, blob) {
  urls.set(path, Promise.resolve(URL.createObjectURL(blob)))
  if ('caches' in self) caches.open(PHOTO_CACHE).then(c => c.put(cacheKey(path), new Response(blob, { headers: { 'content-type': 'image/jpeg' } }))).catch(() => {})
}

// Gleichzeitig angeforderte Fotos werden zu einer einzigen Signed-URL-Anfrage gebündelt
let pending = new Map()
let flushTimer = null
function sign(path) {
  return new Promise(resolve => {
    pending.set(path, [...(pending.get(path) || []), resolve])
    clearTimeout(flushTimer)
    flushTimer = setTimeout(async () => {
      const batch = pending
      pending = new Map()
      let map = {}
      try { map = await signPhotoPaths([...batch.keys()]) } catch { /* offline: Fotos bleiben leer */ }
      for (const [p, resolvers] of batch) resolvers.forEach(r => r(map[p] || null))
    }, 30)
  })
}

async function load(path) {
  const cache = 'caches' in self ? await caches.open(PHOTO_CACHE).catch(() => null) : null
  let res = cache ? await cache.match(cacheKey(path)) : null
  if (!res) {
    const signed = await sign(path)
    if (!signed) return null
    res = await fetch(signed)
    if (!res.ok) return null
    if (cache) await cache.put(cacheKey(path), res.clone()).catch(() => {})
  }
  return URL.createObjectURL(await res.blob())
}

// Blob-URL zum Anzeigen eines Fotos (aus dem Geräte-Cache oder, beim ersten Mal, aus dem Bucket); null bei Fehler
export function photoUrl(path) {
  if (!isPhotoPath(path)) return Promise.resolve(null)
  if (!urls.has(path)) urls.set(path, load(path).catch(() => null).then(u => { if (!u) urls.delete(path); return u }))
  return urls.get(path)
}
