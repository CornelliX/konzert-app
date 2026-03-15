import { renderApp } from './app.js'
import { deleteOldManualEvents } from './supabase.js'
import { supabase } from './supabase.js'

const app = document.getElementById('app')

async function init() {
  // Magic Link Token aus URL lesen (PWA Fix)
  const hash = window.location.hash
  if (hash.includes('access_token')) {
    await supabase.auth.exchangeCodeForSession(window.location.href)
    window.history.replaceState(null, '', window.location.pathname)
  }

  await deleteOldManualEvents()
  renderApp(app)
}

init()

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/konzert-app/sw.js')
}