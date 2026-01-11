/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        quatrelati: {
          gold: {
            50: '#FDF9E8',
            100: '#FCF3C7',
            200: '#F9E68A',
            300: '#F5D54E',
            400: '#E8C026',
            500: '#D4A017',
            600: '#B8860B',
            700: '#8B6914',
            800: '#654E0F',
            900: '#3D2F09',
          },
          blue: {
            50: '#E8F1FC',
            100: '#C5D9F7',
            200: '#9FC0F1',
            300: '#6FA0E8',
            400: '#4A86DE',
            500: '#2A6CC8',
            600: '#124EA6',
            700: '#0E3D82',
            800: '#0A2D5F',
            900: '#061D3D',
            950: '#030F20',
          },
          green: {
            400: '#4ADE80',
            500: '#22C55E',
            600: '#16A34A',
            700: '#15803D',
            800: '#166534',
            900: '#14532D',
          },
        },
        cream: {
          50: '#FFFEF7',
          100: '#FDF6E3',
          200: '#F5EBCD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 1.5s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'bounce-once': 'bounce-once 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(2deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bounce-once': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      backdropBlur: {
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
