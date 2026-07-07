/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        bluespace: {
          50: '#eef2ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#1a365d',
          600: '#152c4f',
          700: '#0f2240',
          800: '#0a1832',
          900: '#050e23',
          950: '#020713',
        },
        deep: {
          DEFAULT: '#0f172a',
          50: '#f1f5f9',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#1e293b',
          600: '#0f172a',
          700: '#0b1120',
          800: '#070b16',
          900: '#03050b',
        },
      },
    },
    keyframes: {
      'sheet-up': {
        '0%': { transform: 'translateY(100%)' },
        '100%': { transform: 'translateY(0)' },
      },
    },
    animation: {
      'sheet-up': 'sheet-up 0.25s ease-out',
    },
  },
  plugins: [],
}
