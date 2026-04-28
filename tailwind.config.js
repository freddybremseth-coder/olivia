/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream-white': '#F9F8F6',
        'label-cotton': '#F8F5EA',
        'olive-black': '#1A1C19',
        'matte-black': '#0D0D0D',
        'bottle-black': '#111111',
        'champagne-gold': '#E6D5B8',
        'brushed-gold': '#D4AF37',
        'brass': '#B5A642',
        'platinum': '#E5E4E2',
        'silver': '#C0C0C0',
        'copper': '#B87333',
        'bronze': '#CD7F32',
        'terracotta': '#C05A46',
        'deep-terracotta': '#A24836',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Didot', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Montserrat', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
