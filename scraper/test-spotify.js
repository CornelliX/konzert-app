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

async function getSpotifyToken() {
  const creds = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  })
  const data = await res.json()
  return data.access_token
}

const token = await getSpotifyToken()
console.log('Token:', token ? 'OK' : 'FEHLT')

const res = await fetch('https://api.spotify.com/v1/search?q=artist:Radiohead&type=artist&limit=1', {
  headers: { 'Authorization': 'Bearer ' + token }
})
const data = await res.json()
console.log(JSON.stringify(data?.artists?.items?.[0], null, 2))