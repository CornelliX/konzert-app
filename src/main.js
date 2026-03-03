import { renderApp } from './app.js'
const app = document.getElementById('app')
renderApp(app)
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/konzert-app/sw.js')
}