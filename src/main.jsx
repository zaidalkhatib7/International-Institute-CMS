import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getAdminLanguage } from './services/languageStorage'

const initialLanguage = getAdminLanguage()
document.documentElement.lang = initialLanguage
document.documentElement.dir = initialLanguage === 'ar' ? 'rtl' : 'ltr'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
