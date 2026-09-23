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
        'label-cotton': '#F8F5EA',
        'olive-black': '#1A1C19',
        'matte-black': '#0D0D0D',
        'bottle-black': '#111111',
        'champagne-gold': '#E6D5B8',
        'brushed-gold': '#D4AF37',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Didot', 'Georgia', 'serif'],
        sans: ['Montserrat', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
