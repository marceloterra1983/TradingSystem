import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          light: '#67e8f9',
          DEFAULT: '#06b6d4',
          dark: '#0e7490'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s linear infinite'
      },
      boxShadow: {
        subtle: '0 10px 30px -15px rgba(6, 182, 212, 0.3)'
      }
    }
  },
  plugins: [typography]
};
