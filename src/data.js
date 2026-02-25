// Daten laden und speichern (im Browser-Speicher)
export function loadData(key) {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : null
}

export function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Beispiel-Locations voreingestellt
export function getLocations() {
  const saved = loadData('locations')
  if (saved) return saved
  const defaults = [
    { id: 1, name: 'Lido', city: 'Berlin', website: 'lido-berlin.de', capacity: 400 },
    { id: 2, name: 'SO36', city: 'Berlin', website: 'so36.com', capacity: 600 },
    { id: 3, name: 'Festsaal Kreuzberg', city: 'Berlin', website: 'festsaal-kreuzberg.de', capacity: 1200 },
    { id: 4, name: 'Privatclub', city: 'Berlin', website: 'privatclub-berlin.de', capacity: 250 },
    { id: 5, name: 'Astra Kulturhaus', city: 'Berlin', website: 'astra-berlin.de', capacity: 1800 },
    { id: 6, name: 'Frannz Club', city: 'Berlin', website: 'frannz.eu', capacity: 350 },
    { id: 7, name: 'Monarch', city: 'Berlin', website: 'kottimonarch.de', capacity: 150 },
    { id: 8, name: 'Musik & Frieden', city: 'Berlin', website: 'musikundfrieden.de', capacity: 700 },
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
  ]
  saveData('locations', defaults)
  return defaults
}

export function getEvents() {
  const saved = loadData('events')
  if (saved) return saved
  // Paar Beispiel-Events zum Starten
  const defaults = [
    {
      id: 1,
      title: 'Beispielband – Releaseshow',
      type: 'konzert',
      date: '2026-03-15',
      time: '20:00',
      locationId: 1,
      description: 'Ein Beispiel-Konzert zum Testen.',
      ticketUrl: '',
      spotifyUrl: '',
      isNew: true,
      savedAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Friday Night Party',
      type: 'party',
      date: '2026-03-22',
      time: '23:00',
      locationId: 3,
      description: 'Eine Beispiel-Party zum Testen.',
      ticketUrl: '',
      spotifyUrl: '',
      isNew: true,
      savedAt: new Date().toISOString()
    }
  ]
  saveData('events', defaults)
  return defaults
}