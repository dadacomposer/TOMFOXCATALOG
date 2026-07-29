import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/.upload_state.json', '**/.db_sync_state.json', '**/sync_formats.cjs', '**/upload_to_r2.py']
    }
  }
})
