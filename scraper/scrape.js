import * as cheerio from 'cheerio'
// .env laden
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname2 = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname2, '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=')
    if (eq > 0) process.env[line.slice(0,eq).trim()] = line.slice(eq+1).trim()
  })
}
import ICAL from 'ical.js'
import fs from 'fs'
import path from 'path'
function detectType(title, description = '') {
  const t = (title + ' ' + description).toLowerCase()
  const sonstigeKeywords = [
    'convention', 'workshop', 'ausstellung', 'exhibition', 'flohmarkt',
    'markt', 'lesung', 'vortrag', 'führung', 'theater', 'kino', 'film',
    'comedy', 'kabarett', 'quiz', 'tag der', 'messe', 'kunstmarkt',
    'druckkunst', 'tattoo', 'vernissage', 'finissage', 'open day'
  ]
  const partyKeywords = [
    'party', 'club night', 'clubnight', 'dj set', 'dj-set', 'rave',
    'techno', 'house night', 'disco', 'dancehall', 'club event'
  ]
  if (sonstigeKeywords.some(k => t.includes(k))) return 'sonstige'
  if (partyKeywords.some(k => t.includes(k))) return 'party'
  return 'konzert'
}

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

function parseGermanDate(str) {
  if (!str) return null
  const months = { jan:0,feb:1,mär:2,mar:2,apr:3,mai:4,jun:5,jul:6,aug:7,sep:8,okt:9,nov:10,dez:11 }
  str = str.toLowerCase().trim()
  // Format: "15.03.2026" oder "15. März 2026" oder "Sa, 15.03."
  const iso = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dot = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dot) return `${dot[3]}-${dot[2].padStart(2,'0')}-${dot[1].padStart(2,'0')}`
  const dot2 = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/)
  if (dot2) return `20${dot2[3]}-${dot2[2].padStart(2,'0')}-${dot2[1].padStart(2,'0')}`
  for (const [mon, num] of Object.entries(months)) {
    const r = str.match(new RegExp(`(\\d{1,2})\\.?\\s*${mon}\\w*\\s*(\\d{4})`))
    if (r) return `${r[2]}-${String(num+1).padStart(2,'0')}-${r[1].padStart(2,'0')}`
  }
  return null
}

