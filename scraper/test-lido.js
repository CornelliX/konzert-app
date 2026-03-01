const res = await fetch('https://www.l-iz.de/veranstaltungen/', {
  headers: { 'User-Agent': 'Mozilla/5.0 (konzert-app)' }
})
const html = await res.text()
const start = html.indexOf('2026')
console.log(html.substring(start - 200, start + 1500))