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
        brand: {
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
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'ease-drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
    },
    keyframes: {
      'sheet-up': {
        '0%': { transform: 'translateY(100%)' },
        '100%': { transform: 'translateY(0)' },
      },
      'fade-in': {
        '0%': { opacity: '0', transform: 'translateY(6px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },
      'scale-in': {
        '0%': { opacity: '0', transform: 'scale(0.95)' },
        '100%': { opacity: '1', transform: 'scale(1)' },
      },
    },
    animation: {
      'sheet-up': 'sheet-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
      'fade-in': 'fade-in 200ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
      'scale-in': 'scale-in 200ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
    },
  },
  plugins: [],
}
