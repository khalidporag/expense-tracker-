import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/expense-tracker-/
const base = '/expense-tracker-/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Fonts are bundled (no CDN). Precache only the Latin subsets the app needs, so it looks the same offline.
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}', '**/*-latin-wght-normal-*.woff2'] },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        id: base,
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Personal expense tracker: budgets, forecasts and insights. Works offline; your data stays on your phone.',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#14161a', // matches the in-app welcome splash
        theme_color: '#f4f4f1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // full-bleed artwork with the mark inside the safe zone, so the same file works as a maskable icon
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
