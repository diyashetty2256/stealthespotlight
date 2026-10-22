/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oxblood: '#651F32',
        'dark-plum': '#321D2B',
        parchment: '#F4E8D3',
        'antique-gold': '#C6A15B',
        'muted-rose': '#C98686',
        'charcoal-ink': '#292126',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      backgroundImage: {
        'stage': 'radial-gradient(circle at top, rgba(198,161,91,0.1) 0%, rgba(50,29,43,1) 100%)',
        'curtain': 'linear-gradient(to bottom, rgba(101,31,50,0.9) 0%, rgba(50,29,43,0.95) 100%)',
      },
      animation: {
        'spotlight': 'spotlight 2s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'confetti': 'confetti 3s ease-out forwards',
      },
      keyframes: {
        spotlight: {
          '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.05)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(198,161,91,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(198,161,91,0.6)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
