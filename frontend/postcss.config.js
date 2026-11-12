import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the Tailwind config next to this file so it works no matter which directory Vite is launched from.
const dir = path.dirname(fileURLToPath(import.meta.url))

export default {
  plugins: {
    tailwindcss: { config: path.join(dir, 'tailwind.config.js') },
    autoprefixer: {},
  },
}
