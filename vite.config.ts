import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Когда собираем для GitHub Pages, сайт публикуется в подпапке
// /my-somelier/, а не в корне домена — поэтому base и все абсолютные
// пути манифеста нужно на неё поменять только для этой сборки.
const isGhPages = process.env.GH_PAGES === 'true'
const base = isGhPages ? '/my-somelier/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Мой сомелье',
        short_name: 'Сомелье',
        description:
          'Рецепты коктейлей и напитков с голосом бариста, друзья и вечеринки.',
        theme_color: '#1a0f2e',
        background_color: '#1a0f2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        lang: 'ru',
        categories: ['food', 'lifestyle', 'social'],
        icons: [
          { src: `${base}icons/icon-72.png`, sizes: '72x72', type: 'image/png' },
          { src: `${base}icons/icon-96.png`, sizes: '96x96', type: 'image/png' },
          { src: `${base}icons/icon-128.png`, sizes: '128x128', type: 'image/png' },
          { src: `${base}icons/icon-144.png`, sizes: '144x144', type: 'image/png' },
          { src: `${base}icons/icon-152.png`, sizes: '152x152', type: 'image/png' },
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-256.png`, sizes: '256x256', type: 'image/png' },
          { src: `${base}icons/icon-384.png`, sizes: '384x384', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${base}icons/maskable-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: `${base}icons/maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallbackDenylist: [/^\/auth\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
