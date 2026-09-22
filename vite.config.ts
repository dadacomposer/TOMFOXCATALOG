import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const siteOrigin = (process.env.VITE_SITE_URL || 'https://tomfoxcatalog.com').replace(/\/$/, '')
const isIndexableBuild = process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'seo-build-context',
      transformIndexHtml(html) {
        return html
          .replaceAll('%SITE_ORIGIN%', siteOrigin)
          .replaceAll('%SEO_ROBOTS%', isIndexableBuild ? 'index, follow' : 'noindex, nofollow, noarchive')
      },
    },
  ],
  server: {
    watch: {
      ignored: ['**/.upload_state.json', '**/.db_sync_state.json', '**/sync_formats.cjs', '**/upload_to_r2.py']
    }
  }
})