function parseTime(str) {
  if (!str) return '20:00'
  const m = str.match(/(\d{1,2}):(\d{2})/)
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : '20:00'
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ─── Scraper pro Location ────────────────────────────────────────────────────

async function scrapeConne() {
  console.log('📡 Conne Island (RSS)...')
  try {
    const res = await fetch('https://conne-island.de/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const text = await res.text()
    const events = []

    // Items aus RSS extrahieren
    const items = text.split('<item>')
    items.shift() // erstes Element ist der Channel-Header

    for (const item of items) {
      // Titel und Datum aus "<title>26.02.2026: BANDNAME</title>"
      const titleMatch = item.match(/<title>([^<]+)<\/title>/)
      if (!titleMatch) continue
      const rawTitle = titleMatch[1].trim()

      // Datum vom Anfang des Titels trennen
      const dateMatch = rawTitle.match(/^(\d{2})\.(\d{2})\.(\d{4}):\s*(.+)$/)
      if (!dateMatch) continue
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      const title = dateMatch[4].trim()

      if (date < today()) continue

      // Uhrzeit aus der Beschreibung
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/)
      const descRaw = descMatch ? descMatch[1] : ''
      const desc = descRaw
        .replace(/&lt;br&gt;/gi, ' ')
        .replace(/&lt;[^&]+&gt;/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
        .substring(0, 300)

      const timeMatch = descRaw.match(/(\d{2}:\d{2})\s*Uhr/)
      const time = timeMatch ? timeMatch[1] : '20:00'

      // Genre erkennen für Party vs Konzert
      const genreMatch = descRaw.match(/\[([^\]]+)\]/)
      const genre = genreMatch ? genreMatch[1].toLowerCase() : ''
      const type = genre.includes('party') || genre.includes('club') || genre.includes('dj') ? 'party' : 'konzert'

      // Ticket-URL
      const linkMatch = item.match(/<link>([^<]+)<\/link>/)
      const ticketUrl = linkMatch ? linkMatch[1].trim() : ''

      events.push({ title, date, time, locationId: 13, type, description: desc, ticketUrl, spotifyUrl: '', source: 'conne-island' })
    }

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeWerk2() {
  console.log('📡 Werk 2 Leipzig...')
  try {
    const res = await fetch('https://www.werk-2.de/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const currentYear = new Date().getFullYear()

    $('li').each((_, el) => {
      const tag = $(el).find('.tag').first().text().trim()
      const wochentag = $(el).find('.wochentag').first().text().trim()
      if (!tag || !wochentag) return

      const title = $(el).find('h2 a').first().text().trim()
      if (!title) return

      const kurzinfo = $(el).find('.kurzinfos p').first().text().trim()
      const timeMatch = kurzinfo.match(/(\d{1,2}:\d{2})\s*Uhr/)
      const time = timeMatch ? timeMatch[1].padStart(5, '0') : '20:00'

      const ticketUrl = $(el).find('.btn_tickets a').first().attr('href') || ''
      const genre = $(el).find('.typen').first().text().trim()
      const type = genre.toLowerCase().includes('party') || genre.toLowerCase().includes('dj') ? 'party' : 'konzert'

      // Datum aus dem Link extrahieren z.B. /programm/2026-03-04_sampagne
      const link = $(el).find('h2 a').first().attr('href') || ''
      const dateFromLink = link.match(/(\d{4}-\d{2}-\d{2})/)
      let date = dateFromLink ? dateFromLink[1] : null

      if (!date) return
      if (date < today()) return

      events.push({
        title, date, time,
        locationId: 14,
        type,
        description: genre,
        ticketUrl,
        spotifyUrl: '',
        source: 'werk2'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeLido() {
  console.log('📡 Lido Berlin...')
  try {
    const res = await fetch('https://www.lido-berlin.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const seen = new Set()

    $('a[href*="/events/20"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const dateMatch = href.match(/\/events\/(\d{4}-\d{2}-\d{2})-/)
      if (!dateMatch) return
      const date = dateMatch[1]
      if (date < today()) return

      const lines = []
      $(el).find('[class*="board-line"], [class*="boad-line"]').each((_, line) => {
        const text = $(line).text().trim()
        if (text) lines.push(text)
      })
      const title = lines.join(' · ').trim() || $(el).text().replace(/\s+/g, ' ').trim()
      if (!title) return

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      const container = $(el).closest('[class*="event"]')
      const timeText = container.find('[class*="time"]').first().text().trim()
      const timeMatch = timeText.match(/\d{2}:\d{2}/)
      const time = timeMatch ? timeMatch[0] : '20:00'

      const type = title.toLowerCase().includes('party') ||
                   title.toLowerCase().includes('nacht') ||
                   title.toLowerCase().includes('pop hits') ? 'party' : 'konzert'

      events.push({
        title, date, time,
        locationId: 1,
        type,
        description: '',
        ticketUrl: 'https://www.lido-berlin.de' + href,
        spotifyUrl: '',
        source: 'lido'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeFestsaal() {
  console.log('📡 Festsaal Kreuzberg...')
  try {
    const res = await fetch('https://www.festsaal-kreuzberg.de/programm/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    $('article, .event, .programm-item, .show').each((_, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim()
      const dateRaw = $(el).find('time, .date, .datum').first().attr('datetime') ||
                      $(el).find('time, .date, .datum').first().text().trim()
      const timeRaw = $(el).find('.time, .uhrzeit').first().text().trim()
      const date = parseGermanDate(dateRaw)
      if (!title || !date || date < today()) return
      events.push({
        title, date,
        time: parseTime(timeRaw),
        locationId: 3,
        type: detectType(title, description),
        description: '',
        ticketUrl: '',
        spotifyUrl: '',
        source: 'festsaal'
      })
    })
    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeTaeubchenthal() {
  console.log('📡 Täubchenthal Leipzig...')
  try {
    const res = await fetch('https://www.taeubchenthal.com/programm/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    $('article, .event, .programm-item, .concert').each((_, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim()
      const dateRaw = $(el).find('time, .date, .datum').first().attr('datetime') ||
                      $(el).find('time, .date, .datum').first().text().trim()
      const timeRaw = $(el).find('.time, .uhrzeit').first().text().trim()
      const date = parseGermanDate(dateRaw)
      if (!title || !date || date < today()) return
      const type = title.toLowerCase().includes('party') ? 'party' : 'konzert'
      events.push({
        title, date,
        time: parseTime(timeRaw),
        locationId: 15,
        type,
        description: '',
        ticketUrl: $(el).find('a[href*="ticket"], a[href*="eventim"], a[href*="tixforgigs"]').first().attr('href') || 'https://www.taeubchenthal.com/programm/',
        spotifyUrl: '',
        source: 'taeubchenthal'
      })
    })
    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeFelsenkeller() {
  console.log('📡 Felsenkeller Leipzig...')
  try {
    const res = await fetch('https://www.felsenkeller-leipzig.com/wp-json/wp/v2/posts?per_page=50&_fields=title,date,link,content', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const posts = await res.json()
    const events = []

    for (const post of posts) {
      const title = post.title?.rendered?.trim()
      if (!title) continue

      const content = post.content?.rendered || ''
      const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

      // Datum aus Content extrahieren: "20. März 2026" oder "20.03.2026" oder "20. März •"
      let date = null
      const months = { januar:1,februar:2,märz:3,april:4,mai:5,juni:6,juli:7,august:8,september:9,oktober:10,november:11,dezember:12 }

      // Format: "20. März 2026" oder "20. März •"
      const germanDate = plainText.match(/(\d{1,2})\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(?:•|,|·|20(\d{2}))/i)
      if (germanDate) {
        const day = germanDate[1].padStart(2,'0')
        const monthNum = months[germanDate[2].toLowerCase()]
        const year = germanDate[3] ? '20' + germanDate[3] : new Date().getFullYear().toString()
        date = `${year}-${String(monthNum).padStart(2,'0')}-${day}`
      }

      // Format: "20.03.2026"
      if (!date) {
        const dotDate = plainText.match(/(\d{2})\.(\d{2})\.(202\d)/)
        if (dotDate) date = `${dotDate[3]}-${dotDate[2]}-${dotDate[1]}`
      }

      if (!date || date < today()) continue

      // Uhrzeit
      const timeMatch = plainText.match(/(\d{1,2}):(\d{2})\s*Uhr/i)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'

      // Ticket-URL
      const ticketMatch = content.match(/href="(https?:\/\/[^"]*ticket[^"]*)"/)
      const ticketUrl = ticketMatch ? ticketMatch[1] : post.link

      // Party oder Konzert
      const lower = (title + ' ' + plainText).toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('disco') || lower.includes('tanzen') ? 'party' : lower.includes('flohmarkt') || lower.includes('brunch') || lower.includes('lesung') || lower.includes('quiz') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'

      events.push({
        title, date, time,
        locationId: 16,
        type,
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'felsenkeller'
      })
    }

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeSO36() {
  console.log('📡 SO36 Berlin...')
  try {
    const res = await fetch('https://www.so36.com/tickets.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)', 'Accept': 'application/json' }
    })
    const data = await res.json()
    const events = []

    for (const p of data.products) {
      if (p.type !== 'Ticket') continue
      const date = p.valid_start_on
      if (!date || date < today()) continue

      const time = p.time_begin || p.time_open || '20:00'
      const supertitle = (p.supertitle || '').toLowerCase()
      const type = supertitle.includes('party') || supertitle.includes('event') ||
                   supertitle.includes('club') || supertitle.includes('dj')
                   ? 'party' : 'konzert'

      events.push({
        title: p.title,
        date,
        time: time.substring(0, 5),
        locationId: 2,
        type,
        description: p.subtitle || '',
        ticketUrl: 'https://www.so36.com' + p.url,
        spotifyUrl: '',
        source: 'so36'
      })
    }

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeUTConnewitz() {
  console.log('📡 UT Connewitz...')
  try {
    const res = await fetch('https://www.utconnewitz.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []

    // Aktuellen Monat und Jahr ermitteln
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() + 1

    // Monatsname aus der Seite lesen
    const monthNames = { januar:1,februar:2,märz:3,april:4,mai:5,juni:6,juli:7,august:8,september:9,oktober:10,november:11,dezember:12 }
    const monthHeading = $('h1, h2, h3, .month, .monat').first().text().toLowerCase()
    for (const [name, num] of Object.entries(monthNames)) {
      if (monthHeading.includes(name)) { month = num; break }
    }

    $('.event').each((_, el) => {
      const dayText = $(el).find('.day').first().text().trim()
      const day = parseInt(dayText)
      if (!day || isNaN(day)) return

      const titleEl = $(el).find('.title-title').first()
      const title = titleEl.text().trim()
      if (!title) return

      const timeEl = $(el).find('.title-time').first().text()
      const timeMatch = timeEl.match(/(\d{1,2})\s*Uhr/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:00` : '20:00'

      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return

      // Ticket-URL
      const ticketLink = $(el).find('a[href*="tixforgigs"], a[href*="ticket"]').first().attr('href') || ''

      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'

      events.push({
        title, date, time,
        locationId: 17,
        type,
        description: '',
        ticketUrl: ticketLink,
        spotifyUrl: '',
        source: 'ut-connewitz'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeColumbia() {
  console.log('📡 Columbia Theater Berlin...')
  try {
    const res = await fetch('https://www.columbia-theater.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const seen = new Set()

    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const dateMatch = href.match(/\/event\/(\d{4})(\d{2})(\d{2})-/)
      if (!dateMatch) return
      const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      if (date < today()) return
      if (seen.has(href)) return
      seen.add(href)

      const title = $(el).find('.item-title, h2, h3, .title').first().text().trim() ||
                    href.split('/event/')[1].replace(/^\d{8}-/, '').replace(/-/g, ' ').replace(/\/$/, '')

      const timeText = $(el).find('.item-time, .time, .uhrzeit').first().text().trim()
      const timeMatch2 = timeText.match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch2 ? `${timeMatch2[1].padStart(2,'0')}:${timeMatch2[2]}` : '20:00'

      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('club night') ? 'party' : 'konzert'

      events.push({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        date, time,
        locationId: 10,
        type,
        description: '',
        ticketUrl: href,
        spotifyUrl: '',
        source: 'columbia'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapePrivatclub() {
  console.log('📡 Privatclub Berlin...')
  try {
    const res = await fetch('https://www.privatclub-berlin.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const months = { januar:1,februar:2,märz:3,april:4,mai:5,juni:6,juli:7,august:8,september:9,oktober:10,november:11,dezember:12 }

    $('.event_wrapper').each((_, el) => {
      const title = $(el).find('.titel').first().text().trim()
      if (!title) return

      const part1 = $(el).find('.datum_part1').first().text().trim()
      const part2 = $(el).find('.datum_part2').first().text().trim().toLowerCase()
      const einlass = $(el).find('.einlass').first().text().trim()

      const dayMatch = part1.match(/(\d{1,2})\./)
      const day = dayMatch ? parseInt(dayMatch[1]) : null
      const month = months[part2]
      if (!day || !month) return

      const year = new Date().getFullYear()
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return

      const timeMatch = einlass.match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'

      const ticketUrl = $(el).find('a.ticketlink').first().attr('href') || ''
      const genreText = $(el).find('.typ.typdesktop').first().text().trim().toLowerCase()
      const type = genreText.includes('party') || genreText.includes('dj') || genreText.includes('club') ? 'party' : 'konzert'

      events.push({
        title, date, time,
        locationId: 4,
        type,
        description: $(el).find('.untertitel').first().text().trim(),
        ticketUrl,
        spotifyUrl: '',
        source: 'privatclub'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeAstra() {
  console.log('📡 Astra Kulturhaus Berlin...')
  try {
    const res = await fetch('https://www.astra-berlin.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const seen = new Set()

    $('a[href*="/events/20"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const dateMatch = href.match(/\/events\/(\d{4}-\d{2}-\d{2})-/)
      if (!dateMatch) return
      const date = dateMatch[1]
      if (date < today()) return
      if (seen.has(href)) return
      seen.add(href)

      const lines = []
      $(el).find('[class*="board-line"], [class*="boad-line"]').each((_, line) => {
        const text = $(line).text().trim()
        if (text) lines.push(text)
      })
      const title = lines.join(' · ').trim() || $(el).text().replace(/\s+/g, ' ').trim()
      if (!title) return

      const container = $(el).closest('[class*="event"]')
      const timeText = container.find('[class*="time"]').first().text().trim()
      const timeMatch2 = timeText.match(/\d{2}:\d{2}/)
      const time = timeMatch2 ? timeMatch2[0] : '20:00'

      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('nacht') || lower.includes('club') ? 'party' : 'konzert'

      events.push({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        date, time,
        locationId: 5,
        type,
        description: '',
        ticketUrl: 'https://www.astra-berlin.de' + href,
        spotifyUrl: '',
        source: 'astra'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeSchokoladen() {
  console.log('📡 Schokoladen Berlin...')
  try {
    const res = await fetch('https://www.schokoladen-mitte.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []

    $('[data-event-date]').each((_, el) => {
      const date = $(el).attr('data-event-date')
      if (!date || date < today()) return

      // Titel aus dem zugehörigen Event-Container holen
      const container = $(el).closest('.event, [class*="event"]')
      const title = container.find('h2').first().text().trim()
      if (!title) return

      // Uhrzeit
      const timeText = container.find('.d-none, .event-date').text()
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*Uhr/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'

      // Kategorie
      const category = container.find('.category').first().text().trim().toLowerCase()
      const type = category.includes('party') || category.includes('dj') ? 'party' : 'konzert'

      // Ticket-URL
      const ticketLink = container.find('a[href*="ticket"], a[href*="shop"]').first().attr('href') || ''

      events.push({
        title, date, time,
        locationId: 11,
        type,
        description: '',
        ticketUrl: ticketLink,
        spotifyUrl: '',
        source: 'schokoladen'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeHornsErben() {
  console.log('📡 Horns Erben Leipzig...')
  try {
    const res = await fetch('https://www.horns-erben.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []

    $('#home-news tbody tr').each((_, el) => {
      const cells = $(el).find('td')
      if (cells.length < 2) return

      const dateTimeText = $(cells[0]).text().trim()
      const dateMatch = dateTimeText.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return

      const timeMatch = dateTimeText.match(/(\d{1,2}):(\d{2})\s*Uhr/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'

      const title = $(cells[1]).find('a').first().text().trim()
      const ticketUrl = $(cells[1]).find('a').first().attr('href') || ''
      if (!title) return

      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'

      events.push({
        title, date, time,
        locationId: 19,
        type,
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'horns-erben'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeUrbanSpree() {
  console.log('📡 Urban Spree Berlin...')
  try {
    const urls = [
      'https://www.urbanspree.com/program/concerts/',
      'https://www.urbanspree.com/program/parties/',
      'https://www.urbanspree.com/program/arts/',
    ]
    const events = []
    const seen = new Set()

    for (const url of urls) {
      const isParty = url.includes('parties')
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
      const html = await res.text()
      const $ = cheerio.load(html)

      $('a').each((_, el) => {
        const text = $(el).text().trim()
        const dateMatch = text.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)
        if (!dateMatch) return
        const months = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12}
        const month = months[dateMatch[1]]
        if (!month) return
        const date = `${dateMatch[3]}-${String(month).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`
        if (date < today()) return
        const timeMatch = text.match(/(\d{2}):(\d{2})/)
        const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '20:00'
        const titleEl = $(el).find('h2, h3, h4, strong').first()
        const title = titleEl.text().trim() || text.split('\n')[0].trim()
        if (!title || title.length < 3) return
        const key = date + title
        if (seen.has(key)) return
        seen.add(key)

        const href = $(el).attr('href') || ''
        const ticketUrl = href ? 'https://www.urbanspree.com/' + href : ''

        events.push({
          title, date, time,
          locationId: 21,
          type: isParty ? 'party' : 'konzert',
          description: '',
          ticketUrl,
          spotifyUrl: '',
          source: 'urbanspree'
        })
      })
    }

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeGretchen() {
  console.log('📡 Gretchen Berlin...')
  try {
    const res = await fetch('https://www.gretchen-club.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const seen = new Set()

    $('h2').each((_, el) => {
      const titleEl = $(el)
      const title = titleEl.text().trim()
      if (!title) return
      // Datum aus vorherigem Text-Knoten suchen
      const section = titleEl.closest('div, section, article').parent()
      const fullText = section.text()
      const dateMatch = fullText.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return
      const timeMatch = fullText.match(/Doors:\s*(\d{1,2})[\.:](\d{2})/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      if (seen.has(date + title)) return
      seen.add(date + title)
      const href = titleEl.find('a[href*="detail.php"]').first().attr('href') || titleEl.closest('a').attr('href') || ''
      const ticketUrl = href ? (href.startsWith('http') ? href : 'https://www.gretchen-club.de/' + href) : ''
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('club') ? 'party' : 'konzert'

      events.push({
        title, date, time,
        locationId: 22,
        type,
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'gretchen'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeSupamolly() {
  console.log('📡 Supamolly Berlin...')
  try {
    const res = await fetch('https://www.supamolly.de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []

    $('tr.event').each((_, el) => {
      const id = $(el).attr('id') || ''
      const idMatch = id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/)
      if (!idMatch) return
      const date = `${idMatch[1]}-${idMatch[2]}-${idMatch[3]}`
      const time = `${idMatch[4]}:${idMatch[5]}`
      if (date < today()) return

      const titles = []
      $(el).find('.tit b').each((_, t) => {
        const text = $(t).clone().children().remove().end().text().trim()
        if (text) titles.push(text)
      })
      const title = titles.join(' + ')
      if (!title) return

      const description = $(el).find('.beschr').first().text().trim()
      const ticketUrl = 'https://www.supamolly.de/index.php?programm=' + id

      events.push({
        title, date, time,
        locationId: 23,
        type: detectType(title, description),
        description,
        ticketUrl,
        spotifyUrl: '',
        source: 'supamolly'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeKantine() {
  console.log('📡 Kantine am Berghain...')
  try {
    const res = await fetch('https://www.berghain.berlin/de/program/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const seen = new Set()

    $('a[href*="/de/event/"]').each((_, el) => {
      const venue = $(el).find('span').first().text().trim()
      if (!venue.toLowerCase().includes('kantine')) return

      const dateEl = $(el).find('time[datetime]').last()
      const date = dateEl.attr('datetime')
      if (!date || date < today()) return

      const title = $(el).find('h4').first().text().trim()
      if (!title) return
      if (seen.has(date + title)) return
      seen.add(date + title)

      const href = $(el).attr('href')
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('club') ? 'party' : 'konzert'

      events.push({
        title, date,
        time: '20:00',
        locationId: 24,
        type,
        description: venue,
        ticketUrl: 'https://www.berghain.berlin' + href,
        spotifyUrl: '',
        source: 'kantine'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeTempodrom() {
  console.log('📡 Tempodrom Berlin...')
  try {
    const res = await fetch('https://www.tempodrom.de/programm-und-tickets/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const events = []
    const seen = new Set()

    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const dateMatch = href.match(/(\d{4}-\d{2}-\d{2})_(\d{2})\/?$/) ||
                        href.match(/(\d{4}-\d{2}-\d{2})_\d{4}-\d{2}-\d{2}_(\d{2})\/?$/)
      if (!dateMatch) return
      const date = dateMatch[1]
      if (date < today()) return

      const time = dateMatch[2] ? `${dateMatch[2]}:00` : '20:00'
      const title = $(el).attr('title') || $(el).text().trim()
      if (!title) return
      if (seen.has(date + title)) return
      seen.add(date + title)

      events.push({
        title, date, time,
        locationId: 25,
        type: detectType(title, description),
        description: '',
        ticketUrl: 'https://www.tempodrom.de' + href,
        spotifyUrl: '',
        source: 'tempodrom'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
    return events
  } catch(e) {
    console.log(`  ✗ Fehler: ${e.message}`)
    return []
  }
}

async function scrapeHeimathafen() {
  console.log('📡 Heimathafen Neukölln (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    for (const month of [3,4,5,6,9,10,11,12]) {
      await page.goto(`https://heimathafen-neukoelln.de/?syear=2026&smonth=${month}&scat=6&sview=list`, { waitUntil: 'networkidle2', timeout: 30000 })
      const html = await page.content()
      const $ = cheerio.load(html)
      $('.eventgrid__item').each((_, el) => {
        const title = $(el).find('h4 a').first().text().trim()
        const dateText = $(el).find('.eventgrid__item__start__date').text().trim()
        const timeText = $(el).find('.eventgrid__item__start__time').text().trim()
        if (!title || !dateText) return
        const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
        if (!dateMatch) return
        const date = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/)
        const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'
        events.push({ title, date, time, type: detectType(title), locationId: 26, source: 'heimathafen' })
      })
      await new Promise(r => setTimeout(r, 1000))
    }
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log('  ✗ Heimathafen:', e.message) }
  finally { if (browser) await browser.close() }
  return events
}

async function scrapeBiNuu() {
  console.log('📡 Bi Nuu Berlin...')
  const events = []
  try {
    const res = await fetch('https://binuu.de/de/events', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    $('article, .event, [class*="event"]').each((_, el) => {
      const dateText = $(el).find('[class*="date"], time').first().text().trim()
      const title = $(el).find('h2, h3, [class*="title"]').first().text().trim()
      const timeText = $(el).find('[class*="time"]').first().text().trim()
      if (!title || !dateText) return
      const dateMatch = dateText.match(/(\d{1,2})\.(\d{2})\./)
      if (!dateMatch) return
      const date = `2026-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      events.push({ title, date, time, type: detectType(title), locationId: 27, source: 'binuu', ticketUrl: 'https://binuu.de/de/events', spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log('  ✗ Bi Nuu:', e.message) }
  return events
}

async function scrapeMikropol() {
  console.log('📡 Mikropol Berlin (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://mikropol-berlin.de/events/', { waitUntil: 'networkidle2', timeout: 30000 })
    const html = await page.content()
    const $ = cheerio.load(html)
    $('.em-events-list a.event').each((_, el) => {
      const title = $(el).find('.eventname').text().trim()
      const dateText = $(el).find('.date').text().trim()
      const timeText = $(el).find('.start span').text().trim()
      if (!title || !dateText) return
      const dateMatch = dateText.match(/(\d{1,2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      events.push({ title, date, time, type: detectType(title), locationId: 28, source: 'mikropol' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log('  ✗ Mikropol:', e.message) }
  finally { if (browser) await browser.close() }
  return events
}
async function scrapeFrannz() {
  console.log('📡 Frannz Club Berlin...')
  const events = []
  try {
    const res = await fetch('https://frannz.eu/programm/', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    $('.event, article, [class*="event"], [class*="programm"]').each((_, el) => {
      const title = $(el).find('h2, h3, h4, .title, [class*="title"]').first().text().trim()
      const dateText = $(el).find('[class*="date"], time, .datum').first().text().trim()
      const timeText = $(el).find('[class*="time"], [class*="uhrzeit"]').first().text().trim()
      if (!title || !dateText) return
      const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/) || dateText.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (!dateMatch) return
      const date = dateText.includes('-') ? dateText.substring(0,10) : `${dateMatch[3]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
      if (date < today()) return
      const timeMatch = timeText.match(/(\d{1,2})[:.h](\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('nacht') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 6, source: 'frannz', ticketUrl: 'https://frannz.eu/programm/', spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Frannz: ${e.message}`) }
  return events
}

async function scrapeMonarch() {
  console.log('📡 Monarch Berlin...')
  const events = []
  try {
    const res = await fetch('https://kottimonarch.de/programm.php', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()
    const allBold = $('b, strong').toArray()
    for (let i = 0; i < allBold.length; i++) {
      const text = $(allBold[i]).text().trim()
      const dateMatch = text.match(/(\w+)\s+(\d{2})\/(\d{2})\/(\d{4})-(\d{2}):(\d{2})/)
      if (!dateMatch) continue
      const date = `${dateMatch[4]}-${dateMatch[3]}-${dateMatch[2]}`
      const time = `${dateMatch[5]}:${dateMatch[6]}`
      if (date < today()) continue
      // Titel steht im nächsten b/strong Element
      const nextBold = allBold[i + 1]
      if (!nextBold) continue
      const title = $(nextBold).text().replace(/\(KONZERT\)|\(PARTY\)/gi, '').trim()
      if (!title || seen.has(date + title)) continue
      seen.add(date + title)
      const ticketLink = $(allBold[i]).parent().find('a').first().attr('href') || ''
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('night') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 7, source: 'monarch', ticketUrl: ticketLink, spotifyUrl: '' })
    }
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Monarch: ${e.message}`) }
  return events
}

async function scrapeMadameClaude() {
  console.log('📡 Madame Claude Berlin...')
  const events = []
  try {
    const res = await fetch('https://madameclaude.de/events/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } })
    if (res.ok) {
      const html = await res.text()
      const $ = cheerio.load(html)
      $('h4, h3').each((_, el) => {
        const text = $(el).text().trim()
        const dateMatch = text.match(/^(\d{2})\/(\d{2})/)
        if (!dateMatch) return
        const year = new Date().getFullYear()
        const month = parseInt(dateMatch[2])
        const currentMonth = new Date().getMonth() + 1
        const eventYear = month < currentMonth - 1 ? year + 1 : year
        const date = `${eventYear}-${String(month).padStart(2,'0')}-${dateMatch[1]}`
        if (date < today()) return
        const title = text.replace(/^\d{2}\/\d{2}\s+\w+\s+-\s+/, '').trim()
        if (!title) return
        const href = $(el).closest('a').attr('href') || $(el).find('a').attr('href') || $(el).parent('a').attr('href') || ''
        const lower = title.toLowerCase()
        const type = lower.includes('party') || lower.includes('dj') || lower.includes('quiz') ? 'party' : 'konzert'
        events.push({ title, date, time: '19:00', type, locationId: 12, source: 'madame-claude', ticketUrl: href, spotifyUrl: '' })
      })
    }
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Madame Claude: ${e.message}`) }
  return events
}

async function scrapeIlsesErika() {
  console.log('📡 Ilses Erika Leipzig...')
  const events = []
  try {
    const res = await fetch('https://www.ilseserika.de/termine.html', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()
    $('*').each((_, el) => {
      const text = $(el).children().length === 0 ? $(el).text().trim() : ''
      const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return
      const timeMatch = text.match(/(\d{2}):(\d{2})\s*Uhr/)
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '20:00'
      const parent = $(el).parent()
      const title = parent.find('strong, b, h3, h4, [class*="title"]').first().text().trim() || parent.text().replace(text,'').trim().split('\n')[0].trim()
      if (!title || title.length < 3 || seen.has(date + title)) return
      seen.add(date + title)
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('nacht') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 20, source: 'ilses-erika', ticketUrl: 'https://www.ilseserika.de', spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Ilses Erika: ${e.message}`) }
  return events
}

async function scrapeKesselhaus() {
  console.log('📡 Kesselhaus Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.kesselhaus.net/de/calendar', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Januar:1, Februar:2, März:3, April:4, Mai:5, Juni:6, Juli:7, August:8, September:9, Oktober:10, November:11, Dezember:12 }
    const seen = new Set()
    $('a[href*="/calendar/"]').each((_, el) => {
      const text = $(el).text().trim()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 4) return
      const day = parseInt(lines[1])
      const monthName = lines[2]
      const month = months[monthName]
      if (!day || !month) return
      const year = new Date().getFullYear()
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return
      const timeMatch = lines[3].match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      // Titel: alles nach der Uhrzeit
      const titleIdx = lines.findIndex(l => l.match(/^\d{1,2}:\d{2}$/))
      const title = lines.slice(titleIdx + 1).filter(l => !['Kesselhaus','Maschinenhaus','Club23','Konzert','Party','Weitere','Theater','Kinder','Comedy','Tanz','Lesung'].includes(l)).join(' ').trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const href = $(el).attr('href') || ''
      const ticketUrl = href ? 'https://www.kesselhaus.net' + href : ''
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('90er') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 29, source: 'kesselhaus', ticketUrl, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Kesselhaus: ${e.message}`) }
  return events
}

async function scrapeMetropol() {
  console.log('📡 Metropol Berlin...')
  const events = []
  try {
    const res = await fetch('https://metropol-berlin.de/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Januar:1, Februar:2, März:3, April:4, Apr:4, Mai:5, Juni:6, Juli:7, August:8, Sep:9, September:9, Oktober:10, Nov:11, November:11, Dez:12, Dezember:12 }
    const seen = new Set()
    $('li').each((_, el) => {
      const text = $(el).text().trim()
      const dateMatch = text.match(/(\d{1,2})\s*\/\s*(\w+\.?)\s+(\d{4})\s+(\d{1,2}):(\d{2})/)
      if (!dateMatch) return
      const month = months[dateMatch[2].replace('.','')]
      if (!month) return
      const date = `${dateMatch[3]}-${String(month).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
      if (date < today()) return
      const time = `${String(dateMatch[4]).padStart(2,'0')}:${dateMatch[5]}`
      const title = $(el).find('h2').first().text().trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const href = $(el).find('a[href*="/event/"]').first().attr('href') || ''
      const cat = $(el).find('a[href*="/categories/"]').first().text().trim().toLowerCase()
      const type = cat === 'party' ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 25, source: 'metropol', ticketUrl: href, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Metropol: ${e.message}`) }
  return events
}

async function scrapeHuxleys() {
  console.log('📡 Huxleys Neue Welt Berlin...')
  const events = []
  try {
    const res = await fetch('https://huxleysneuewelt.de/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Januar:1, Februar:2, März:3, April:4, Apr:4, Mai:5, Juni:6, Juli:7, August:8, Sep:9, September:9, Oktober:10, Okt:10, Nov:11, November:11, Dez:12, Dezember:12 }
    const seen = new Set()
    $('li').each((_, el) => {
      const link = $(el).find('a[href*="/event/"]').first()
      if (!link.length) return
      const text = $(el).text().trim()
      const dayMatch = text.match(/^(\d{1,2})(\w+)/)
      if (!dayMatch) return
      const day = parseInt(dayMatch[1])
      const monthName = dayMatch[2]
      const month = months[monthName]
      if (!month) return
      const year = new Date().getFullYear() + (month < new Date().getMonth() + 1 ? 1 : 0)
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return
      const timeMatch = text.match(/Beginn:\s*(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      const title = link.text().trim().split('\n')[0].trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const href = link.attr('href') || ''
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
      events.push({ title, date, time, type, locationId: 31, source: 'huxleys', ticketUrl: href, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Huxleys: ${e.message}`) }
  return events
}

async function scrapeColumbiahalle() {
  console.log('📡 Columbiahalle Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.columbiahalle.berlin/veranstaltungen.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Januar:1, Februar:2, März:3, April:4, Mai:5, Juni:6, Juli:7, August:8, September:9, Oktober:10, November:11, Dezember:12 }
    let currentMonth = 0
    let currentYear = new Date().getFullYear()
    const seen = new Set()
    $('h1, h2').each((_, el) => {
      const text = $(el).text().trim()
      // Monatsüberschrift
      const monthMatch = text.match(/^(\w+)\s+(\d{4})$/)
      if (monthMatch) {
        currentMonth = months[monthMatch[1]] || currentMonth
        currentYear = parseInt(monthMatch[2])
        return
      }
      // Event-Titel
      if ($(el).is('h2') && currentMonth) {
        const title = text
        if (!title || title.length < 2) return
        // Tag aus vorherigem Element
        const dayEl = $(el).closest('div, section, article').prev()
        const dayText = dayEl.text().trim()
        const dayMatch = dayText.match(/(\d{1,2})$/) || $(el).parent().prev().text().trim().match(/(\d{1,2})/)
        if (!dayMatch) return
        const day = parseInt(dayMatch[1])
        const date = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        if (date < today()) return
        // Uhrzeit
        const container = $(el).closest('div, section, article, li')
        const timeMatch = container.text().match(/Beginn:\s*(\d{1,2}):(\d{2})/)
        const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
        const ticketLink = container.find('a[href*="ticket"], a[href*="eventim"], a[href*="loft"]').first().attr('href') || ''
        if (seen.has(date + title)) return
        seen.add(date + title)
        const lower = title.toLowerCase()
        const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
        events.push({ title, date, time, type, locationId: 32, source: 'columbiahalle', ticketUrl: ticketLink, spotifyUrl: '' })
      }
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Columbiahalle: ${e.message}`) }
  return events
}

async function scrapeUberEatsMusicHall() {
  console.log('📡 Uber Eats Music Hall Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.uber-eats-music-hall.de/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Jan:1, Feb:2, Mär:3, Apr:4, Mai:5, Jun:6, Jul:7, Aug:8, Sep:9, Okt:10, Nov:11, Dez:12 }
    const seen = new Set()
    $('a[href*="/events/detail/"]').each((_, el) => {
      const text = $(el).text().trim()
      const title = $(el).find('h2').first().text().trim()
      if (!title) return
      // Datum aus Text extrahieren z.B. "Donnerstag, 01. Okt. 2026, 20:00 Uhr"
      const dateMatch = text.match(/(\d{1,2})\.\s*(\w+)\.?\s+(\d{4})/)
      if (!dateMatch) return
      const month = months[dateMatch[2].substring(0,3)]
      if (!month) return
      const date = `${dateMatch[3]}-${String(month).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
      if (date < today()) return
      const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*Uhr/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      if (seen.has(date + title)) return
      seen.add(date + title)
      const href = $(el).attr('href') || ''
      const ticketUrl = href.startsWith('http') ? href : 'https://www.uber-eats-music-hall.de' + href
      events.push({ title, date, time, type: detectType(title, description), locationId: 33, source: 'uber-eats-music-hall', ticketUrl, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Uber Eats Music Hall: ${e.message}`) }
  return events
}

async function scrapeTrinity() {
  console.log('📡 Trinity Music Berlin...')
  const events = []
  try {
    const res = await fetch('https://trinitymusic.de/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const locationMap = {
      'Lido': 1, 'SO36': 2, 'Festsaal Kreuzberg': 3, 'Privatclub': 4,
      'Astra Kulturhaus': 5, 'Frannz': 6, 'Monarch': 7,
      'Columbia Theater': 10, 'Schokoladen': 11, 'Madame Claude': 12,
      'Urban Spree': 21, 'Gretchen': 22, 'Supamolly': 23,
      'Kantine am Berghain': 24, 'Tempodrom': 25,
      'Heimathafen': 26, 'Bi Nuu': 27, 'Mikropol': 28,
      'Kesselhaus': 29, 'Metropol': 30, 'Huxleys Neue Welt': 31,
      'Columbiahalle': 32, 'Uber Eats Music Hall': 33, 'Hole⁴⁴': 34, 'Hole44': 34, 'Badehaus': 35, 'Cassiopeia': 36,
      'Quasimodo': 37, 'Prachtwerk': 38, 'LARK': 39,
    }
    const months = { Januar:1, Februar:2, März:3, April:4, Mai:5, Juni:6, Juli:7, August:8, September:9, Oktober:10, November:11, Dezember:12 }
    const seen = new Set()
    $('a[href*="/event/"]').each((_, el) => {
      const lines = $(el).text().trim().split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 4) return
      const day = parseInt(lines[0])
      const month = months[lines[1]]
      const year = parseInt(lines[2])
      if (!day || !month || !year) return
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return
      const title = lines[3]
      const locationName = lines[4] || ''
      // Nur bekannte Locations
      const locationId = Object.entries(locationMap).find(([k]) => locationName.includes(k))?.[1]
      if (!locationId) return
      if (seen.has(date + title)) return
      seen.add(date + title)
      const href = $(el).attr('href') || ''
      const ticketUrl = href.startsWith('http') ? href : 'https://trinitymusic.de' + href
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
      events.push({ title, date, time: '20:00', type, locationId, source: 'trinity', ticketUrl, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Trinity: ${e.message}`) }
  return events
}

async function scrapeHole44() {
  console.log('📡 Hole44 Berlin...')
  const events = []
  try {
    const res = await fetch('https://hole-berlin.de/events/', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Januar:1, Februar:2, März:3, April:4, Apr:4, Mai:5, Juni:6, Juli:7, August:8, Sep:9, September:9, Oktober:10, Okt:10, Nov:11, November:11, Dez:12, Dezember:12 }
    const seen = new Set()
    $('li').each((_, el) => {
      const link = $(el).find('a[href*="/event/"]').first()
      if (!link.length) return
      const text = $(el).text().trim()
      const dayMatch = text.match(/^(\d{1,2})/)
      if (!dayMatch) return
      const day = parseInt(dayMatch[1])
      const monthMatch = text.match(/(\w+\.?)\s+\d{4}/)
      if (!monthMatch) return
      const month = months[monthMatch[1].replace('.','')]
      if (!month) return
      const yearMatch = text.match(/\d{4}/)
      const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear()
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      const title = link.text().trim().split('\n')[0].trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
      events.push({ title, date, time, type, locationId: 34, source: 'hole44', ticketUrl: link.attr('href') || '', spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Hole44: ${e.message}`) }
  return events
}

async function scrapeBadehaus() {
  console.log('📡 Badehaus Berlin...')
  const events = []
  try {
    const res = await fetch('https://badehaus-berlin.com/concerts/', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()
    $('a[href*="/events/"]').each((_, el) => {
      const text = $(el).text().trim()
      const dateMatch = text.match(/(\w+)\.\s+(\d{2})\.(\d{2})\.(\d{4})\s*\|\s*(\d{1,2}):(\d{2})/)
      if (!dateMatch) return
      const date = `${dateMatch[4]}-${dateMatch[3]}-${dateMatch[2]}`
      if (date < today()) return
      const time = `${String(dateMatch[5]).padStart(2,'0')}:${dateMatch[6]}`
      const title = $(el).find('h2, h3, strong, .title').first().text().trim() || text.replace(/.*UHR\s*/,'').split('\n')[0].trim()
      if (!title || title.length < 2 || seen.has(date + title)) return
      seen.add(date + title)
      const href = $(el).attr('href') || ''
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('nacht') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 35, source: 'badehaus', ticketUrl: href, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Badehaus: ${e.message}`) }
  return events
}

async function scrapeCassiopeia() {
  console.log('📡 Cassiopeia Berlin...')
  const events = []
  try {
    const res = await fetch('https://cassiopeia-berlin.de/club', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()
    $('a[href*="/event/"], a[href*="/club/"]').each((_, el) => {
      const text = $(el).text().trim()
      const dateMatch = text.match(/(\w{2,3})\s*·?\s*(\d{1,2})\s*·?\s*(\d{2})\s*·?\s*\|/)
      if (!dateMatch) return
      const months = { Jan:1, Feb:2, Mär:3, Mar:3, Apr:4, Mai:5, Jun:6, Jul:7, Aug:8, Sep:9, Okt:10, Oct:10, Nov:11, Dez:12, Dec:12 }
      const month = months[dateMatch[3]]
      if (!month) return
      const year = new Date().getFullYear()
      const date = `${year}-${String(month).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`
      if (date < today()) return
      const timeMatch = text.match(/Beginn\s*·?\s*(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      const title = $(el).find('h2, h3, strong').first().text().trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
      events.push({ title, date, time, type, locationId: 36, source: 'cassiopeia', ticketUrl: $(el).attr('href') || '', spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Cassiopeia: ${e.message}`) }
  return events
}

async function scrapeQuasimodo() {
  console.log('📡 Quasimodo Berlin...')
  const events = []
  try {
    const res = await fetch('https://quasimodo.club/events', { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()
    $('a[href*="/event"]').each((_, el) => {
      const text = $(el).text().trim()
      const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{1,2}):(\d{2})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return
      const time = `${String(dateMatch[4]).padStart(2,'0')}:${dateMatch[5]}`
      const title = $(el).find('h2, h3, strong, .title').first().text().trim() || text.split('\n').pop().trim()
      if (!title || title.length < 2 || seen.has(date + title)) return
      seen.add(date + title)
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') || lower.includes('disco') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 37, source: 'quasimodo', ticketUrl: $(el).attr('href') || '', spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Quasimodo: ${e.message}`) }
  return events
}

async function scrapeLark() {
  console.log('📡 LARK Berlin...')
  const events = []
  try {
    const res = await fetch('https://larkberlin.com/events/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
    if (!res.ok) return events
    const html = await res.text()
    const $ = cheerio.load(html)
    $('h4, h3').each((_, el) => {
      const text = $(el).text().trim()
      const dateMatch = text.match(/^(\d{2})\/(\d{2})/)
      if (!dateMatch) return
      const year = new Date().getFullYear()
      const month = parseInt(dateMatch[2])
      const currentMonth = new Date().getMonth() + 1
      const eventYear = month < currentMonth - 1 ? year + 1 : year
      const date = `${eventYear}-${String(month).padStart(2,'0')}-${dateMatch[1]}`
      if (date < today()) return
      const title = text.replace(/^\d{2}\/\d{2}\s+\w+\s+-\s+/, '').trim()
      if (!title) return
      const href = $(el).closest('a').attr('href') || $(el).find('a').attr('href') || ''
      const lower = title.toLowerCase()
      const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
      events.push({ title, date, time: '19:00', type, locationId: 39, source: 'lark', ticketUrl: href, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ LARK: ${e.message}`) }
  return events
}

async function scrapeSlaughterhouse() {
  console.log('📡 Slaughterhouse Berlin...')
  const events = []
  try {
    const res = await fetch('https://slaughterhouse-berlin.de/konzerte/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()
    const content = $('body').text()
    const blocks = html.split(/(?=\d{2}\.\d{2}\.\d{4})/)
    blocks.forEach(block => {
      const dateMatch = block.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return
      const timeMatch = block.match(/Doors?:\s*(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
      const titleMatch = block.match(/\*\*(.+?)\*\*/)
      if (!titleMatch) return
      const title = titleMatch[1].replace(/Konzert\s*[+&]?\s*Party:\s*/i, '').replace(/Konzert:\s*/i, '').trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const ticketMatch = block.match(/https?:\/\/[^\s<]+tixforgigs[^\s<]+/)
      const ticketUrl = ticketMatch ? ticketMatch[0] : 'https://slaughterhouse-berlin.de/konzerte/'
      const lower = title.toLowerCase()
      const type = lower.includes('party') || block.toLowerCase().includes('party') ? 'party' : 'konzert'
      events.push({ title, date, time, type, locationId: 40, source: 'slaughterhouse', ticketUrl, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Slaughterhouse: ${e.message}`) }
  return events
}

async function scrapePeterEdel() {
  console.log('📡 Kulturhaus Peter Edel Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.peteredel.de/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { JANUAR:1, FEBRUAR:2, MÄRZ:3, APRIL:4, MAI:5, JUNI:6, JULI:7, AUGUST:8, SEPTEMBER:9, OKTOBER:10, NOVEMBER:11, DEZEMBER:12 }
    let currentMonth = new Date().getMonth() + 1
    let currentYear = new Date().getFullYear()
    const seen = new Set()
    $('h1, h3').each((_, el) => {
      const text = $(el).text().trim()
      // Monatsüberschrift z.B. "MÄRZ 2026"
      const monthMatch = text.match(/^(\w+)\s+(\d{4})$/)
      if (monthMatch) {
        currentMonth = months[monthMatch[1].toUpperCase()] || currentMonth
        currentYear = parseInt(monthMatch[2])
        return
      }
      // Datum z.B. "SA | 14.03." oder Titel
      const dateMatch = text.match(/\|\s*(\d{1,2})\.(\d{2})\./)
      if (dateMatch) return // Datum-Zeilen überspringen, Titel kommt separat
      if ($(el).is('h3') && text.length > 3) {
        // Datum aus vorherigem h3 suchen
        const prevText = $(el).prev('h3').text().trim()
        const dayMatch = prevText.match(/\|\s*(\d{1,2})\.(\d{2})\./)
        if (!dayMatch) return
        const date = `${currentYear}-${dayMatch[2]}-${String(dayMatch[1]).padStart(2,'0')}`
        if (date < today()) return
        const container = $(el).closest('div, section, article')
        const timeMatch = container.text().match(/Beginn:\s*(\d{1,2}):(\d{2})/)
        const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'
        const title = text.replace(/\*\*/g, '').trim()
        if (!title || seen.has(date + title)) return
        seen.add(date + title)
        const ticketLink = container.find('a').first().attr('href') || 'https://www.peteredel.de/events/'
        const lower = title.toLowerCase()
        const type = lower.includes('party') || lower.includes('dj') ? 'party' : lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('kino') || lower.includes('vortrag') || lower.includes('ausstellung') || lower.includes('führung') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
        events.push({ title, date, time, type, locationId: 41, source: 'peter-edel', ticketUrl: ticketLink, spotifyUrl: '' })
      }
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Peter Edel: ${e.message}`) }
  return events
}

async function scrapeTheaterImDelphi() {
  console.log('📡 Theater im Delphi Berlin...')
  const events = []
  try {
    const res = await fetch('https://theater-im-delphi.de/programm/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Januar:1, Februar:2, März:3, April:4, Mai:5, Juni:6, Juli:7, August:8, September:9, Oktober:10, November:11, Dezember:12 }
    let currentMonth = new Date().getMonth() + 1
    let currentYear = new Date().getFullYear()
    const seen = new Set()
    $('h2, tr').each((_, el) => {
      // Monatsüberschrift
      if ($(el).is('h2')) {
        const text = $(el).text().trim()
        const monthMatch = text.match(/^(\w+)\s+(\d{4})$/)
        if (monthMatch) {
          currentMonth = months[monthMatch[1]] || currentMonth
          currentYear = parseInt(monthMatch[2])
        }
        return
      }
      // Tabellenzeile
      const firstCell = $(el).find('td').first().text().trim()
      const dayMatch = firstCell.match(/^(\d{1,2})/)
      if (!dayMatch) return
      const timeMatch = firstCell.match(/(\d{1,2}):(\d{2})\s*Uhr/)
      if (!timeMatch) return
      const day = parseInt(dayMatch[1])
      const date = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return
      const time = `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`
      const titleEl = $(el).find('td').eq(1)
      const title = titleEl.find('a').first().text().trim() || titleEl.text().trim().split('\n')[0].trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)
      const ticketLink = $(el).find('a[href*="ticket"], a[href*="eventim"], a[href*="feverup"]').first().attr('href') || 'https://theater-im-delphi.de/tickets/'
      const lower = title.toLowerCase()
      const category = $(el).find('td').first().text().toLowerCase()
      const type = category.includes('party') || lower.includes('party') || lower.includes('dj') ? 'party' :
                   category.includes('tanz') || category.includes('lesung') || category.includes('theater') || category.includes('comedy') || category.includes('kinder') ? 'sonstige' :
                   lower.includes('lesung') || lower.includes('theater') || lower.includes('quiz') || lower.includes('flohmarkt') || lower.includes('ballett') || lower.includes('tanzabend') || lower.includes('tanzshow') ? 'sonstige' : 'konzert'
      events.push({ title, date, time, type, locationId: 42, source: 'theater-im-delphi', ticketUrl: ticketLink, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Theater im Delphi: ${e.message}`) }
  return events
}

async function scrapeZigZag() {
  console.log('📡 ZigZag Jazzclub Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.zigzag-jazzclub.berlin/programmneu', {
      headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 }
    const seen = new Set()
    $('a[href*="/program"]').each((_, el) => {
      const title = $(el).find('h3, h4, strong').first().text().trim() ||
                    $(el).text().trim().split('\n').filter(l => l.trim().length > 5)[0]?.trim()
      if (!title || title.length < 3) return
      // Datum aus dem Container holen
      const container = $(el).closest('div, article, li')
      const dateText = container.text().match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/)
      if (!dateText) return
      const month = months[dateText[1]]
      if (!month) return
      const date = `${dateText[3]}-${String(month).padStart(2,'0')}-${String(dateText[2]).padStart(2,'0')}`
      if (date < today()) return
      if (seen.has(date + title)) return
      seen.add(date + title)
      const href = $(el).attr('href') || ''
      const ticketUrl = href.startsWith('http') ? href : 'https://www.zigzag-jazzclub.berlin' + href
      events.push({ title, date, time: '20:00', type: detectType(title, description), locationId: 43, source: 'zigzag', ticketUrl, spotifyUrl: '' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ ZigZag: ${e.message}`) }
  return events
}

// ─── Hauptprogramm ───────────────────────────────────────────────────────────

async function main() {
  console.log('🎸 Konzert-App Scraper startet...\n')

  const results = await Promise.allSettled([
    scrapeConne(),
    scrapeWerk2(),
    scrapeLido(),
    scrapeSO36(),
    scrapeFestsaal(),
    scrapeTaeubchenthal(),
    scrapeFelsenkeller(),
    scrapeUTConnewitz(),   // NEU
    scrapeColumbia(),   // NEU
    scrapePrivatclub(),   // NEU
    scrapeAstra(),
    scrapeSchokoladen(),
    scrapeHornsErben(),
    scrapeUrbanSpree(),
    scrapeGretchen(),
    scrapeSupamolly(),
    scrapeKantine(),
    scrapeTempodrom(),
    scrapeHeimathafen(),
    scrapeBiNuu(),
    scrapeMikropol(),
    scrapeFrannz(),
    scrapeMonarch(),
    scrapeMadameClaude(),
    scrapeIlsesErika(),
    scrapeKesselhaus(),
    scrapeMetropol(),
    scrapeHuxleys(),
    scrapeColumbiahalle(),
    scrapeUberEatsMusicHall(),
    scrapeTrinity(),
    scrapeHole44(),
    scrapeBadehaus(),
    scrapeCassiopeia(),
    scrapeQuasimodo(),
    scrapeLark(),
    scrapeSlaughterhouse(),
    scrapePeterEdel(),
    scrapeTheaterImDelphi(),
    scrapeZigZag(),

  ])

  let allEvents = []
  for (const r of results) {
    if (r.status === 'fulfilled') allEvents = allEvents.concat(r.value)
  }

  // Duplikate entfernen (gleicher Titel + Datum + Location)
  const seen = new Set()
  allEvents = allEvents.filter(e => {
    const key = `${e.locationId}-${e.date}-${slugify(e.title)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // IDs vergeben
  allEvents = allEvents.map((e, i) => ({ id: Date.now() + i, ...e }))

  // Sortieren
  allEvents = allEvents.filter(e => e.date >= today())
  allEvents.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  // In Datei speichern
  const outPath = path.join(process.cwd(), 'public', 'events.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  // Alte events.json laden um addedAt zu erhalten
  let oldEvents = []
  try { oldEvents = JSON.parse(fs.readFileSync(outPath, 'utf-8')) } catch(e) {}
  const oldMap = new Map(oldEvents.map(e => [e.date + '|' + e.title + '|' + e.locationId, e.addedAt]))
  const todayStr = new Date().toISOString().split('T')[0]
  allEvents = allEvents.map(e => ({
    ...e,
    addedAt: oldMap.get(e.date + '|' + e.title + '|' + e.locationId) || todayStr
  }))
  fs.writeFileSync(outPath, JSON.stringify(allEvents, null, 2), 'utf-8')
  console.log(`\n✅ Fertig! ${allEvents.length} Events gespeichert → public/events.json`)
}
main().catch(console.error)