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
  console.log('📡 Festsaal Kreuzberg Berlin (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://festsaal-kreuzberg.de/de/', {
      waitUntil: 'networkidle2', timeout: 30000
    })

    const seen = new Set()
    const allLinks = new Set()

    // Alle Monats-Buttons klicken und Event-Links einsammeln
    const monthNames = ['März', 'April', 'Mai', 'Juni', 'Juli', 'August',
                        'September', 'Oktober', 'November', 'Dezember', 'Januar']

    // Erst aktuelle Seite einlesen
    async function collectLinks() {
      await new Promise(r => setTimeout(r, 1500))
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll('a[href*="/de/programm/"]')]
          .map(a => a.href)
          .filter(h => !h.endsWith('/de/programm/') && !h.includes('#'))
      )
      hrefs.forEach(h => allLinks.add(h))
    }

    await collectLinks()

    // Jeden Monat anklicken
    for (const month of monthNames) {
      try {
        const clicked = await page.evaluate((m) => {
          const els = [...document.querySelectorAll('button, a, li, span')]
          const el = els.find(e => e.textContent?.trim() === m)
          if (el) { el.click(); return true }
          return false
        }, month)
        if (clicked) await collectLinks()
      } catch(e) {}
    }

    // Jetzt alle Event-Links einzeln abrufen
    const monthMap = {
      'Januar':'01','Februar':'02','März':'03','April':'04','Mai':'05','Juni':'06',
      'Juli':'07','August':'08','September':'09','Oktober':'10','November':'11','Dezember':'12'
    }

    for (const href of allLinks) {
      try {
        await page.goto(href, { waitUntil: 'networkidle2', timeout: 15000 })
        const html = await page.content()
        const $ = cheerio.load(html)

        // Datum: "So, 7 Juni 2026" oder "Sa, 14 März 2026"
        const pageText = $('body').text()
        const dateMatch = pageText.match(/\w+,\s*(\d{1,2})\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})/)
        if (!dateMatch) continue

        const day   = String(dateMatch[1]).padStart(2, '0')
        const month = monthMap[dateMatch[2]]
        const year  = dateMatch[3]
        const date  = `${year}-${month}-${day}`
        if (date < today()) continue

        // Zeit: "18:00 Beginn" bevorzugen, sonst "Einlass"
        const beginMatch = pageText.match(/(\d{2}):(\d{2})\s*Beginn/)
        const einlassMatch = pageText.match(/(\d{2}):(\d{2})\s*Einlass/)
        const time = beginMatch
          ? `${beginMatch[1]}:${beginMatch[2]}`
          : einlassMatch ? `${einlassMatch[1]}:${einlassMatch[2]}` : '20:00'

        // Titel: h2 auf der Einzelseite
        const title = $('h2').first().text().trim()
        if (!title || title.length < 2) continue

        // Ticket-URL: eventbrite, eventim etc.
        const ticketUrl = $('a[href*="eventbrite"], a[href*="eventim"], a[href*="myticket"]')
          .first().attr('href') || href

        const key = date + title
        if (seen.has(key)) continue
        seen.add(key)

        events.push({
          title, date, time,
          locationId: 3,
          type: detectType(title),
          description: '',
          ticketUrl,
          spotifyUrl: '',
          source: 'festsaal'
        })
      } catch(e) {}
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Festsaal: ${e.message}`)
  } finally {
    if (browser) await browser.close()
  }
  return events
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
  const events = []
  try {
    const res = await fetch('https://www.felsenkeller-leipzig.com/programm/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Jeder Event-Block enthält Datum als "15.03. | So. | 20:00"
    // und h3 als Titel – wir suchen alle Textnodes mit diesem Muster
    // und nehmen das nächste h3 als Titel
    const bodyHtml = $.html()
    const blocks = bodyHtml.split(/<h3[^>]*>/)

    // Struktur: div.em-event-list-item → div.event-meta (Datum) + p.event-name (Titel)
    $('div.em-event-list-item').each((_, el) => {
      const title = $(el).find('p.event-name').first().text().trim()
      if (!title || title.length < 2) return
      if (/verschoben|abgesagt/i.test(title)) return

      // Datum aus div.event-meta: "VENUE DD.MM. | Mi. | HH:MM | ..."
      const metaText = $(el).find('div.event-meta').first().text()
      const dateMatch = metaText.match(/(\d{2})\.(\d{2})\.\s*\|\s*\w+\.?\s*\|\s*(\d{2}):(\d{2})/)
      if (!dateMatch) return

      const day   = dateMatch[1]
      const month = dateMatch[2]
      const hour  = dateMatch[3]
      const min   = dateMatch[4]

      const now = new Date()
      const curMonth = now.getMonth() + 1
      const year = parseInt(month) < curMonth - 1
        ? now.getFullYear() + 1
        : now.getFullYear()

      const date = `${year}-${month}-${day}`
      if (date < today()) return

      // Ticket-URL: erster externer Link im Container
      const ticketUrl = $(el).find('a[href]').filter((_, a) => {
        const href = $(a).attr('href') || ''
        return href.startsWith('http') &&
          !href.includes('facebook.com') &&
          !href.includes('google.com') &&
          !href.includes('/ical/') &&
          !href.includes('felsenkeller-leipzig.com') &&
          !href.includes('landstreicher-konzerte.de') === false
      }).first().attr('href')
        || $(el).find('a[href*="ticket"]').first().attr('href')
        || 'https://felsenkeller.ticket.io/'

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time: `${hour}:${min}`,
        locationId: 17,
        type: detectType(title),
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'felsenkeller'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Felsenkeller: ${e.message}`)
  }
  return events
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
  console.log('📡 UT Connewitz Leipzig (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const seen = new Set()

    const now = new Date()
    // Monate: aktueller + nächste 4
    const months = []
    for (let i = 0; i <= 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }

    for (const { year, month } of months) {
      const url = `https://utconnewitz.de/index.php?article_id=1&clang=0&month=${month}`
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      await new Promise(r => setTimeout(r, 2000))

      // Seitentext auslesen und Events per Regex extrahieren
      // Format: "01\n// Mi // 20 Uhr //\nTITEL"
      let bodyText = await page.evaluate(() => document.body.innerText)
      await page.close()
      // CRLF normalisieren
      bodyText = bodyText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // Regex: Zahl 1-31 am Zeilenanfang, dann Zeitzeile "// ... // HH Uhr //", dann Titel
      const pattern = /^(\d{1,2})\n\/\/ \w+ \/\/ (\d{1,2}) Uhr \/\/[^\n]*\n([^\n]{3,})/gm
      let m
      while ((m = pattern.exec(bodyText)) !== null) {
        const day   = String(m[1]).padStart(2, '0')
        const hour  = String(m[2]).padStart(2, '0')
        const title = m[3].trim()

        // Kinderprogramm / Kino überspringen
        if (/kinderkino|kinderfilm|kinder/i.test(title)) continue

        const date = `${year}-${String(month).padStart(2,'0')}-${day}`
        if (date < today()) continue

        const key = date + title
        if (seen.has(key)) continue
        seen.add(key)

        events.push({
          title, date,
          time: `${hour}:00`,
          locationId: 22,
          type: detectType(title),
          description: '',
          ticketUrl: 'https://utconnewitz.de/',
          spotifyUrl: '',
          source: 'utconnewitz'
        })
      }
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ UT Connewitz: ${e.message}`)
  } finally {
    if (browser) await browser.close()
  }
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
    const seen = new Set()
    let currentMonth = 0
    let currentYear = new Date().getFullYear()

    // Struktur: div.mod_eventlist enthält h1 (Monate) + div.event.eventlist_event (Events)
    // h1 können direkte Kinder ODER in Wrapper-Divs sein → nach Dokumentreihenfolge scannen
    $('h1, div.eventlist_event').each((_, el) => {
      const text = $(el).text().trim()
      // h1 = Monatsüberschrift
      if ($(el).is('h1') && /^\w+\s+\d{4}$/.test(text)) {
        const monthMatch = text.match(/^(\w+)\s+(\d{4})$/)
        if (monthMatch && months[monthMatch[1]]) {
          currentMonth = months[monthMatch[1]]
          currentYear = parseInt(monthMatch[2])
        }
        return
      }
      if (!$(el).hasClass('eventlist_event')) return
      if (!currentMonth) return

      // Tag-Zahl
      const day = parseInt($(el).find('p.event_datum_tag').first().text().trim())
      if (!day || isNaN(day)) return

      // Titel
      const title = $(el).find('div.event_kopf h2, .event_kopf h2').first().text().trim()
      if (!title || title.length < 2) return

      const date = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return
      if (seen.has(date + title)) return
      seen.add(date + title)

      // Zeit aus div.event_info
      const infoText = $(el).find('div.event_info').first().text()
      const timeMatch = infoText.match(/Beginn:\s*(\d{1,2}):(\d{2})\s*Uhr/)
      const time = timeMatch
        ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`
        : '20:00'

      const ticketLink = $(el).find('a[href*="ticket"], a[href*="eventim"], a[href*="loft"], a[href*="landstreicher"]').first().attr('href') ||
        'https://www.columbiahalle.berlin/veranstaltungen.html'

      events.push({ title, date, time, locationId: 32, type: detectType(title), description: '', ticketUrl: ticketLink, spotifyUrl: '', source: 'columbiahalle' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Columbiahalle: ${e.message}`) }
  return events
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
  const events = []
  try {
    const res = await fetch('https://schokoladen.tickettoaster.de/produkte', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Alle Event-Links in der Liste
    $('ul li a[href*="/produkte/"]').each((_, el) => {
      const text = $(el).text().trim()
      const href = $(el).attr('href') || ''

      // Datum aus "...in Berlin am 16.03.2026" oder "...am 16.03.2026"
      const dateMatch = text.match(/am\s+(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return

      const day = dateMatch[1]
      const month = dateMatch[2]
      const year = dateMatch[3]
      const date = `${year}-${month}-${day}`
      if (date < today()) return

      // Titel: "Tickets KÜNSTLER (genre, ort) in Berlin am DD.MM.YYYY"
      // → alles zwischen "Tickets " und " in Berlin am"
      let title = text
        .replace(/^Tickets\s+/i, '')
        .replace(/\s+in\s+Berlin\s+am\s+\d{2}\.\d{2}\.\d{4}.*$/i, '')
        // Genre/Ort in Klammern am Ende entfernen: "KÜNSTLER (psych-pop, us)" → "KÜNSTLER"
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()

      if (!title || title.length < 2) return

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time: '20:00',
        locationId: 11,
        type: detectType(title),
        description: '',
        ticketUrl: href.startsWith('http') ? href : 'https://schokoladen.tickettoaster.de' + href,
        spotifyUrl: '',
        source: 'schokoladen'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Schokoladen: ${e.message}`)
  }
  return events
}

async function scrapeHornsErben() {
  console.log('📡 Horns Erben Leipzig...')
  const events = []
  const seen = new Set()

  try {
    // Alle Seiten der Veranstaltungsliste durchgehen
    for (let page = 1; page <= 5; page++) {
      const url = page === 1
        ? 'https://horns-erben.de/veranstaltungen/liste/'
        : `https://horns-erben.de/veranstaltungen/liste/seite/${page}/`

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
      if (!res.ok) break
      const html = await res.text()
      const $ = cheerio.load(html)

      // Prüfen ob Seite Events enthält
      const eventItems = $('li').filter((_, el) => $(el).find('h4 a').length > 0)
      if (!eventItems.length) break

      eventItems.each((_, el) => {
        // Titel + URL aus h4 a
        const link = $(el).find('h4 a').first()
        const title = link.text().trim()
        const href  = link.attr('href') || 'https://horns-erben.de/veranstaltungen/'
        if (!title || title.length < 2) return

        // Datum + Zeit: "18. März / 19:30 - 22:00"
        const dateText = $(el).text()
        const dateMatch = dateText.match(/(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\/\s+(\d{2}):(\d{2})/)
        if (!dateMatch) return

        const monthMap = {
          'Januar':'01','Februar':'02','März':'03','April':'04','Mai':'05','Juni':'06',
          'Juli':'07','August':'08','September':'09','Oktober':'10','November':'11','Dezember':'12'
        }
        const day   = String(dateMatch[1]).padStart(2, '0')
        const month = monthMap[dateMatch[2]]
        const now   = new Date()
        const year  = parseInt(month) < now.getMonth() + 1 - 1
          ? now.getFullYear() + 1
          : now.getFullYear()
        const date  = `${year}-${month}-${day}`
        if (date < today()) return

        const time = `${dateMatch[3]}:${dateMatch[4]}`

        const key = date + title
        if (seen.has(key)) return
        seen.add(key)

        events.push({
          title,
          date,
          time,
          locationId: 26,
          type: detectType(title),
          description: '',
          ticketUrl: href,
          spotifyUrl: '',
          source: 'hornserben'
        })
      })

      // Wenn keine "Nächste Seite" vorhanden, aufhören
      if (!$('a.tribe-events-nav-next, a[rel="next"]').length) break
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Horns Erben: ${e.message}`)
  }
  return events
}

async function scrapeUrbanSpree() {
  console.log('📡 Urban Spree Berlin...')
  const events = []
  const seen = new Set()
  const months = {
    Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
    Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'
  }
  const baseUrl = 'https://www.urbanspree.com/program/concerts/'

  async function fetchPage(url) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    return res.text()
  }

  function parsePage($) {
    const found = []
    $('a[href*="program/concerts/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (!href.includes('.html')) return

      const fullText = $(el).text()
      const dateMatch = fullText.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/)
      if (!dateMatch) return
      const month = months[dateMatch[1]]
      if (!month) return
      const date = `${dateMatch[3]}-${month}-${String(dateMatch[2]).padStart(2,'0')}`

      const h4 = $(el).find('h3, h4').first().text().trim()
      let title = h4
      if (!title) {
        const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)
        title = lines.find(l =>
          l !== 'Concerts' && l !== 'Events' &&
          !/^[A-Z][a-z]{2}\s+\d/.test(l) &&
          !/^\d{2}:\d{2}$/.test(l) &&
          !/^\d+[.,]\d+€/.test(l) &&
          l.length > 2
        ) || ''
      }
      if (!title || title.length < 2) return
      title = title.replace(/\s*[-–]\s*Urban\s+Spree.*$/i, '').trim()

      const timeMatch = fullText.match(/(\d{2}):(\d{2})/)
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '20:00'

      found.push({ href, title, date, time })
    })
    return found
  }

  try {
    // Events sind absteigend sortiert – Seiten durchgehen bis alle Events in der Vergangenheit
    let page = 1
    let done = false
    while (!done) {
      const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`
      const html = await fetchPage(url)
      const $ = cheerio.load(html)
      const items = parsePage($)

      if (items.length === 0) break

      let allPast = true
      for (const { href, title, date, time } of items) {
        if (date >= today()) {
          allPast = false
          const key = date + title
          if (!seen.has(key)) {
            seen.add(key)
            events.push({
              title, date, time,
              locationId: 21,
              type: detectType(title),
              description: '',
              ticketUrl: href.startsWith('http') ? href : 'https://www.urbanspree.com' + href,
              spotifyUrl: '',
              source: 'urbanspree'
            })
          }
        }
      }
      // Sobald alle Events dieser Seite in der Vergangenheit sind, abbrechen
      if (allPast) done = true
      page++
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Urban Spree: ${e.message}`)
  }
  return events
}

async function scrapeGretchen() {
  console.log('📡 Gretchen Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.gretchen-club.de/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Jedes Event: h1-Link mit Titel + "detail.php?id=..."
    // Datum steht als Text direkt VOR dem h1 im selben Container
    $('a[href*="detail.php"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const title = $(el).find('h1, h2, h3').first().text()
        .replace(/\[INFO\]/g, '').trim()
      if (!title || title.length < 2) return

      // Datum aus dem Parent-Container
      const container = $(el).parent()
      const containerText = container.text()

      // Format: "Di. 17.03.2026 19.30 h"
      const dateMatch = containerText.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2})\.(\d{2})\s*h/)
      if (!dateMatch) return

      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return

      const time = `${dateMatch[4]}:${dateMatch[5]}`

      const ticketUrl = href.startsWith('http')
        ? href
        : 'https://www.gretchen-club.de' + href

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time,
        locationId: 22,
        type: detectType(title),
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'gretchen'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Gretchen: ${e.message}`)
  }
  return events
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
        type: detectType(title),
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
      const text = $(el).text()
      if (!text.toLowerCase().includes('kantine')) return

      // Datum aus Text: "Samstag 28.03.2026 tür 19:30 beginn 19:30"
      const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return

      const title = $(el).find('h2, h3, h4').first().text().trim()
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
        description: '',
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

    $('h3').each((_, el) => {
      const title = $(el).text().trim()
      if (!title) return

      // Datum aus dem umgebenden Block lesen
      const block = $(el).closest('div, article, li, section')
      const blockText = block.text()

      // Datum suchen: "Mittwoch, 18. Mär. 2026" oder "Donnerstag, 25. Jun. 2026"
      const months = { Jan:1, Feb:2, Mär:3, Apr:4, Mai:5, Jun:6, Jul:7, Aug:8, Sep:9, Okt:10, Nov:11, Dez:12 }
      const dateMatch = blockText.match(/(\d{1,2})\.\s*(\w{3})\.?\s*(\d{4})/)
      if (!dateMatch) return
      const day = dateMatch[1]
      const month = months[dateMatch[2]]
      if (!month) return
      const year = dateMatch[3]
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) return

      const timeMatch = blockText.match(/Beginn:\s*(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'

      if (seen.has(date + title)) return
      seen.add(date + title)

      // Link suchen - Event-Link oder Ticket-Link
      const eventLink = block.find('a[href*="/event/"]').first().attr('href') || ''
      const ticketUrl = eventLink ? 'https://www.tempodrom.de' + eventLink : 'https://www.tempodrom.de/programm-und-tickets/'

      events.push({
        title, date, time,
        locationId: 25,
        type: detectType(title),
        description: '',
        ticketUrl,
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
    const res = await fetch('https://frannz.eu/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mär': '03', 'Mar': '03', 'Apr': '04',
      'Mai': '05', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Okt': '10', 'Oct': '10', 'Nov': '11', 'Dez': '12', 'Dec': '12'
    }

    const seen = new Set()

    // Jeder Event-Block: Datum als Text "So 15.03." dann h2 als Titel
    // Die Seite hat Wochentag/Tag/Monat als separate Text-Nodes + h2
    // Wir iterieren über alle h2 und schauen auf den vorherigen Text
    $('h2').each((_, el) => {
  const title = $(el).text().trim()
      if (!title || title.length < 2) return
      if (/fällt aus|verlegt|verschoben/i.test(title)) return

      // Finde den nächsten Datumstext im umgebenden Container
      const rowWrap = $(el).closest('.row-wrap')
      const day = rowWrap.find('.event-day').text().trim().padStart(2, '0')
      const monthName = rowWrap.find('.event-month').text().trim()
      const month = monthMap[monthName.substring(0, 3)] || monthMap[monthName]
      if (!day || !month) return
      const now = new Date()
      let year = now.getFullYear()
      const eventMonth = parseInt(month)
      if (eventMonth < now.getMonth() + 1) year++
      const date = `${year}-${month}-${day}`

      if (date < today()) return

      // Zeit: "20:00" oder "19:00"
      const timeMatch = rowWrap.text().match(/(\d{1,2}):(\d{2})\s*Einlass|(\d{1,2}):(\d{2})\s*Beginn/)
      const time = timeMatch ? `${(timeMatch[1]||timeMatch[3]).padStart(2,'0')}:${timeMatch[2]||timeMatch[4]}` : '20:00'

      // Ticket-URL aus nächstem Link
      const ticketUrl = $(el).closest('section, article, div[class]')
        .find('a[href*="eventim"], a[href*="ticketmaster"], a[href*="copilot"]')
        .first().attr('href') || 'https://frannz.eu/'

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time,
        locationId: 6,
        type: detectType(title),
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'frannz'
      })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch (e) {
    console.log(`  ✗ Frannz: ${e.message}`)
  }
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
    const res = await fetch('https://madameclaude.de/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Jedes Event: <h4> mit Text "15/03 Sun - Titel" innerhalb eines <a>
    $('h4').each((_, el) => {
      const text = $(el).text().trim()

      // Format: "15/03 Sun - Open Mic L. J. Fox"
      const match = text.match(/^(\d{2})\/(\d{2})\s+\w+\s+-\s+(.+)$/)
      if (!match) return

      const day = match[1]
      const month = match[2]
      const title = match[3].trim()

      // Jahr bestimmen
      const now = new Date()
      const curMonth = now.getMonth() + 1
      const year = parseInt(month) < curMonth ? now.getFullYear() + 1 : now.getFullYear()
      const date = `${year}-${month}-${day}`

      if (date < today()) return

      // Ticket-URL: href des übergeordneten <a>
      const link = $(el).closest('a').attr('href') || 'https://madameclaude.de/events/'

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time: '20:00',
        locationId: 12,
        type: detectType(title),
        description: '',
        ticketUrl: link,
        spotifyUrl: '',
        source: 'madameclaude'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Madame Claude: ${e.message}`)
  }
  return events
}

async function scrapeIlsesErika() {
  console.log('📡 Ilses Erika Leipzig...')
  const events = []
  const seen = new Set()

  // Aktuelle + nächste 3 Monate scrapen
  const now = new Date()
  const months = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}${m}`)
  }

  for (const month of months) {
    try {
      const res = await fetch(`https://www.ilseserika.de/monatsuebersicht.html?month=${month}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
      const html = await res.text()
      const $ = cheerio.load(html)

      // Alle Datum-Zeilen finden: "DD.MM.YYYY // HH:MM Uhr"
      // Diese stehen als plain text nodes direkt im content-Bereich
      const bodyText = $.html()

      // Splits am Datum-Pattern
      const blocks = bodyText.split(/(?=\d{2}\.\d{2}\.\d{4}\s*\/\/\s*\d{2}:\d{2}\s*Uhr)/)

      for (const block of blocks) {
        const dateMatch = block.match(/(\d{2})\.(\d{2})\.(\d{4})\s*\/\/\s*(\d{2}):(\d{2})\s*Uhr/)
        if (!dateMatch) continue

        const day   = dateMatch[1]
        const mon   = dateMatch[2]
        const year  = dateMatch[3]
        const hour  = dateMatch[4]
        const min   = dateMatch[5]
        const date  = `${year}-${mon}-${day}`
        if (date < today()) continue

        // Titel aus h2-Tag im Block
        const blockHtml = block.substring(0, 2000) // nur Anfang des Blocks
        const $block = cheerio.load(blockHtml)
        const h2Link = $block('h2 a').first()
        const title = h2Link.text().trim()
        const href  = h2Link.attr('href') || ''

        if (!title || title.length < 2) continue

        const time = `${hour}:${min}`
        const ticketUrl = href.startsWith('http')
          ? href
          : href
            ? 'https://www.ilseserika.de' + href
            : 'https://www.ilseserika.de/termine-63.html'

        const key = date + title
        if (seen.has(key)) continue
        seen.add(key)

        events.push({
          title,
          date,
          time,
          locationId: 20, // Ilses Erika Leipzig
          type: detectType(title),
          description: '',
          ticketUrl,
          spotifyUrl: '',
          source: 'ilseserika'
        })
      }
    } catch(e) {
      console.log(`  ✗ Ilses Erika (${month}): ${e.message}`)
    }
  }

  console.log(`  ✓ ${events.length} Events`)
  return events
}

async function scrapeKesselhaus() {
  console.log('📡 Kesselhaus Berlin (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://www.kesselhaus.net/de/calendar', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))

    // Angular-App: innerText preserviert CSS-basierte Zeilenumbrüche
    // Links + innerText direkt aus dem DOM extrahieren
    const rawEvents = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/de/calendar/-"]')
      return Array.from(links).map(link => ({
        href: link.getAttribute('href') || '',
        text: link.innerText || ''
      }))
    })
    await browser.close()
    browser = null

    const seen = new Set()
    const monthMap = {
      'Januar':'01','Februar':'02','März':'03','April':'04','Mai':'05','Juni':'06',
      'Juli':'07','August':'08','September':'09','Oktober':'10','November':'11','Dezember':'12'
    }
    const skipWords = ['Kesselhaus','Maschinenhaus','Club23','Kulturbrauerei',
      'Frannz Club','Konzert','Party','Theater','Kinder','Comedy','Tanz','Lesung',
      'Weitere','Festival','Großveranstaltung','Ausverkauft','Abgesagt','Verlegt',
      'Nachholtermin','Zusatzkonzert']

    for (const { href, text } of rawEvents) {
      const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 4) continue

      // Format: ["Sa.", "03", "Januar", "21:00", "Titel...", "Location", "Typ"]
      const day   = lines[1]
      const month = monthMap[lines[2]]
      if (!day || !month || isNaN(parseInt(day))) continue

      const now = new Date()
      const year = parseInt(month) < now.getMonth() + 1 - 1
        ? now.getFullYear() + 1
        : now.getFullYear()

      const date = `${year}-${month}-${String(parseInt(day)).padStart(2,'0')}`
      if (date < today()) continue

      const timeMatch = lines[3].match(/(\d{1,2}):(\d{2})/)
      if (!timeMatch) continue
      const time = `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`

      const titleLines = lines.slice(4).filter(l => !skipWords.includes(l) && l.length > 1)
      const title = titleLines[0]?.trim()
      if (!title || title.length < 2) continue

      const key = date + title
      if (seen.has(key)) continue
      seen.add(key)

      const ticketUrl = href.startsWith('http') ? href : 'https://www.kesselhaus.net' + href
      events.push({
        title, date, time,
        locationId: 29,
        type: detectType(title),
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'kesselhaus'
      })
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Kesselhaus: ${e.message}`)
  } finally {
    if (browser) await browser.close()
  }
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
    const months = { Januar:1, Februar:2, März:3, April:4, Apr:4, Mai:5, Juni:6, Juli:7, August:8, Sep:9, September:9, Oktober:10, Okt:10, Nov:11, November:11, Dez:12, Dezember:12 }
    const seen = new Set()

    $('li').each((_, el) => {
      const text = $(el).text().trim()
      // Format: "18/ März 2026 20:00"
      const dateMatch = text.match(/(\d{1,2})\s*\/\s*(\w+\.?)\s+(\d{4})\s+(\d{1,2}):(\d{2})/)
      if (!dateMatch) return
      const monthKey = dateMatch[2].replace('.','')
      const month = months[monthKey]
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
      events.push({ title, date, time, type, locationId: 30, type: detectType(title), source: 'metropol', ticketUrl: href, spotifyUrl: '' })
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Jedes Event: li mit a[href*="/event/YYYY-MM-DD-"]
    $('li').each((_, el) => {
      const link = $(el).find('a[href*="/event/"]').first()
      if (!link.length) return

      const href = link.attr('href') || ''

      // Datum direkt aus URL: /event/2026-08-02-thievery-corporation
      const urlMatch = href.match(/\/event\/(\d{4})-(\d{2})-(\d{2})-/)
      if (!urlMatch) return

      const date = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`
      if (date < today()) return

      // Zeit aus "Beginn: 20:00"
      const text = $(el).text()
      const timeMatch = text.match(/Beginn:\s*(\d{2}):(\d{2})/)
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '20:00'

      // Titel: letzter Textblock im Link (nach Tag und Monat)
      const lines = link.text().trim().split('\n').map(l => l.trim()).filter(Boolean)
      // Format: ["17März", "Beginn: 20:00 | Einlass: 19:00", "257ers"]
      // oder: ["17", "März", "Beginn...", "TITEL"]
      // Titel = letzte Zeile die kein Datum/Zeit/Hinweis ist
      const skipPatterns = [/^\d+/, /^Beginn/, /^Einlass/, /^Ausverkauft/, /^Nachholtermin/, /^Achtung/]
      const titleLines = lines.filter(l => !skipPatterns.some(p => p.test(l)) && l.length > 1)
      const title = titleLines[0]?.trim()
      if (!title || title.length < 2) return

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title, date, time,
        locationId: 31,
        type: detectType(title),
        description: '',
        ticketUrl: href.startsWith('http') ? href : 'https://huxleysneuewelt.de' + href,
        spotifyUrl: '',
        source: 'huxleys'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Huxleys: ${e.message}`)
  }
  return events
}

async function scrapeUberEatsMusicHall() {
  console.log('📡 Uber Eats Music Hall Berlin (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://www.uber-eats-music-hall.de/events-tickets/', {
      waitUntil: 'networkidle2', timeout: 45000
    })
    // Warten bis div.entry Elemente geladen sind
    await page.waitForFunction(
      () => document.querySelectorAll('div.entry').length > 0,
      { timeout: 20000 }
    ).catch(() => {})

    // Events aus div.entry extrahieren – Datum+Zeit stehen in der URL
    const rawEvents = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div.entry')).map(div => {
        const titleLink = div.querySelector('h3.event-title a')
        const href = titleLink?.getAttribute('href') || ''
        const title = titleLink?.innerText?.trim() || ''
        return { href, title }
      }).filter(e => e.href && e.title)
    })
    await browser.close()
    browser = null

    const seen = new Set()

    for (const { href, title } of rawEvents) {
      if (!title || title.length < 2) continue
      if (/^(ABGESAGT|VERLEGT)/i.test(title)) continue

      // Datum und Zeit aus URL: /events/detail/slug/YYYY-MM-DD-HHMM
      const urlMatch = href.match(/\/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})$/)
      if (!urlMatch) continue
      const date = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`
      const time = `${urlMatch[4]}:${urlMatch[5]}`
      if (date < today()) continue

      const key = date + title
      if (seen.has(key)) continue
      seen.add(key)

      events.push({
        title, date, time,
        locationId: 33,
        type: detectType(title),
        description: '',
        ticketUrl: href,
        spotifyUrl: '',
        source: 'ubereatsmusichall'
      })
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Uber Eats Music Hall: ${e.message}`)
  } finally {
    if (browser) await browser.close()
  }
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
  'Privatclub': 4,
  'Schokoladen': 11,
  'Madame Claude': 12,
  'Supamolly': 23,
  'Kantine am Berghain': 24,
  'Mikropol': 28,
  'Prachtwerk': 38,
  'LARK': 39,
  'Wild at Heart': 9,
  'Columbiahalle': 32,
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
  const seen = new Set()
  try {
    const urls = ['https://badehaus-berlin.com/concerts/', 'https://badehaus-berlin.com/events/']
    for (const url of urls) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
      const html = await res.text()
      const $ = cheerio.load(html)

      $('h2').each((_, el) => {
        const title = $(el).text().trim()
        if (!title || title.length < 2) return

        // Datum aus dem Container holen
        const container = $(el).closest('div, article, li').parent()
        const containerText = container.text()
        const dateMatch = containerText.match(/(\d{2})\.(\d{2})\.(\d{4})\s*\|\s*(\d{1,2}):(\d{2})/)
        if (!dateMatch) return

        const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
        if (date < today()) return
        const time = `${String(dateMatch[4]).padStart(2,'0')}:${dateMatch[5]}`

        if (seen.has(date + title)) return
        seen.add(date + title)

        const ticketLink = container.find('a[href*="ticket"], a[href*="eventim"], a[href*="landstreicher"], a[href*="tickettoaster"], a[href*="dice"], a[href*="vvk"]').first().attr('href') ||
                           container.find('a[href*="/events/"]').first().attr('href') ||
                           'https://badehaus-berlin.com/concerts/'

        events.push({ title, date, time, locationId: 35, type: detectType(title), description: '', ticketUrl: ticketLink, spotifyUrl: '', source: 'badehaus' })
      })
    }
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ Badehaus: ${e.message}`) }
  return events
}

async function scrapeCassiopeia() {
  console.log('📡 Cassiopeia Berlin...')
  const events = []
  try {
    const months = { Januar:1, Februar:2, März:3, April:4, Mai:5, Juni:6, Juli:7, August:8, September:9, Oktober:10, November:11, Dezember:12 }
    const seen = new Set()

    for (let page = 1; page <= 9; page++) {
      const url = page === 1 ? 'https://cassiopeia-berlin.de/club' : `https://cassiopeia-berlin.de/club?f74de34a_page=${page}`
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' } })
      const html = await res.text()
      const $ = cheerio.load(html)

      $('a[href*="/event/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const text = $(el).text().trim()
        // Format: "Beginn\n22:00\nParty\n...\n14\n.\n03\n.\nMärz 2026\nDirty Dancing\nSat\n14\n..."
        const dateMatch = text.match(/(\d{1,2})\s*\.\s*(\d{2})\s*\.\s*(\w+)\s+(\d{4})/)
        if (!dateMatch) return
        const month = months[dateMatch[3]]
        if (!month) return
        const date = `${dateMatch[4]}-${String(month).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
        if (date < today()) return

        const timeMatch = text.match(/Beginn\s*(\d{1,2}):(\d{2})/)
        const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'

        // Titel: erste Zeile die kein Datum/Zeit/Kategorie ist
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        const skipWords = ['Beginn', 'Einlass', 'Konzert', 'Party', 'Sonstiges', 'Cancelled', 'Sold-Out', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', '.', '|']
        const months_list = Object.keys(months)
        const titleLines = lines.filter(l =>
          !skipWords.includes(l) &&
          !months_list.includes(l) &&
          !/^\d{1,2}$/.test(l) &&
          !/^\d{1,2}:\d{2}$/.test(l) &&
          !/^\d{4}$/.test(l) &&
          l.length > 2
        )
        const title = titleLines[0]?.trim()
        if (!title || seen.has(date + title)) return
        seen.add(date + title)

        events.push({ title, date, time, locationId: 36, type: detectType(title), description: '', ticketUrl: href, spotifyUrl: '', source: 'cassiopeia' })
      })
    }
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
    const res = await fetch('https://larkberlin.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Struktur: div.event-card enthält:
    //   div[thumbnail] (img), div[date] ("26/03Thu"), div[text] (div[title] → a → h4)
    // Selektiere h4 in Event-Link und finde div[class*="date"] in der Event-Card
    $('a[href*="/event/"] h4').each((_, el) => {
      const anchor = $(el).closest('a')
      const href = anchor.attr('href') || ''
      if (!href.includes('/event/')) return

      const title = $(el).text().trim()
      if (!title || title.length < 2) return

      // Event-Card ist übergeordneter Container mit "event-card" in Klasse
      const card = $(el).closest('[class*="event-card"]').length
        ? $(el).closest('[class*="event-card"]')
        : anchor.parent().parent().parent()

      // Datum aus div[class*="date"]: Text "26/03Thu" oder "26/03"
      const dateText = card.find('div[class*="date"]').first().text().trim()
      const match = dateText.match(/(\d{2})\/(\d{2})/)
      if (!match) return

      const day   = match[1]
      const month = match[2]

      const now = new Date()
      const curMonth = now.getMonth() + 1
      const year = parseInt(month) < curMonth - 1
        ? now.getFullYear() + 1
        : now.getFullYear()
      const date = `${year}-${month}-${day}`
      if (date < today()) return

      const link = href.startsWith('http') ? href : 'https://larkberlin.com' + href

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time: '20:00',
        locationId: 39,
        type: detectType(title),
        description: '',
        ticketUrl: link,
        spotifyUrl: '',
        source: 'lark'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ LARK: ${e.message}`)
  }
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

    // Datum-Paragraphen finden: "14.03.2026"
    $('p, div').each((_, el) => {
      const text = $(el).text().trim()
      const dateMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) return
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      if (date < today()) return

      // Titel aus strong/b Tag
      const title = $(el).find('strong, b').first().text().trim()
        .replace(/^Konzert\s*[\+&]?\s*Party:\s*/i, '')
        .replace(/^Konzert:\s*/i, '')
        .replace(/^Party:\s*/i, '')
        .trim()
      if (!title || seen.has(date + title)) return
      seen.add(date + title)

      const blockText = $(el).text()
      const timeMatch = blockText.match(/Doors?:?\s*(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '21:00'

      const ticketLink = $(el).find('a[href*="tixforgigs"], a[href*="ra.co"]').first().attr('href') ||
                         $(el).next().find('a[href*="tixforgigs"], a[href*="ra.co"]').first().attr('href') ||
                         'https://slaughterhouse-berlin.de/konzerte/'

      events.push({ title, date, time, locationId: 40, type: detectType(title), description: '', ticketUrl: ticketLink, spotifyUrl: '', source: 'slaughterhouse' })
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const months = {
      JANUAR:1,FEBRUAR:2,'MÄRZ':3,APRIL:4,MAI:5,JUNI:6,
      JULI:7,AUGUST:8,SEPTEMBER:9,OKTOBER:10,NOVEMBER:11,DEZEMBER:12
    }
    let currentMonth = 0
    let currentYear = new Date().getFullYear()
    const seen = new Set()

    // Unbrauchbare Titel-Muster
    const isBadTitle = (t) =>
      !t ||
      t.length < 3 ||
      /^Tickets/i.test(t) ||
      /^Abgesagt/i.test(t) ||
      /^Ausverkauft/i.test(t) ||
      /^Details/i.test(t) ||
      /^Abendkasse/i.test(t) ||
      /^\d+[,.]/.test(t) ||       // fängt mit Preis an
      /^zzgl\./i.test(t)

    // Monatsüberschriften aus h1 extrahieren
    $('h1').each((_, el) => {
      const m = $(el).text().trim().match(/^(\w+)\s+(\d{4})$/)
      if (m) {
        currentMonth = months[m[1].toUpperCase()] || currentMonth
        currentYear  = parseInt(m[2])
      }
    })

    // Alle h3 in Dokumentreihenfolge – Datum-h3 dann Titel-h3 sequenziell
    const allH3 = $('h3').toArray()
    for (let i = 0; i < allH3.length; i++) {
      const text = $(allH3[i]).text().trim()

      // Datum-h3: "SA | 14.03." oder "DO | 02.04."
      const dateMatch = text.match(/\|\s*(\d{1,2})\.(\d{2})\./)
      if (!dateMatch) continue
      if (!currentMonth) continue

      const day   = parseInt(dateMatch[1])
      const month = parseInt(dateMatch[2])
      const year  = month < currentMonth - 1 ? currentYear + 1 : currentYear
      const date  = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date < today()) continue

      // Nachfolgende h3s bis zum nächsten Datum-h3 durchsuchen
      let title = ''
      let titleEl = null
      for (let j = i + 1; j < allH3.length; j++) {
        const candidate = $(allH3[j]).text().trim()
        if (/\|\s*\d{1,2}\.\d{2}\./.test(candidate)) break  // nächstes Datum-h3
        if (!isBadTitle(candidate)) {
          title = candidate
          titleEl = $(allH3[j])
          break
        }
      }
      if (!title || isBadTitle(title)) continue
      if (/ausverkauft|abgesagt/i.test(title)) continue

      const rawHref = titleEl?.find('a').first().attr('href') || ''
      const ticketUrl = rawHref
        ? (rawHref.startsWith('http') ? rawHref : 'https://www.peteredel.de' + rawHref)
        : 'https://www.peteredel.de/events/'

      const key = date + title
      if (seen.has(key)) continue
      seen.add(key)

      events.push({
        title, date, time: '20:00',
        locationId: 41,
        type: detectType(title),
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'peter-edel'
      })
    }

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Peter Edel: ${e.message}`)
  }
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
      const eventLink = titleEl.find('a[href*="theater-im-delphi"]').first().attr('href')
      const ticketLink = eventLink || $(el).find('a[href*="ticket"], a[href*="eventim"], a[href*="feverup"]').first().attr('href') || 'https://theater-im-delphi.de/programm/'
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

    $('a[href*="/program-mai/"]').each((_, el) => {
      const title = $(el).text().trim()
      if (!title || title.length < 3) return

      // Datum direkt nach dem Link als Text
      const dateText = $(el).closest('div, article, li').find('p, time, [class*="date"]').first().text().trim() ||
                       $(el).parent().next().text().trim()

      const dateMatch = dateText.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/)
      if (!dateMatch) return
      const month = months[dateMatch[1]]
      if (!month) return
      const date = `${dateMatch[3]}-${String(month).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`
      if (date < today()) return
      if (seen.has(date + title)) return
      seen.add(date + title)

      const href = $(el).attr('href') || ''
      const ticketUrl = href.startsWith('http') ? href : 'https://www.zigzag-jazzclub.berlin' + href
      events.push({ title, date, time: '20:00', locationId: 43, type: detectType(title), description: '', ticketUrl, spotifyUrl: '', source: 'zigzag' })
    })
    console.log(`  ✓ ${events.length} Events`)
  } catch(e) { console.log(`  ✗ ZigZag: ${e.message}`) }
  return events
}

async function scrapeHolzmarkt() {
  console.log('📡 Säälchen / Holzmarkt Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.holzmarkt.com/kalender', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Struktur: div.event-date-image → div.event-date → time → span.cal--day + span.cal--month
    // h2 a[href*="/veranstaltung/"] für den Titel
    const monthMapDE = {
      'Jan':'01','Feb':'02','März':'03','Apr':'04','Mai':'05','Jun':'06',
      'Jul':'07','Aug':'08','Sep':'09','Okt':'10','Nov':'11','Dez':'12',
      'März':'03','Mär':'03','Oktober':'10','Dezember':'12','Januar':'01','Februar':'02',
      'April':'04','Juni':'06','Juli':'07','August':'08','September':'09','November':'11'
    }
    const now = new Date()
    const curMonth = now.getMonth() + 1

    $('h2 a[href*="/veranstaltung/"]').each((_, el) => {
      const title = $(el).text().trim()
      if (!title || title.length < 2) return

      const container = $(el).closest('[class*="event"], article, div.views-row, li')
        .length ? $(el).closest('[class*="event"], article, div.views-row, li')
                : $(el).parent().parent().parent()

      // Datum: span.cal--day + span.cal--month
      const dayRaw   = container.find('span.cal--day').first().text().trim()   // "08."
      const monthRaw = container.find('span.cal--month').first().text().trim() // "Apr."

      const day = parseInt(dayRaw)
      const monthKey = monthRaw.replace('.','').trim()
      const month = monthMapDE[monthKey]
      if (!day || !month) return

      const year = parseInt(month) < curMonth - 1
        ? now.getFullYear() + 1
        : now.getFullYear()
      const date = `${year}-${month}-${String(day).padStart(2,'0')}`
      if (date < today()) return

      // Zeit aus Container-Text "HH:MM Uhr"
      const cText = container.text()
      const timeMatch = cText.match(/(\d{1,2}):(\d{2})\s*Uhr/)
      const time = timeMatch
        ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}`
        : '20:00'

      // Ticket-URL
      const ticketUrl = container.find('a[href*="eventim"], a[href*="tixforgigs"]').first().attr('href')
        || 'https://www.holzmarkt.com' + ($(el).attr('href') || '/kalender')

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time,
        locationId: 45,
        type: detectType(title),
        description: '',
        ticketUrl: ticketUrl || 'https://www.holzmarkt.com/kalender',
        spotifyUrl: '',
        source: 'holzmarkt'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Säälchen/Holzmarkt: ${e.message}`)
  }
  return events
}

async function scrapeMoritzbastei() {
  console.log('📡 Moritzbastei Leipzig (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://www.moritzbastei.de/programm-tickets-veranstaltungen', {
      waitUntil: 'networkidle2', timeout: 30000
    })

    // "Mehr laden" so oft klicken bis der Button weg ist
    let loadMore = true
    let clicks = 0
    while (loadMore && clicks < 10) {
      const btn = await page.$('button:not([disabled])')
        .then(async el => {
          if (!el) return null
          const text = await el.evaluate(e => e.textContent?.trim())
          return text?.includes('Mehr laden') || text?.includes('mehr laden') ? el : null
        })
        .catch(() => null)

      // Genauer: Button mit Text "Mehr laden"
      const moreBtn = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, a')]
        return btns.find(b => b.textContent?.trim().toLowerCase().includes('mehr laden'))
          ? true : false
      })

      if (!moreBtn) break

      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, a')]
        const btn = btns.find(b => b.textContent?.trim().toLowerCase().includes('mehr laden'))
        if (btn) btn.click()
      })
      await new Promise(r => setTimeout(r, 2000))
      clicks++
    }

    const html = await page.content()
    const $ = cheerio.load(html)
    const seen = new Set()

    // Event-Links: /event/KATEGORIE/YYYY-MM-DD/slug
    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const urlMatch = href.match(/\/event\/[^/]+\/(\d{4})-(\d{2})-(\d{2})\//)
      if (!urlMatch) return

      const date = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`
      if (date < today()) return

      const container = $(el).closest('article, li, div').filter((_, c) =>
        $(c).find('h3').length > 0
      ).first()

      const title = container.find('h3').first().text().trim()
      if (!title || title.length < 2) return

      const containerText = container.text()
      const timeMatch = containerText.match(/(\d{2}):(\d{2})\s+Uhr/)
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '20:00'

      const ticketUrl = container.find('a[href*="tixforgigs"], a[href*="eventim"]')
        .first().attr('href')
        || (href.startsWith('http') ? href : 'https://www.moritzbastei.de' + href)

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title, date, time,
        locationId: 18,
        type: detectType(title),
        description: '',
        ticketUrl,
        spotifyUrl: '',
        source: 'moritzbastei'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Moritzbastei: ${e.message}`)
  } finally {
    if (browser) await browser.close()
  }
  return events
}

async function scrapeWildAtHeart() {
  console.log('📡 Wild At Heart Berlin...')
  const events = []
  try {
    const res = await fetch('https://www.wildatheartberlin.de/concerts.php', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    const monthMap = {
      '01':'01','02':'02','03':'03','04':'04','05':'05','06':'06',
      '07':'07','08':'08','09':'09','10':'10','11':'11','12':'12'
    }

    $('table tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 2) return

      const dateText = $(cells[0]).text().trim()
      const contentText = $(cells[1]).text().trim()

      // Datum: "Sa 14.03." oder "Fr 20.03."
      const dateMatch = dateText.match(/(\d{2})\.(\d{2})\./)
      if (!dateMatch) return

      const day   = dateMatch[1]
      const month = dateMatch[2]
      // Jahr bestimmen
      const now = new Date()
      const curMonth = now.getMonth() + 1
      const year = parseInt(month) < curMonth - 1
        ? now.getFullYear() + 1
        : now.getFullYear()
      const date = `${year}-${month}-${day}`
      if (date < today()) return

      // Headliner: erster Bandname in Anführungszeichen
      const titleMatch = contentText.match(/"([^"]+)"/)
      if (!titleMatch) return
      const title = titleMatch[1].trim()
      if (!title || title.length < 2) return

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time: '21:00',
        locationId: 9,
        type: detectType(title),
        description: '',
        ticketUrl: 'https://www.wildatheartberlin.de/concerts.php',
        spotifyUrl: '',
        source: 'wildatheart'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Wild At Heart: ${e.message}`)
  }
  return events
}

async function scrapeColumbiaTheater() {
  console.log('📡 Columbia Theater Berlin...')
  const events = []
  try {
    const res = await fetch('https://columbia-theater.de/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const seen = new Set()

    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      // Datum aus URL: /event/20260319-peter-hook/
      const urlMatch = href.match(/\/event\/(\d{4})(\d{2})(\d{2})-/)
      if (!urlMatch) return
      const date = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`
      if (date < today()) return

      // Titel aus h2
      const title = $(el).find('h2').first().text().trim()
      if (!title || title.length < 2) return

      // Abgesagte/Verlegte Events filtern
      const fullText = $(el).text()
      if (/Abgesagt|Canceled|Verlegt|Relocated/i.test(fullText)) return

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        date,
        time: '20:00',
        locationId: 10, // Columbia Theater Berlin
        type: detectType(title),
        description: '',
        ticketUrl: href.startsWith('http') ? href : 'https://columbia-theater.de' + href,
        spotifyUrl: '',
        source: 'columbiatheater'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Columbia Theater: ${e.message}`)
  }
  return events
}

async function scrapePrachtwerk() {
  console.log('📡 Prachtwerk Berlin (Puppeteer)...')
  const events = []
  let browser
  try {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://www.prachtwerkberlin.com/live-music-events', {
      waitUntil: 'networkidle2', timeout: 45000
    })
    // SociableKit-Widget lädt Facebook-Events asynchron – länger warten
    await new Promise(r => setTimeout(r, 6000))

    const html = await page.content()
    const $ = cheerio.load(html)
    const seen = new Set()

    const monthMap = {
      'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
      'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12',
      'Mär':'03','Mrz':'03','Okt':'10','Dez':'12',
      // Deutsch
      'Januar':'01','Februar':'02','März':'03','April':'04','Mai':'05','Juni':'06',
      'Juli':'07','August':'08','September':'09','Oktober':'10','November':'11','Dezember':'12'
    }

    // SociableKit rendert Event-Karten mit Klassen wie .skit-post, .sc-event o.ä.
    // Fallback: alle Links + Elemente mit Datum-Text durchsuchen
    const candidates = $('a, article, div[class*="event"], div[class*="skit"], div[class*="post"]')
    candidates.each((_, el) => {
      const text = $(el).clone().children('script,style').remove().end().text().trim()
      if (!text || text.length < 5) return

      // Datum suchen: "19. März 2026", "19 Mar 2026", "19.03.2026"
      let date = null
      const m1 = text.match(/(\d{1,2})[.\s]+([A-Za-zäöü]+)[.,\s]+(\d{4})/)
      const m2 = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (m1) {
        const mon = monthMap[m1[2].substring(0,3)] || monthMap[m1[2]]
        if (mon) date = `${m1[3]}-${mon}-${String(m1[1]).padStart(2,'0')}`
      } else if (m2) {
        date = `${m2[3]}-${m2[2]}-${m2[1]}`
      }
      if (!date || date < today()) return

      const title = $(el).find('h2, h3, h4, strong').first().text().trim()
        || text.split('\n').map(l => l.trim()).filter(l =>
            l.length > 3 && !/^\d/.test(l) && !/^[A-Z][a-z]{2}\.?$/.test(l)
          )[0] || ''
      if (!title || title.length < 3) return

      const timeMatch = text.match(/(\d{1,2}):(\d{2})/)
      const time = timeMatch ? `${String(timeMatch[1]).padStart(2,'0')}:${timeMatch[2]}` : '20:00'

      const href = $(el).is('a') ? ($(el).attr('href') || '') : ($(el).find('a').first().attr('href') || '')

      const key = date + title
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title, date, time,
        locationId: 38,
        type: detectType(title),
        description: '',
        ticketUrl: href
          ? (href.startsWith('http') ? href : 'https://www.prachtwerkberlin.com' + href)
          : 'https://www.prachtwerkberlin.com/live-music-events',
        spotifyUrl: '',
        source: 'prachtwerk'
      })
    })

    console.log(`  ✓ ${events.length} Events`)
  } catch(e) {
    console.log(`  ✗ Prachtwerk: ${e.message}`)
  } finally {
    if (browser) await browser.close()
  }
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
    scrapeColumbiaTheater(),   // NEU
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
    scrapeHolzmarkt(),
    scrapeMoritzbastei(),
    scrapeWildAtHeart(),
    scrapePrachtwerk(),

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
  function stableId(str) {
  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

allEvents = allEvents.map(e => ({ id: stableId(e.date + '|' + e.title + '|' + e.locationId), ...e }))

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