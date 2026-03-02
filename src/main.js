import { renderApp } from './app.js'

const app = document.getElementById('app')
renderApp(app)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/konzert-app/sw.js')
}