const fs = require('fs')
const path = 'scraper/scrape.js'
let c = fs.readFileSync(path, 'utf8')
const oldStr = "? 'party' : 'konzert'"
const newStr = "? 'party' : lower.includes('lesung') || lower.includes('comedy') || lower.includes('theater') || lower.includes('quiz') || lower.includes('kino') || lower.includes('vortrag') ? 'sonstige' : 'konzert'"
let count = 0
while (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr)
  count++
}
fs.writeFileSync(path, c)
console.log(count + ' Stellen ersetzt')