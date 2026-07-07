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
          DEFAULT: '#0000ff',
          50: '#eef2ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0000ff',
          700: '#0000cc',
          800: '#000099',
          900: '#000066',
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
