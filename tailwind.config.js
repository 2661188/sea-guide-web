/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        abyss: '#06283D', // deep Gulf water — header, hero, nav
        lagoon: '#0E7C86', // primary
        shallows: '#7FD4D0', // light accent on dark
        salt: '#F3F6F7', // app background (cool, readable in sun)
        ink: '#0B1B24', // text
        buoy: '#FF6B35', // signal orange — low tide, attention, "now"
        good: '#0E9F6E',
        caution: '#D99A0B',
        bad: '#D64545',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', '"Noto Sans Arabic"', 'sans-serif'],
      },
      keyframes: {
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2.5px)' } },
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { bob: 'bob 3.2s ease-in-out infinite', rise: 'rise .35s ease-out both' },
    },
  },
  plugins: [],
};
