import { renderApp } from './app.js'
import { deleteOldManualEvents } from './supabase.js'

const app = document.getElementById('app')
renderApp(app)
deleteOldManualEvents()

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/konzert-app/sw.js')
}