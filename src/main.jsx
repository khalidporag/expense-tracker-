import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/figtree'
import '@fontsource-variable/bricolage-grotesque'
import App from './App.jsx'
import './styles/index.css'
import { applyTheme, getThemePref, watchSystemTheme } from './lib/theme.js'

applyTheme(getThemePref())
watchSystemTheme()

createRoot(document.getElementById('root')).render(<App />)
