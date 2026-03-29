import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { trackLoadTime } from './services/analytics'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {})
  })
}

window.addEventListener('load', () => {
  setTimeout(trackLoadTime, 0)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
