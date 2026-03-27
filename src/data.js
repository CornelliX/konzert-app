export function loadData(key) {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { localStorage.removeItem(key); return null }
}

export function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getLocations() {
  const saved = loadData('locations')
  const defaults = [
    { id: 1, name: 'Lido', city: 'Berlin', website: 'lido-berlin.de', capacity: 400 },
    { id: 2, name: 'SO36', city: 'Berlin', website: 'so36.com', capacity: 600 },
    { id: 3, name: 'Festsaal Kreuzberg', city: 'Berlin', website: 'festsaal-kreuzberg.de', capacity: 1200 },
    { id: 4, name: 'Privatclub', city: 'Berlin', website: 'privatclub-berlin.de', capacity: 250 },
    { id: 5, name: 'Astra Kulturhaus', city: 'Berlin', website: 'astra-berlin.de', capacity: 1800 },
    { id: 6, name: 'Frannz Club', city: 'Berlin', website: 'frannz.eu', capacity: 350 },
    { id: 7, name: 'Monarch', city: 'Berlin', website: 'kottimonarch.de', capacity: 150 },
    { id: 9, name: 'Wild at Heart', city: 'Berlin', website: 'wildatheartberlin.de', capacity: 280 },
    { id: 10, name: 'Columbia Theater', city: 'Berlin', website: 'columbia-theater.de', capacity: 800 },
    { id: 11, name: 'Schokoladen', city: 'Berlin', website: 'schokoladen-mitte.de', capacity: 150 },
    { id: 12, name: 'Madame Claude', city: 'Berlin', website: 'madameclaude.de', capacity: 100 },
    { id: 13, name: 'Conne Island', city: 'Leipzig', website: 'conne-island.de', capacity: 600 },
    { id: 14, name: 'Werk 2', city: 'Leipzig', website: 'werk-2.de', capacity: 500 },
    { id: 15, name: 'Täubchenthal', city: 'Leipzig', website: 'taeubchenthal.com', capacity: 1200 },
    { id: 16, name: 'Felsenkeller', city: 'Leipzig', website: 'felsenkeller-leipzig.com', capacity: 2000 },
    { id: 17, name: 'UT Connewitz', city: 'Leipzig', website: 'utconnewitz.de', capacity: 350 },
    { id: 18, name: 'Moritzbastei', city: 'Leipzig', website: 'moritzbastei.de', capacity: 500 },
    { id: 19, name: 'Horns Erben', city: 'Leipzig', website: 'horns-erben.de', capacity: 150 },
    { id: 20, name: 'Ilses Erika', city: 'Leipzig', website: '', capacity: 200 },
    { id: 21, name: 'Urban Spree', city: 'Berlin', website: 'urbanspree.com', capacity: 250 },
    { id: 22, name: 'Gretchen', city: 'Berlin', website: 'gretchen-club.de', capacity: 500 },
    { id: 23, name: 'Supamolly', city: 'Berlin', website: 'supamolly.de', capacity: 150 },
    { id: 24, name: 'Kantine am Berghain', city: 'Berlin', website: 'berghain.berlin', capacity: 200 },
    { id: 25, name: 'Tempodrom', city: 'Berlin', website: 'tempodrom.de', capacity: 4200 },
    { id: 26, name: 'Heimathafen Neukölln', city: 'Berlin', website: 'heimathafen-neukoelln.de', capacity: 450 },
    { id: 27, name: 'Bi Nuu', city: 'Berlin', website: 'binuu.de', capacity: 400 },
    { id: 28, name: 'Mikropol', city: 'Berlin', website: 'mikropol-berlin.de', capacity: 300 },
    { id: 29, name: 'Kesselhaus', city: 'Berlin', website: 'kesselhaus.net', capacity: 745 },
    { id: 30, name: 'Metropol', city: 'Berlin', website: 'metropol-berlin.de', capacity: 1200 },
    { id: 31, name: "Huxleys Neue Welt", city: 'Berlin', website: 'huxleysneuewelt.de', capacity: 1600 },
    { id: 32, name: 'Columbiahalle', city: 'Berlin', website: 'columbiahalle.berlin', capacity: 3500 },
    { id: 33, name: 'Uber Eats Music Hall', city: 'Berlin', website: 'uber-eats-music-hall.de', capacity: 8500 },
    { id: 34, name: 'Hole44', city: 'Berlin', website: 'hole-berlin.de', capacity: 400 },
    { id: 35, name: 'Badehaus', city: 'Berlin', website: 'badehaus-berlin.com', capacity: 250 },
    { id: 36, name: 'Cassiopeia', city: 'Berlin', website: 'cassiopeia-berlin.de', capacity: 270 },
    { id: 37, name: 'Quasimodo', city: 'Berlin', website: 'quasimodo.club', capacity: 350 },
    { id: 38, name: 'Prachtwerk', city: 'Berlin', website: 'prachtwerkberlin.com', capacity: 240 },
    { id: 39, name: 'LARK', city: 'Berlin', website: 'larkberlin.com', capacity: 200 },
    { id: 40, name: 'Slaughterhouse', city: 'Berlin', website: 'slaughterhouse-berlin.de', capacity: 300 },
    { id: 41, name: 'Kulturhaus Peter Edel', city: 'Berlin', website: 'peteredel.de', capacity: 400 },
    { id: 42, name: 'Theater im Delphi', city: 'Berlin', website: 'theater-im-delphi.de', capacity: 700 },
    { id: 43, name: 'ZigZag Jazzclub', city: 'Berlin', website: 'zigzag-jazzclub.berlin', capacity: 120 },
    { id: 44, name: 'Neue Zukunft', city: 'Berlin', website: 'neue-zukunft.org', capacity: 150 },
    { id: 45, name: 'Säälchen', city: 'Berlin', website: 'https://www.holzmarkt.com/kalender' },
    { id: 46, name: 'Theater des Westens', city: 'Berlin', website: 'musicals.de', capacity: 1780 },
    { id: 47, name: 'Zitadelle Spandau', city: 'Berlin', website: 'citadel-music-festival.de', capacity: 15000 },
    { id: 48, name: 'MVB Leipzig', city: 'Leipzig', website: 'mvb-leipzig.de', capacity: 300 },
  ]
  // Gespeicherte Locations mit Defaults zusammenführen, damit neue Einträge immer erscheinen
  if (saved) {
    const savedIds = new Set(saved.map(l => l.id))
    const merged = [...saved, ...defaults.filter(d => !savedIds.has(d.id))]
    saveData('locations', merged)
    return merged
  }
  saveData('locations', defaults)
  return defaults
}

import { loadManualEvents } from './supabase.js'

export async function getEvents() {
  try {
    const res = await fetch('./events.json')
    const scraped = res.ok ? await res.json() : []
    const manual = await loadManualEvents()
    return [...scraped, ...manual]
  } catch(e) {
    console.log('Fehler beim Laden:', e)
    return []
  }
}