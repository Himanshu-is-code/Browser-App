/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      aspectRatio: {
        '20/9': '20 / 9',
        '9/20': '9 / 20',
      },
      borderRadius: {
        'squircle-sm': '20px',
        'squircle-md': '28px',
        'squircle-lg': '32px',
        'squircle-xl': '36px',
      },
      colors: {
        coloros: {
          dark: '#060913',
          acrylic: 'rgba(10, 15, 29, 0.52)',
          'acrylic-card': 'rgba(15, 23, 42, 0.55)',
          'acrylic-pill': 'rgba(255, 255, 255, 0.12)',
          'acrylic-hover': 'rgba(255, 255, 255, 0.18)',
          'rim-top': 'rgba(255, 255, 255, 0.40)',
          'rim-x': 'rgba(255, 255, 255, 0.15)',
          'rim-bottom': 'rgba(0, 0, 0, 0.20)',
          cyan: '#00E5FF',
          teal: '#00F5A0',
          blue: '#38BDF8',
          violet: '#818CF8',
        }
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
        'acrylic': '50px',
      },
      boxShadow: {
        'coloros-pill': '0 12px 36px -8px rgba(0, 0, 0, 0.65), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.25)',
        'coloros-card': '0 16px 40px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3)',
        'coloros-button': '0 8px 24px -4px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.45)',
        'coloros-glow': '0 0 30px -4px rgba(0, 229, 255, 0.4), inset 0 1px 2px 0 rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'living-flow': 'flowPulse 7s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        flowPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.12)', opacity: '0.85' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
