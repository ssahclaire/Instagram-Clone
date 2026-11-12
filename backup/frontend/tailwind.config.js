/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ig: {
          blue: '#0095F6',
          blueHover: '#1877F2',
          red: '#FF3040',
          border: '#DBDBDB',
          bg: '#FAFAFA',
          secondary: '#737373',
        }
      },
      keyframes: {
        heartPop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '25%': { transform: 'scale(1.25)', opacity: '1' },
          '50%': { transform: 'scale(0.95)', opacity: '1' },
          '80%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        }
      },
      animation: {
        heartPop: 'heartPop 0.9s ease-out forwards',
      }
    },
  },
  plugins: [],
}
