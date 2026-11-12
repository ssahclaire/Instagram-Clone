/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
  theme: {
    extend: {
      colors: {
        ig: {
          blue: '#0095F6',
          blueHover: '#1877F2',
          link: '#00376B',
          red: '#FF3040',
          border: '#DBDBDB',
          bg: '#FAFAFA',
          secondary: '#737373',
          hover: '#F2F2F2',
        },
      },
      fontFamily: {
        logo: ['"Grand Hotel"', 'cursive'],
      },
      keyframes: {
        heartPop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '15%': { transform: 'scale(1.2)', opacity: '1' },
          '30%': { transform: 'scale(0.95)', opacity: '1' },
          '45%,80%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.6)', opacity: '0' },
        },
        likeBounce: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.25)' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translate(-50%, 16px)', opacity: '0' }, to: { transform: 'translate(-50%, 0)', opacity: '1' } },
      },
      animation: {
        heartPop: 'heartPop 1s ease-out forwards',
        likeBounce: 'likeBounce 0.3s ease-in-out',
        fadeIn: 'fadeIn 0.15s ease-out',
        slideUp: 'slideUp 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
