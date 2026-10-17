import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyDocumentLanguage, getAdminLanguage } from './services/languageStorage'

// Language, direction and the tab title, before the first render (the login page included).
applyDocumentLanguage(getAdminLanguage())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
