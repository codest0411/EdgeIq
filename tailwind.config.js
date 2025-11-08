/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        light: {
          bg: '#F8FAFC',           // Soft White-Blue
          primary: '#6366F1',      // Indigo - Professional & Modern
          secondary: '#EC4899',    // Pink - Vibrant & Energetic
          text: '#0F172A',         // Deep Navy Text
          card: '#FFFFFF'          // Pure White Cards
        },
        dark: {
          bg: '#0F172A',           // Deep Navy Background
          primary: '#818CF8',      // Light Indigo - Easy on eyes
          secondary: '#F472B6',    // Light Pink - Pops on dark
          text: '#F1F5F9',         // Light Gray Text
          card: '#1E293B'          // Slate Cards
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
