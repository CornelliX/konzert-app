import { renderApp } from './app.js'
import { deleteOldManualEvents } from './supabase.js'

const app = document.getElementById('app')

deleteOldManualEvents().then(() => {
  renderApp(app)
})

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/konzert-app/sw.js')
}