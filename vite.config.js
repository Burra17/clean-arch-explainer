import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠️ ÄNDRA detta till ditt repo-namn!
  // Om ditt repo heter "clean-arch-explainer" på GitHub:
  base: '/clean-arch-explainer/',
})
